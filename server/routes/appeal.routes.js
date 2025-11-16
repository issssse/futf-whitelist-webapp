const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { getServerConfig } = require('../services/server.service');
const { sendAppealNotification } = require('../services/email.service');

const router = express.Router();
const prisma = new PrismaClient();

async function ensureEmailVerified(email) {
  const verification = await prisma.emailVerification.findFirst({
    where: {
      email,
      verified: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!verification) {
    return false;
  }
  return new Date(verification.expiresAt) > new Date();
}

router.post('/', async (req, res) => {
  try {
    const { email, minecraftName, realName, note, serverId } = req.body;
    if (!email || !minecraftName || !serverId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const server = getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const isVerified = await ensureEmailVerified(email);
    if (!isVerified) {
      return res.status(400).json({ error: 'Email not verified' });
    }

    const requiredDomain = server.requiredEmailDomain;
    const isStudentEmail =
      requiredDomain && email.toLowerCase().endsWith(requiredDomain.toLowerCase());

    const autoApproved = server.accessLevel !== 'student' || isStudentEmail;

    const appeal = await prisma.appeal.create({
      data: {
        serverId,
        userEmail: email,
        minecraftName,
        realName,
        studentEmail: isStudentEmail ? email : null,
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
        userEmail: email,
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

    const payload = appeals.map((appeal) => {
      const server = getServerConfig(appeal.serverId);
      return {
        ...appeal,
        server: server
          ? { id: server.id, name: server.name, description: server.description, ip: server.ip }
          : null,
      };
    });

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
