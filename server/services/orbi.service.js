const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

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

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const membershipCache = {
  loadedAt: null,
  count: 0,
  hash: null,
  entries: new Set(),
};

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

const parseEmailsFromCsv = (content) => {
  const emails = [];
  const matches = content.match(EMAIL_REGEX);
  if (matches) {
    matches.forEach((raw) => {
      const normalized = normalizeEmail(raw);
      if (normalized) {
        emails.push(normalized);
      }
    });
  }
  return emails;
};

function loadOrbiMembership() {
  const resolved = resolveCsvPath();
  if (!resolved.found) {
    const error = new Error(
      `Orbi CSV not found. Set ORBI_CSV_PATH or place FUTF_orbi.csv in a known location. Tried: ${resolved.path}`
    );
    error.code = 'ENOENT';
    throw error;
  }

  const content = fs.readFileSync(resolved.path, 'utf8');
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  const emails = parseEmailsFromCsv(content);
  membershipCache.entries = new Set(emails);
  membershipCache.count = emails.length;
  membershipCache.loadedAt = new Date();
  membershipCache.hash = hash;
  membershipCache.path = resolved.path;
  return getMembershipStats();
}

function ensureLoaded() {
  if (!membershipCache.loadedAt) {
    loadOrbiMembership();
  }
}

function isOrbiMember(email) {
  ensureLoaded();
  const normalized = normalizeEmail(email);
  return {
    normalizedEmail: normalized,
    member: normalized ? membershipCache.entries.has(normalized) : false,
  };
}

function getMembershipStats() {
  return {
    loadedAt: membershipCache.loadedAt,
    count: membershipCache.count,
    hash: membershipCache.hash,
  };
}

module.exports = {
  CSV_PATH,
  isOrbiMember,
  loadOrbiMembership,
  getMembershipStats,
  normalizeEmail,
};
