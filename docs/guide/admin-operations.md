---
title: Admin Operations Handbook
description: Practical walkthrough of every control available in the Web2 admin dashboard.
---

# Admin Operations Handbook

This page is the operations manual for everyone who administers the FUTF Minecraft whitelist. It explains **how to sign in**, **review appeals**, **edit servers**, and **provision new admin accounts**. The Admin Dashboard in Web2 now ships with a “Admin Docs” button that opens this guide in a new tab—keep it nearby for on-call situations.

## 1. Quick start checklist

1. Visit the Admin Dashboard at `/admin`.
2. Log in with your administrator credentials (see [adding admins](#5-adding-or-resetting-admin-accounts)).
3. Confirm the top section shows your badge and the “Pending Appeals” card. If it shows “Admin Access Required”, your token has expired—log in again.
4. Keep the **Admin Docs** button handy; it launches this guide inside a new tab.

## 2. Understanding the dashboard layout

| Section | Location | Purpose |
| --- | --- | --- |
| **Header** | Top-left | Shows the shield icon, “Admin Dashboard” title, and your Administrator badge. The new **Admin Docs** button sits on the right. |
| **Pending Appeals** | First card | Collapsible panels for each appeal. Approve/Reject buttons trigger API calls; status toasts confirm the action. |
| **Server Inventory** | Below appeals | Grid of every configured Minecraft server. Use it to verify access levels, rules, IPs, and contact info. |
| **Session Controls** | Bottom | “Sign out” clears `adminToken` from `localStorage` so the dashboard locks itself. |

## 3. Handling appeals

1. Open the “Pending Appeals” card. Each appeal shows IGN, email, requested server, and submission timestamp.
2. Click a row to expand full details (real name, student email, reason).
3. Review and then click **Approve** or **Reject**:
   - Approve grants whitelist access after the user accepts the server rules.
   - Reject keeps the appeal in history and notifies the player.
4. After each action the dashboard re-fetches data automatically. If you need to refresh manually, use the `Reload` button in your browser—state will be restored using the current admin token.

## 4. Managing servers

The Servers tab provides a sortable list of all configured realms (`server/servers.json`). Typical workflows:

- **Verify metadata** – Confirm IP/port, access level (`student` vs `public`), rule list, and contact email.
- **Edit server info** – Use the edit drawer to update descriptions or rule text. All changes are persisted to `servers.json` and are immediately reflected in player views.
- **Check connection status** – Each server card surfaces the last successful ping. If status returns `pending`, run `minecraft-server-util` checks from the backend server.
- **Appeal policy** – Keep `appealPolicy` accurate (`students`, `never`) so the frontend routes appeals correctly.

## 5. Adding or resetting admin accounts

All admin passwords are stored as bcrypt hashes in the `Admin` table. You cannot paste plain text into Prisma Studio; instead, create hashes first.

### Option A – Node helper (recommended)

```bash
cd /code/isacc/web2/server
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  const username = 'admin';              // change if needed
  const email = 'admin@example.com';     // optional override
  const password = 'futf1967';           // choose a strong password
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.admin.upsert({
    where: { username },
    update: { passwordHash, email },
    create: { username, email, passwordHash },
  });
  console.log(`Admin ready: ${username}`);
  await prisma.$disconnect();
})();
NODE
```

- Keeps secrets off-screen (hashing happens locally).
- Works for first-time creation and resets (the `upsert` overrides the hash).

### Option B – Prisma Studio with manual hashing

1. Generate a hash in a Node REPL: `node -e "require('bcryptjs').hash('NewPass123',10).then(console.log)"`
2. Run `npx prisma studio`.
3. Open the `Admin` table, insert or edit a record, and paste the hashed value into `passwordHash`.
4. Save. **Never** paste plain text passwords into the table.

## 6. Daily operations reference

| Task | Steps |
| --- | --- |
| **Verify a player** | Ask them to log in, accept rules, and (if needed) approve their appeal. Use the pending card to see justification and email. |
| **Check whitelist state** | Use the “Servers” list plus `/api/public/check-whitelist/:serverId?username=` to confirm. |
| **Update contact info** | Edit server cards and include `contact` + `rules` arrays so Vite UI stays accurate. |
| **Inspect OTP or email issues** | Backend logs print OTP sends. If players report missing codes, check SMTP credentials in `server/.env` and `pm2 logs web2-api-staging`. |
| **Lock out compromised admin accounts** | Regenerate a hash with Option A and share the new password securely; tokens become invalid on next API call. |

## 7. Launching the docs from the dashboard

The Admin Dashboard’s “Admin Docs” button is wired to `/docs/admin-operations.html` by default. If your deployment hosts docs elsewhere, set `VITE_ADMIN_DOCS_URL` before building the frontend; the button will respect that override. Clicking it opens this page in a new tab so on-call staff always have the playbook nearby.

## 8. Next steps

- Revisit the [Deployment Workflow](./chapter-4-devops.md) for port reservations and Traefik routing.
- Keep the [Backend Reference](/reference/backend.md) close when expanding APIs.
- Log every admin change (appeal decisions, server edits) in the shared ops journal so the next shift sees the current state.
