const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateToken, sendVerificationEmail } = require('../services/email.service');
const {
  getServerConfig,
  requiresMembership,
  membershipAppealsEnabled,
} = require('../services/server.service');
const { isOrbiMember } = require('../services/orbi.service');

const router = express.Router();
const prisma = new PrismaClient();

// Register/Login - Create or get user
router.post('/register', async (req, res) => {
  try {
    const { email, minecraftName, realName, serverId } = req.body;

    if (!email || !minecraftName || !serverId) {
      return res.status(400).json({ error: 'Email, Minecraft name, and server ID are required' });
    }

    const server = await getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const requiredDomain = server.requiredEmailDomain || server.required_email_domain;
    const requiresStudentEmail = server.accessLevel === 'student';
    const hasStudentEmail =
      requiresStudentEmail && requiredDomain
        ? email.toLowerCase().trim().endsWith(requiredDomain.toLowerCase())
        : requiresStudentEmail
          ? true
          : false;

    const requiresOrbiMembership = requiresMembership(server);
    let hasOrbiMembership = true;
    if (requiresOrbiMembership) {
      try {
        const orbiResult = isOrbiMember(email);
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

    const isStudent = hasStudentEmail || hasOrbiMembership || false;

    const policy =
      server.accessLevel === 'appeal_only'
        ? 'always'
        : server.appealPolicy || server.appeal_policy || 'never';

    const appealsEnabled =
      policy === 'always' ||
      (requiresOrbiMembership && !hasOrbiMembership && membershipAppealsEnabled(server)) ||
      (requiresStudentEmail && !hasStudentEmail && policy === 'non_student');

    const emailQualifies =
      (!requiresOrbiMembership || hasOrbiMembership) &&
      (!requiresStudentEmail || hasStudentEmail);

    if (!emailQualifies && !appealsEnabled) {
      return res.status(400).json({
        error: requiresOrbiMembership
          ? 'This server requires a verified FUTF membership email.'
          : requiredDomain
            ? `This server requires an email ending with ${requiredDomain}`
            : 'This server requires a verified email for access.',
      });
    }

    const token = generateToken();

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          minecraftName,
          realName: realName || user.realName,
          isStudent: isStudent || user.isStudent,
          verificationToken: token,
          verified: false,
        },
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          email,
          minecraftName,
          realName,
          isStudent,
          verificationToken: token,
        },
      });
    }

    await sendVerificationEmail(email, token);

    res.json({
      message: 'Verification email sent',
      userId: user.id,
      requiresRules: server.rules && server.rules.length > 0
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Minecraft name already registered by another user' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        verificationToken: null,
      },
    });

    res.json({
      message: 'Email verified successfully',
      userId: user.id,
      minecraftName: user.minecraftName,
      email: user.email
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
