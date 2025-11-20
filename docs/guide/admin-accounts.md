---
title: Admin Account Provisioning
description: Step-by-step instructions for creating, rotating, and auditing administrator accounts in Web2.
---

# Admin Account Provisioning

Operators occasionally need to onboard a new admin, rotate credentials, or recover a locked account. This page explains exactly how to do that without exposing raw passwords or leaving the Prisma database in a bad state.

## 1. When to create or rotate an admin

- **New team member** – A colleague joins the Minecraft ops team and needs access to `/admin`.
- **Lost credentials** – An admin forgot their password or their device was compromised.
- **Routine rotation** – Shared accounts (e.g. `oncall`) must be rotated at least once per semester.
- **Incident response** – You need to immediately revoke/replace access because of suspicious behaviour.

Before you start, make sure you have:

1. Shell access to the deployment host.
2. A working `.env` inside `web2/server` (database + SMTP).
3. Prisma CLI installed (`cd web2/server && npm install` has already been run).

## 2. Option A – Quick Node helper (recommended)

This single command hashes the password and upserts the record in one go. Nothing sensitive is printed.

```bash
cd /code/isacc/web2/server
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const username = process.env.NEW_ADMIN_USER || 'admin';
  const email = process.env.NEW_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.NEW_ADMIN_PASS || 'futf1967';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.upsert({
    where: { username },
    update: { passwordHash, email },
    create: { username, email, passwordHash },
  });

  console.log(`Admin ready: ${username} (${email})`);
  await prisma.$disconnect();
})();
NODE
```

**After the script finishes**

1. Share the username/password with the operator via a secure channel (Matrix DM, Bitwarden note, etc).
2. Ask them to log in at `/auth` immediately and confirm they can reach the dashboard.
3. Delete the temporary environment variables (`unset NEW_ADMIN_PASS`, etc.) if you used them.

## 3. Option B – Prisma Studio + manual hashing

Use this when you prefer a UI but still want to avoid storing raw passwords.

1. Generate a hash locally:
   ```bash
   node -e "require('bcryptjs').hash('NewPass123', 12).then(console.log)"
   ```
2. Launch Prisma Studio:
   ```bash
   cd /code/isacc/web2/server
   npx prisma studio
   ```
3. Open the **Admin** table, click **Add Record**, fill `username`, `email`, and paste the hashed string into `passwordHash`.
4. Save, then stop Prisma Studio (`Ctrl+C`).

> ⚠️ Never paste the plain password into `passwordHash`. Only hashes belong there.

## 4. Option C – Reset an existing admin

Sometimes you just need to rotate a single account without touching others.

```bash
cd /code/isacc/web2/server
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

(async () => {
  const username = process.env.RESET_ADMIN_USER || 'admin';
  const password = process.env.RESET_ADMIN_PASS || 'ChangeMeNow!';
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.admin.update({
    where: { username },
    data: { passwordHash },
  });

  console.log(`Password rotated for ${username}`);
  await prisma.$disconnect();
})();
NODE
```

Share the new password securely and remind the admin to update any password manager entries.

## 5. Post-provision checklist

| Step | Why |
| --- | --- |
| Admin signs in at `/auth` | Confirms credentials are valid and session cookies work. |
| Review PM2 logs (`pm2 logs web2-api-staging`) | Ensure no authentication errors appear. |
| Update the ops journal | Document who created/rotated which account and why. |
| Remove temporary secrets | Delete any shell history or environment variables containing plain passwords. |

## 6. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `P2002 Unique constraint failed` | Username already exists. | Use the upsert script or choose a different username. |
| `P2025 Record not found` | Update script couldn't find the admin. | Double-check `username` spelling and run the upsert version. |
| Admin still can't log in | Token cached in browser or typo. | Ask them to clear storage, retry, then check API logs for `/api/admin/login`. |
| Need to audit existing admins | Run `npx prisma studio`, open `Admin`, and export the table. Store the export in the secure wiki. |

## 7. Related links

- [Admin Operations Handbook](./admin-operations.md) – Detailed dashboard walkthrough and daily procedures.
- [Backend Reference](/reference/backend.md#services) – API endpoints and scripts.
- [Docs Landing Page](/) – Jump back to the admin vs developer overview.

Keep this page updated whenever the provisioning workflow changes so every on-call operator follows the same protocol.
