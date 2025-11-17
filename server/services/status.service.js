const net = require('net');
const { status: minecraftStatus } = require('minecraft-server-util');

const STATUS_CACHE_TTL_MS = parseInt(process.env.SERVER_STATUS_TTL_MS || '30000', 10);
const STATUS_TIMEOUT_MS = parseInt(process.env.SERVER_STATUS_TIMEOUT_MS || '2000', 10);

const INTERNAL_SERVER_PATTERNS = [
  /\.futf\.se$/i,
  /^localhost$/i,
  /^127\./,
];

const statusCache = new Map();

const pingTcpFallback = (host, port) =>
  new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.destroy();
      resolve(true);
    });

    const handleFailure = () => {
      socket.destroy();
      resolve(false);
    };

    socket.on('error', handleFailure);
    socket.setTimeout(STATUS_TIMEOUT_MS, handleFailure);
  });

async function pingMinecraftServer(host, port, isInternalServer) {
  try {
    const result = await minecraftStatus(host, port, {
      timeout: STATUS_TIMEOUT_MS,
      enableSRV: true,
      protocolVersion: 0, // auto-negotiate
    });

    const motd = Array.isArray(result.motd?.clean)
      ? result.motd.clean.join(' ')
      : result.motd?.clean || null;

    return {
      online: true,
      players: result.players
        ? {
          online: result.players.online ?? null,
          max: result.players.max ?? null,
        }
        : null,
      version: result.version?.name || null,
      motd,
      latency: typeof result.roundTripLatency === 'number' ? result.roundTripLatency : null,
    };
  } catch (error) {
    if (isInternalServer) {
      const reachable = await pingTcpFallback(host, port);
      if (reachable) {
        return {
          online: true,
          players: null,
          version: null,
          motd: null,
          latency: null,
        };
      }
    }

    throw error;
  }
}

function isInternalHost(host) {
  return INTERNAL_SERVER_PATTERNS.some((pattern) => pattern.test(host));
}

function schedulePing(serverId, host, port) {
  const existing = statusCache.get(serverId);
  if (existing?.pending) {
    return;
  }

  const isInternal = isInternalHost(host);

  statusCache.set(serverId, {
    ...(existing || { online: null, checkedAt: null }),
    pending: true,
  });

  pingMinecraftServer(host, port, isInternal)
    .then((result) => {
      statusCache.set(serverId, {
        online: result.online,
        players: result.players,
        version: result.version,
        motd: result.motd,
        latency: result.latency,
        checkedAt: new Date(),
        pending: false,
        error: null,
      });
    })
    .catch((error) => {
      statusCache.set(serverId, {
        online: false,
        players: null,
        version: null,
        motd: null,
        latency: null,
        checkedAt: new Date(),
        pending: false,
        error: error?.message || 'Unable to reach server',
      });
    });
}

function requestServerStatus(server) {
  const [host, port] = server.ip.split(':');
  const portNumber = parseInt(port || '25565', 10);
  let cached = statusCache.get(server.id);

  const shouldRefresh =
    !cached ||
    (!cached.pending &&
      (!cached.checkedAt || Date.now() - cached.checkedAt.getTime() > STATUS_CACHE_TTL_MS));

  if (shouldRefresh) {
    schedulePing(server.id, host, portNumber);
    cached = statusCache.get(server.id);
  }

  return (
    cached || {
      online: null,
      pending: true,
      checkedAt: null,
    }
  );
}

module.exports = {
  requestServerStatus,
};
