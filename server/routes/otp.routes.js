const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { sendOtpEmail } = require('../services/email.service');

const router = express.Router();
const prisma = new PrismaClient();

const OTP_EXPIRY_MS = 10 * 60 * 1000;

const normalizeEmail = (value = '') => value.trim().toLowerCase();

router.post('/send', async (req, res) => {
  try {
    const rawEmail = req.body.email || '';
    const displayEmail = rawEmail.trim();
    const normalizedEmail = normalizeEmail(rawEmail);

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await prisma.emailVerification.deleteMany({
      where: {
        email: normalizedEmail,
        verified: false,
      },
    });

    const code = String(Math.floor(100000 + Math.random() * 900000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

    await prisma.emailVerification.create({
      data: {
        email: normalizedEmail,
        code,
        expiresAt,
      },
    });

    const previewCode = await sendOtpEmail(displayEmail || normalizedEmail, code);

    res.json({
      message: 'Verification code sent',
      previewCode: previewCode || undefined,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send verification code' });
  }
});

router.post('/verify', async (req, res) => {
  try {
    const rawEmail = req.body.email || '';
    const normalizedEmail = normalizeEmail(rawEmail);
    const code = (req.body.code || '').trim();

    if (!normalizedEmail || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const record = await prisma.emailVerification.findFirst({
      where: {
        email: normalizedEmail,
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

    await prisma.emailVerification.deleteMany({
      where: {
        email: normalizedEmail,
        verified: false,
        id: { not: record.id },
      },
    });

    res.json({ message: 'Email verified' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

module.exports = router;
