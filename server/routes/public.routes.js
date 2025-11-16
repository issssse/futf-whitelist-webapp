const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getServerConfig } = require('../services/server.service');

const router = express.Router();
const prisma = new PrismaClient();

// Check if username is whitelisted for a server
router.get('/check-whitelist/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { username } = req.query;
    const server = getServerConfig(serverId);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Public servers still require user verification
    // (no open servers without any verification)

    const user = await prisma.user.findUnique({
      where: { minecraftName: username },
      include: {
        serverAccess: {
          where: { serverId },
        },
      },
    });

    const hasAccess = user &&
                      user.verified &&
                      user.serverAccess.length > 0 &&
                      user.serverAccess[0].rulesAccepted;

    res.json({
      allowed: hasAccess,
      username,
      serverId,
      realName: hasAccess ? user.realName : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get real names for multiple Minecraft usernames on a server
router.post('/get-names/:serverId', async (req, res) => {
  try {
    const { serverId } = req.params;
    const { usernames } = req.body;

    if (!Array.isArray(usernames)) {
      return res.status(400).json({ error: 'usernames must be an array' });
    }

    const server = getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const users = await prisma.user.findMany({
      where: {
        minecraftName: { in: usernames },
        verified: true,
      },
      include: {
        serverAccess: {
          where: { serverId },
        },
      },
    });

    const result = users.reduce((acc, user) => {
      // Only include if they have access to this server
      if (user.serverAccess.length > 0 && user.serverAccess[0].rulesAccepted) {
        acc[user.minecraftName] = user.realName || user.minecraftName;
      }
      return acc;
    }, {});

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
