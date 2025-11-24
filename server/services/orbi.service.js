const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ORBI_HASH_PEPPER = process.env.ORBI_HASH_PEPPER;

const resolveCsvPath = () => {
  const envPath = process.env.ORBI_CSV_PATH;
  const candidates = [
    envPath,
    path.join(__dirname, '..', 'data', 'FUTF_orbi.csv'),
    path.join(__dirname, '..', '..', 'data', 'FUTF_orbi.csv'),
    path.join(__dirname, '..', '..', 'FUTF_orbi.csv'),
    path.join(__dirname, '..', '..', '..', 'FUTF_orbi.csv'),
    '/code/isacc/FUTF_orbi.csv',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return { path: candidate, found: true };
    }
  }

  return { path: candidates[0], found: false };
};

const CSV_PATH = resolveCsvPath().path;

const normalizeEmail = (value = '') => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  const [local, domain] = trimmed.split('@');
  if (!local || !domain) return '';

  const baseLocal = local.split('+')[0];
  const normalizedLocal =
    domain === 'gmail.com' || domain === 'googlemail.com'
      ? baseLocal.replace(/\./g, '')
      : baseLocal;

  return `${normalizedLocal}@${domain}`;
};

const hashEmail = (normalizedEmail) => {
  if (!ORBI_HASH_PEPPER) {
    const err = new Error('ORBI_HASH_PEPPER is not configured');
    err.code = 'NO_PEPPER';
    throw err;
  }
  return crypto.createHash('sha256').update(`${ORBI_HASH_PEPPER}:${normalizedEmail}`).digest('hex');
};

const parseCsvRows = (content) => {
  const rows = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const header = rows.shift();
  const records = [];

  if (!header || !header.toLowerCase().includes('email')) {
    return records;
  }

  rows.forEach((line) => {
    if (!line.trim()) return;
    // Simple CSV parse for quoted cells
    const cleaned = line.replace(/^"|"$/g, '');
    const cells = cleaned.split('","');
    const name = cells[0] || '';
    const email = cells[1] || '';
    const status = cells[3] || 'Active';
    const validFromRaw = cells[5] || '';
    const membershipId = cells[7] || '';
    records.push({ name, email, status, validFromRaw, membershipId });
  });

  return records;
};

const parseDateSafe = (value) => {
  if (!value || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

async function reloadOrbiMembership() {
  const resolved = resolveCsvPath();
  if (!resolved.found) {
    const error = new Error(
      `Orbi CSV not found. Set ORBI_CSV_PATH or place FUTF_orbi.csv in a known location. Tried: ${resolved.path}`
    );
    error.code = 'ENOENT';
    throw error;
  }

  const content = fs.readFileSync(resolved.path, 'utf8');
  const records = parseCsvRows(content);
  let imported = 0;

  for (const record of records) {
    const normalizedEmail = normalizeEmail(record.email);
    if (!normalizedEmail) continue;
    const hashedEmail = hashEmail(normalizedEmail);
    const cleanName = record.name && record.name.includes('@') ? null : record.name || null;
    await prisma.orbiMember.upsert({
      where: { hashedEmail },
      update: {
        name: cleanName,
        status: record.status || 'Active',
        validFrom: parseDateSafe(record.validFromRaw),
      },
      create: {
        name: cleanName,
        hashedEmail,
        status: record.status || 'Active',
        validFrom: parseDateSafe(record.validFromRaw),
      },
    });
    imported += 1;
  }

  const stats = await getMembershipStats();
  return { ...stats, imported, source: resolved.path };
}

async function isOrbiMember(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    return { normalizedEmail: normalized, member: false, name: null };
  }
  const hashedEmail = hashEmail(normalized);
  const member = await prisma.orbiMember.findFirst({
    where: {
      OR: [{ hashedEmail }, { membershipId: hashedEmail }], // fallback if hashedEmail used as membershipId key
    },
    select: { name: true },
  });
  return {
    normalizedEmail: normalized,
    member: Boolean(member),
    name: member?.name || null,
  };
}

async function getMembershipStats() {
  const count = await prisma.orbiMember.count();
  const latest = await prisma.orbiMember.findFirst({
    orderBy: { updatedAt: 'desc' },
    select: { updatedAt: true },
  });
  return {
    count,
    updatedAt: latest?.updatedAt || null,
  };
}

async function processOrbiCsv(csvContent, { dryRun = false } = {}) {
  if (!ORBI_HASH_PEPPER) {
    const err = new Error('ORBI_HASH_PEPPER is not configured');
    err.code = 'NO_PEPPER';
    throw err;
  }

  const records = parseCsvRows(csvContent);
  const incoming = new Map(); // key -> data
  const preview = [];

  records.forEach((record, index) => {
    const normalizedEmail = normalizeEmail(record.email);
    if (!normalizedEmail) return;
    const hashedEmail = hashEmail(normalizedEmail);
    const cleanName = record.name && record.name.includes('@') ? null : record.name || null;
    const membershipId = (record.membershipId || '').trim() || hashedEmail;
    const key = membershipId;
    const entry = {
      key,
      hashedEmail,
      membershipId,
      name: cleanName,
      status: record.status || 'Active',
      validFrom: parseDateSafe(record.validFromRaw),
      normalizedEmail,
      rawName: record.name || '',
      rawEmail: record.email || '',
    };
    incoming.set(key, entry);
    if (preview.length < 5) {
      preview.push({
        name: cleanName || '',
        email: record.email,
        status: entry.status,
        validFrom: record.validFromRaw || '',
        membershipId: membershipId || '',
      });
    }
  });

  const existing = await prisma.orbiMember.findMany();
  const existingById = new Map(existing.map((m) => [m.membershipId, m]));
  const matchedExisting = new Set();

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  let deleted = 0;
  const matchedExistingKeys = new Set();

  // compute diffs
  incoming.forEach((entry) => {
    const curr = existingById.get(entry.key);
    if (!curr) {
      added += 1;
      return;
    }
    const matchedKey = curr.membershipId || curr.hashedEmail;
    matchedExisting.add(matchedKey);
    const sameName = (curr.name || '') === (entry.name || '');
    const sameStatus = (curr.status || '') === (entry.status || '');
    const sameValidFrom =
      (!curr.validFrom && !entry.validFrom) ||
      (curr.validFrom && entry.validFrom && curr.validFrom.getTime() === entry.validFrom.getTime());
    if (sameName && sameStatus && sameValidFrom) {
      unchanged += 1;
    } else {
      updated += 1;
    }
  });

  existing.forEach((m) => {
    if (!matchedExisting.has(m.membershipId)) {
      deleted += 1;
    }
  });

  if (!dryRun) {
    const deleteIds = existing
      .filter((m) => {
        return !matchedExisting.has(m.membershipId);
      })
      .map((m) => m.id);
    const operations = [];
    if (deleteIds.length > 0) {
      operations.push(
        prisma.orbiMember.deleteMany({
          where: { id: { in: deleteIds } },
        })
      );
    }
    operations.push(
      ...Array.from(incoming.values()).map((entry) => {
        const whereClause = entry.membershipId
          ? { membershipId: entry.membershipId }
          : { hashedEmail: entry.hashedEmail };
        return prisma.orbiMember.upsert({
          where: whereClause,
          update: {
            name: entry.name,
            status: entry.status,
            validFrom: entry.validFrom,
            hashedEmail: entry.hashedEmail,
            membershipId: entry.membershipId,
          },
          create: {
            hashedEmail: entry.hashedEmail,
            membershipId: entry.membershipId,
            name: entry.name,
            status: entry.status,
            validFrom: entry.validFrom,
          },
        });
      })
    );
    await prisma.$transaction(operations);
  }

  return {
    summary: {
      totalIncoming: incoming.size,
      totalExisting: existing.length,
      added,
      updated,
      unchanged,
      deleted,
    },
    preview,
    dryRun,
  };
}

module.exports = {
  CSV_PATH,
  isOrbiMember,
  reloadOrbiMembership,
  getMembershipStats,
  normalizeEmail,
  hashEmail,
  processOrbiCsv,
};
