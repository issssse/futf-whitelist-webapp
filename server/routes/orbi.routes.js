const express = require('express');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const {
  isOrbiMember,
  loadOrbiMembership,
  getMembershipStats,
  CSV_PATH,
} = require('../services/orbi.service');

const router = express.Router();

router.get('/check', async (req, res) => {
  try {
    const email = (req.query.email || '').trim();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const result = isOrbiMember(email);
    res.json({
      member: result.member,
      normalizedEmail: result.normalizedEmail,
      source: 'csv',
    });
  } catch (error) {
    console.error('Failed to check Orbi membership', error);
    const status = error.code === 'ENOENT' ? 503 : 500;
    res.status(status).json({
      error: 'Unable to verify membership',
      details: error.code === 'ENOENT' ? 'Membership list not found on server' : undefined,
    });
  }
});

router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const stats = getMembershipStats();
    res.json({
      ...stats,
      source: CSV_PATH,
    });
  } catch (error) {
    console.error('Failed to get Orbi stats', error);
    res.status(500).json({ error: 'Unable to load membership stats' });
  }
});

router.post('/reload', authenticateAdmin, async (req, res) => {
  try {
    const stats = loadOrbiMembership();
    res.json({
      message: 'Membership list reloaded',
      ...stats,
      source: CSV_PATH,
    });
  } catch (error) {
    console.error('Failed to reload Orbi membership', error);
    const status = error.code === 'ENOENT' ? 503 : 500;
    res.status(status).json({ error: 'Unable to reload membership list' });
  }
});

module.exports = router;
