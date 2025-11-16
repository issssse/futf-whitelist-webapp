const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateAdmin } = require('../middleware/auth.middleware');

const router = express.Router();
const prisma = new PrismaClient();

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin || !await bcrypt.compare(password, admin.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { adminId: admin.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, username: admin.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending access requests
router.get('/access-requests', authenticateAdmin, async (req, res) => {
  try {
    const requests = await prisma.accessRequest.findMany({
      where: {
        verified: true,
        approved: false,
        rejected: false,
      },
      include: {
        user: {
          select: {
            minecraftName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(requests);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve access request
router.post('/access-requests/:id/approve', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.accessRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!request || !request.verified) {
      return res.status(400).json({ error: 'Invalid or unverified request' });
    }

    // Update user to student level
    await prisma.user.update({
      where: { id: request.userId },
      data: {
        isStudent: request.requestedLevel === 'student',
        realName: request.realName,
      },
    });

    // Mark request as approved
    await prisma.accessRequest.update({
      where: { id },
      data: {
        approved: true,
        reviewedBy: req.adminId,
        reviewedAt: new Date(),
      },
    });

    res.json({ message: 'Request approved' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reject access request
router.post('/access-requests/:id/reject', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.accessRequest.update({
      where: { id },
      data: {
        rejected: true,
        reviewedBy: req.adminId,
        reviewedAt: new Date(),
      },
    });

    res.json({ message: 'Request rejected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
