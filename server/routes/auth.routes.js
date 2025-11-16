const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateToken, sendVerificationEmail } = require('../services/email.service');
const { getServerConfig } = require('../services/server.service');

const router = express.Router();
const prisma = new PrismaClient();

// Register/Login - Create or get user
router.post('/register', async (req, res) => {
  try {
    const { email, minecraftName, realName, serverId } = req.body;

    if (!email || !minecraftName || !serverId) {
      return res.status(400).json({ error: 'Email, Minecraft name, and server ID are required' });
    }

    const server = getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if server requires student email
    const isStudent = server.accessLevel === 'student' && email.endsWith(server.requiredEmailDomain);

    if (server.accessLevel === 'student' && !isStudent) {
      return res.status(400).json({
        error: `This server requires a ${server.requiredEmailDomain} email address`
      });
    }

    // Check if server is public (no special requirements)
    if (server.accessLevel === 'public') {
      // Public servers still need verification, just no special domain requirements
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
      minecraftName: user.minecraftName
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
