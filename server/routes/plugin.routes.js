const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { getServerConfig, getDefaultServerId } = require('../services/server.service');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/check-user', async (req, res) => {
  try {
    const username = (req.query.username || '').trim();
    const requestedServerId = (req.query.serverId || '').trim();
    const serverId = requestedServerId || (await getDefaultServerId());

    if (!username) {
      return res.status(400).json({ error: 'username is required', allowed: false });
    }

    if (!serverId) {
      return res.status(400).json({ error: 'serverId missing (add a server in admin or provide ?serverId=)', allowed: false });
    }

    const server = await getServerConfig(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found', allowed: false });
    }

    const user = await prisma.user.findUnique({
      where: { minecraftName: username },
      include: {
        serverAccess: {
          where: { serverId },
        },
      },
    });

    const allowed = Boolean(
      user &&
      user.verified &&
      user.serverAccess.length > 0 &&
      user.serverAccess[0].rulesAccepted
    );

    res.json({
      allowed,
      username,
      serverId,
      realName: allowed ? user.realName : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error', allowed: false });
  }
});

module.exports = router;
