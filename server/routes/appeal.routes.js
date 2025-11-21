const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const {
  getServerConfig,
  requiresMembership,
  membershipAppealsEnabled,
} = require('../services/server.service');
const { sendAppealNotification } = require('../services/email.service');
const { isOrbiMember } = require('../services/orbi.service');

const router = express.Router();
const prisma = new PrismaClient();

const normalizeEmail = (value = '') => value.trim().toLowerCase();

async function ensureEmailVerified(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const verification = await prisma.emailVerification.findFirst({
    where: {
      email: normalized,
      verified: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (verification) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { email: normalized },
  });
  return Boolean(user && user.verified);
}

router.post('/', async (req, res) => {
  try {
    const { email, minecraftName, realName, note, serverId } = req.body;
    const normalizedEmail = normalizeEmail(email || '');
    const trimmedEmail = (email || '').trim();

    if (!normalizedEmail || !minecraftName || !serverId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const server = await getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const isVerified = await ensureEmailVerified(normalizedEmail);
    if (!isVerified) {
      return res.status(400).json({ error: 'Email not verified' });
    }

    const requiredDomain = server.requiredEmailDomain || server.required_email_domain;
    const requiresStudentEmail = server.accessLevel === 'student';
    const requiresOrbiMembership = requiresMembership(server);

    const hasStudentEmail =
      requiresStudentEmail && requiredDomain
        ? normalizedEmail.endsWith(requiredDomain.toLowerCase())
        : requiresStudentEmail
          ? true
          : false;

    let hasOrbiMembership = true;
    if (requiresOrbiMembership) {
      try {
        const orbiResult = isOrbiMember(normalizedEmail);
        hasOrbiMembership = orbiResult.member;
      } catch (err) {
        console.error('Membership validation failed', err);
        return res.status(err.code === 'ENOENT' ? 503 : 500).json({
          error:
            err.code === 'ENOENT'
              ? 'Membership list missing on server'
              : 'Unable to verify membership right now',
        });
      }
    }

    const emailQualifies =
      (!requiresStudentEmail || hasStudentEmail) &&
      (!requiresOrbiMembership || hasOrbiMembership);

    const policy =
      server.accessLevel === 'appeal_only'
        ? 'always'
        : server.appealPolicy || server.appeal_policy || 'never';
    const appealsEnabled =
      policy === 'always' ||
      (requiresOrbiMembership && !hasOrbiMembership && membershipAppealsEnabled(server)) ||
      (policy === 'non_student' && requiresStudentEmail && !hasStudentEmail);

    if (!emailQualifies && !appealsEnabled) {
      return res.status(403).json({
        error: requiresOrbiMembership
          ? 'This server requires an active FUTF membership email. Appeals are disabled for non-members.'
          : 'This server requires a student email. Appeals are disabled for non-student addresses.',
      });
    }

    const autoApproved = policy !== 'always' && emailQualifies;

    const appeal = await prisma.appeal.create({
      data: {
        serverId,
        userEmail: trimmedEmail,
        minecraftName,
        realName,
        studentEmail: hasStudentEmail || hasOrbiMembership ? trimmedEmail : null,
        reason: note,
        status: autoApproved ? 'approved' : 'pending',
      },
    });

    if (!autoApproved) {
      const admins = await prisma.admin.findMany({
        select: { email: true },
      });
      const emails = admins.map((admin) => admin.email).filter(Boolean);
      await sendAppealNotification(emails, {
        serverName: server.name,
        userEmail: trimmedEmail,
        minecraftName,
        realName,
        reason: note,
      });
    }

    res.json({
      message: autoApproved
        ? 'You now have access to this server!'
        : 'Request submitted for review.',
      appeal,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit appeal' });
  }
});

router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const appeals = await prisma.appeal.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
    });

    const payload = [];
    for (const appeal of appeals) {
      const server = await getServerConfig(appeal.serverId);
      payload.push({
        ...appeal,
        server: server
          ? { id: server.id, name: server.name, description: server.description, ip: server.ip }
          : null,
      });
    }

    res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load appeals' });
  }
});

router.post('/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const appeal = await prisma.appeal.update({
      where: { id: req.params.id },
      data: {
        status: 'approved',
        reviewedBy: req.adminId,
        reviewedAt: new Date(),
      },
    });
    res.json({ message: 'Appeal approved', appeal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to approve appeal' });
  }
});

router.post('/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const appeal = await prisma.appeal.update({
      where: { id: req.params.id },
      data: {
        status: 'rejected',
        reviewedBy: req.adminId,
        reviewedAt: new Date(),
      },
    });
    res.json({ message: 'Appeal rejected', appeal });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reject appeal' });
  }
});

module.exports = router;
