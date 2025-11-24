#!/usr/bin/env node
/**
 * Quick helper to add an admin with a hashed password.
 *
 * Usage:
 *   cd server
 *   node scripts/create-admin.js <username> <email> <password>
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function main() {
  const [username, email, password] = process.argv.slice(2);
  if (!username || !email || !password) {
    console.error('Usage: node scripts/create-admin.js <username> <email> <password>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.admin.upsert({
      where: { email },
      update: { username, passwordHash },
      create: {
        id: crypto.randomUUID(),
        username,
        email,
        passwordHash,
      },
    });
    console.log(`Admin saved: ${admin.username} (${admin.email})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
