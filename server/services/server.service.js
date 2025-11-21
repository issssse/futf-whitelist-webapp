const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const APPEAL_POLICIES = ['never', 'non_student', 'non_member', 'always'];
const MEMBERSHIP_ACCESS_LEVELS = ['member'];

const normalizeAppealPolicy = (value) => {
  if (value && APPEAL_POLICIES.includes(value)) {
    // Treat non_member as the same flavour as non_student for compatibility.
    return value === 'non_member' ? 'non_student' : value;
  }
  if (value === 'students') {
    return 'non_student';
  }
  return 'never';
};

const toServerPayload = (server) => {
  if (!server) {
    return null;
  }

  return {
    ...server,
    rules: Array.isArray(server.rules) ? server.rules : [],
  };
};

const normalizeRules = (rules) => {
  if (Array.isArray(rules)) {
    return rules;
  }
  if (typeof rules === 'string') {
    return rules
      .split('\n')
      .map((rule) => rule.trim())
      .filter(Boolean);
  }
  return [];
};

async function getServerConfig(serverId) {
  const server = await prisma.serverConfig.findUnique({
    where: { id: serverId },
  });
  return toServerPayload(server);
}

async function getAllServers() {
  const servers = await prisma.serverConfig.findMany({
    orderBy: { order: 'asc' },
  });
  return servers.map(toServerPayload);
}

async function createServer(data) {
  const count = await prisma.serverConfig.count();
  const accessLevel = data.accessLevel || 'open';
  const normalizedPolicy = normalizeAppealPolicy(data.appealPolicy);
  const appealPolicy =
    accessLevel === 'member'
      ? data.appealPolicy
        ? normalizeAppealPolicy(data.appealPolicy)
        : 'never'
      : accessLevel === 'appeal_only'
        ? 'always'
        : accessLevel === 'open'
          ? 'never'
          : normalizedPolicy;

  const created = await prisma.serverConfig.create({
    data: {
      id: data.id,
      name: data.name,
      description: data.description,
      ip: data.ip,
      accessLevel,
      requiredEmailDomain: data.requiredEmailDomain || null,
      appealPolicy,
      contact: data.contact || null,
      rules: normalizeRules(data.rules),
      order: typeof data.order === 'number' ? data.order : count,
    },
  });
  return toServerPayload(created);
}

async function updateServer(serverId, data) {
  const existing = await prisma.serverConfig.findUnique({
    where: { id: serverId },
  });
  if (!existing) {
    return null;
  }

  const nextAccessLevel = data.accessLevel || existing.accessLevel || 'open';
  let nextAppealPolicy = existing.appealPolicy || 'never';

  if (nextAccessLevel === 'member') {
    nextAppealPolicy = data.appealPolicy
      ? normalizeAppealPolicy(data.appealPolicy)
      : existing.appealPolicy || 'never';
  } else if (nextAccessLevel === 'appeal_only') {
    nextAppealPolicy = 'always';
  } else if (nextAccessLevel === 'open') {
    nextAppealPolicy = 'never';
  } else if (data.appealPolicy !== undefined) {
    nextAppealPolicy = normalizeAppealPolicy(data.appealPolicy);
  }

  const updated = await prisma.serverConfig.update({
    where: { id: serverId },
    data: {
      name: data.name,
      description: data.description,
      ip: data.ip,
      accessLevel: nextAccessLevel,
      requiredEmailDomain: data.requiredEmailDomain || null,
      contact: data.contact || null,
      appealPolicy: nextAppealPolicy,
      rules:
        data.rules !== undefined ? normalizeRules(data.rules) : undefined,
    },
  });
  return toServerPayload(updated);
}

async function deleteServer(serverId) {
  try {
    await prisma.serverConfig.delete({
      where: { id: serverId },
    });
    await normalizeOrder();
    return true;
  } catch (error) {
    if (error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}

async function reorderServers(order) {
  const tx = [];
  order.forEach((id, index) => {
    tx.push(
      prisma.serverConfig.updateMany({
        where: { id },
        data: { order: index },
      })
    );
  });

  const remaining = await prisma.serverConfig.findMany({
    where: { id: { notIn: order } },
    orderBy: { order: 'asc' },
  });

  remaining.forEach((server, idx) => {
    tx.push(
      prisma.serverConfig.update({
        where: { id: server.id },
        data: { order: order.length + idx },
      })
    );
  });

  if (tx.length > 0) {
    await prisma.$transaction(tx);
  }

  return getAllServers();
}

async function normalizeOrder() {
  const servers = await prisma.serverConfig.findMany({
    orderBy: { order: 'asc' },
  });

  const updates = servers.map((server, index) =>
    prisma.serverConfig.update({
      where: { id: server.id },
      data: { order: index },
    })
  );

  if (updates.length > 0) {
    await prisma.$transaction(updates);
  }
}

const requiresMembership = (server) =>
  Boolean(server && MEMBERSHIP_ACCESS_LEVELS.includes(server.accessLevel));

const membershipAppealsEnabled = (server) => {
  if (!requiresMembership(server)) return false;
  const policy = server?.appealPolicy || server?.appeal_policy || 'never';
  return policy === 'non_student';
};

module.exports = {
  getServerConfig,
  getAllServers,
  createServer,
  updateServer,
  deleteServer,
  reorderServers,
  normalizeOrder,
  MEMBERSHIP_ACCESS_LEVELS,
  requiresMembership,
  membershipAppealsEnabled,
};
