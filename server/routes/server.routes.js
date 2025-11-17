const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateAdmin } = require('../middleware/auth.middleware');
const { getServerConfig, getAllServers, createServer, updateServer, deleteServer } = require('../services/server.service');
const { requestServerStatus } = require('../services/status.service');

const router = express.Router();
const prisma = new PrismaClient();

// Get all servers
router.get('/', (req, res) => {
  res.json(getAllServers());
});

// Check server status (non-blocking)
router.get('/:serverId/status', (req, res) => {
  const server = getServerConfig(req.params.serverId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const status = requestServerStatus(server);
  res.json({
    online: typeof status.online === 'boolean' ? status.online : null,
    pending: Boolean(status.pending),
    checkedAt: status.checkedAt instanceof Date ? status.checkedAt.toISOString() : status.checkedAt,
  });
});

// Get specific server
router.get('/:serverId', (req, res) => {
  const server = getServerConfig(req.params.serverId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  res.json(server);
});

// Accept server rules and grant access
router.post('/:serverId/accept-rules', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { userId } = req.body;

    const server = getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.verified) {
      return res.status(400).json({ error: 'User not found or not verified' });
    }

    // Check access level requirements
    if (server.accessLevel === 'student' && !user.isStudent) {
      return res.status(403).json({ error: 'This server requires a student email' });
    }

    // Create or update server access
    const access = await prisma.serverAccess.upsert({
      where: {
        userId_serverId: {
          userId: user.id,
          serverId,
        },
      },
      update: {
        rulesAccepted: true,
      },
      create: {
        userId: user.id,
        serverId,
        rulesAccepted: true,
      },
    });

    res.json({
      message: 'Access granted',
      access,
      minecraftName: user.minecraftName
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check user's access to a server
router.get('/:serverId/check-access/:userId', async (req, res) => {
  try {
    const { serverId, userId } = req.params;

    const server = getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // All servers require authentication now
    // (no fully open servers)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        serverAccess: {
          where: { serverId },
        },
      },
    });

    if (!user || !user.verified) {
      return res.json({ hasAccess: false, verified: false });
    }

    const access = user.serverAccess[0];
    const hasAccess = access && access.rulesAccepted;

    res.json({
      hasAccess,
      verified: user.verified,
      rulesAccepted: access?.rulesAccepted || false,
      requiresAuth: true,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new server (admin only)
router.post('/', authenticateAdmin, (req, res) => {
  const { id, name, description, ip, accessLevel, requiredEmailDomain, contact, rules, appealPolicy } = req.body;

  if (!id || !name || !description || !ip) {
    return res.status(400).json({ error: 'ID, name, description, and IP are required' });
  }

  if (getServerConfig(id)) {
    return res.status(400).json({ error: 'Server with this ID already exists' });
  }

  const newServer = {
    id,
    name,
    description,
    ip,
    accessLevel: accessLevel || 'public',
    requiredEmailDomain,
    contact,
    rules: Array.isArray(rules) ? rules : [],
    appealPolicy: appealPolicy || 'never',
  };

  createServer(newServer);
  res.json(newServer);
});

// Update server configuration
router.put('/:serverId', authenticateAdmin, (req, res) => {
  const server = getServerConfig(req.params.serverId);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  const updated = updateServer(req.params.serverId, {
    name: req.body.name,
    description: req.body.description,
    ip: req.body.ip,
    accessLevel: req.body.accessLevel,
    requiredEmailDomain: req.body.requiredEmailDomain,
    contact: req.body.contact,
    rules: Array.isArray(req.body.rules) ? req.body.rules : server.rules,
    appealPolicy: req.body.appealPolicy || server.appealPolicy || 'never',
  });

  res.json(updated);
});

// Delete server
router.delete('/:serverId', authenticateAdmin, (req, res) => {
  const removed = deleteServer(req.params.serverId);
  if (!removed) {
    return res.status(404).json({ error: 'Server not found' });
  }
  res.json({ message: 'Server deleted' });
});

module.exports = router;
