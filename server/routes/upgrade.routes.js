const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { generateToken, sendVerificationEmail } = require('../services/email.service');

const router = express.Router();
const prisma = new PrismaClient();

// Create access request for higher privileges
router.post('/request', async (req, res) => {
  try {
    const { userId, requestedLevel, email, realName, note } = req.body;

    if (!userId || !requestedLevel || !email || !realName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const token = generateToken();

    const request = await prisma.accessRequest.create({
      data: {
        userId,
        requestedLevel,
        email,
        realName,
        note,
        verificationToken: token,
      },
    });

    await sendVerificationEmail(email, token);

    res.json({
      message: 'Verification email sent',
      requestId: request.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify access request email
router.get('/verify', async (req, res) => {
  try {
    const { token } = req.query;

    const request = await prisma.accessRequest.findFirst({
      where: { verificationToken: token },
    });

    if (!request) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }

    await prisma.accessRequest.update({
      where: { id: request.id },
      data: {
        verified: true,
        verificationToken: null,
      },
    });

    res.json({
      message: 'Email verified. Your request is pending admin approval.',
      requestId: request.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
