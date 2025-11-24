const express = require('express');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const {
  isOrbiMember,
  reloadOrbiMembership,
  getMembershipStats,
  processOrbiCsv,
} = require('../services/orbi.service');

const router = express.Router();

router.get('/check', async (req, res) => {
  try {
    const email = (req.query.email || '').trim();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const result = await isOrbiMember(email);
    res.json({
      member: result.member,
      normalizedEmail: result.normalizedEmail,
      source: 'db',
      name: result.name,
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
    const stats = await getMembershipStats();
    res.json({
      ...stats,
      source: 'db',
    });
  } catch (error) {
    console.error('Failed to get Orbi stats', error);
    res.status(500).json({ error: 'Unable to load membership stats' });
  }
});

router.post('/reload', authenticateAdmin, async (req, res) => {
  try {
    const stats = await reloadOrbiMembership();
    res.json({
      message: 'Membership list reloaded',
      ...stats,
      source: 'db',
    });
  } catch (error) {
    console.error('Failed to reload Orbi membership', error);
    const status = error.code === 'ENOENT' ? 503 : 500;
    res.status(status).json({ error: 'Unable to reload membership list' });
  }
});

router.post('/upload', authenticateAdmin, async (req, res) => {
  try {
    const { csv, dryRun } = req.body || {};
    if (!csv || typeof csv !== 'string') {
      return res.status(400).json({ error: 'CSV content is required' });
    }
    const result = await processOrbiCsv(csv, { dryRun: Boolean(dryRun) });
    res.json({
      message: dryRun ? 'Dry run completed' : 'Membership list updated',
      ...result.summary,
      preview: result.preview,
      dryRun: result.dryRun,
    });
  } catch (error) {
    console.error('Failed to upload Orbi membership', error);
    if (error.code === 'NO_PEPPER') {
      return res.status(500).json({ error: 'ORBI_HASH_PEPPER is not configured on server' });
    }
    const status = error.code === 'ENOENT' ? 503 : 500;
    res.status(status).json({ error: 'Unable to process membership CSV' });
  }
});

module.exports = router;
