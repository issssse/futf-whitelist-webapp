const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateToken, sendVerificationEmail } = require('../services/email.service');

const router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        serverAccess: true,
        accessRequests: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
router.put('/profile/:userId', async (req, res) => {
  try {
    const { realName, minecraftName } = req.body;
    const updates = {};

    if (realName !== undefined) updates.realName = realName;
    if (minecraftName !== undefined) updates.minecraftName = minecraftName;

    const user = await prisma.user.update({
      where: { id: req.params.userId },
      data: updates,
    });

    res.json(user);
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Minecraft name already taken' });
    }
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login with email (sends verification code)
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const token = generateToken();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Update verification token
      user = await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken: token },
      });
    } else {
      // Create new user
      const isStudent = email.endsWith('@student.uu.se');
      user = await prisma.user.create({
        data: {
          email,
          minecraftName: '', // Will be set later
          isStudent,
          verificationToken: token,
        },
      });
    }

    await sendVerificationEmail(email, token);

    res.json({
      message: 'Verification email sent',
      userId: user.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's server access
router.get('/my-servers/:userId', async (req, res) => {
  try {
    const access = await prisma.serverAccess.findMany({
      where: { userId: req.params.userId },
    });

    res.json(access);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
