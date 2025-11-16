const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendOtpEmail } = require('../services/email.service');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/send', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const code = ('' + Math.floor(100000 + Math.random() * 900000)).substring(0, 6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.create({
      data: {
        email,
        code,
        expiresAt,
      },
    });

    await sendOtpEmail(email, code);

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const record = await prisma.emailVerification.findFirst({
      where: {
        email,
        code,
        verified: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    if (new Date(record.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Verification code expired' });
    }

    await prisma.emailVerification.update({
      where: { id: record.id },
      data: { verified: true },
    });

    res.json({ message: 'Email verified' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

module.exports = router;
