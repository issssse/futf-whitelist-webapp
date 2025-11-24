---
title: Admin Control Center
description: Everything an operator needs to run the FUTF Minecraft Web2 platform.
---

# Admin Control Center

Welcome! This is the **operations landing page** for the Web2 platform. If you are responsible for approving players, monitoring servers, or answering support questions, start here. Each section explains what you can do inside the admin dashboard and when to escalate to the developer documentation.

> Need a deeper, technical explanation? Look for the <kbd>See developer docs</kbd> links sprinkled throughout. They jump straight into the dev section.

## Choose your handbook

**Admin operators**

- Start here, then dive into the [Admin Operations Handbook](./guide/admin-operations.md) for per-button instructions.
- Provision or rotate accounts with the new [Admin Account Provisioning guide](./guide/admin-accounts.md).
- Use the “Admin Docs” button in the dashboard header to launch these pages in a new tab while you work.
- Need a map of the data model? See the [Database Reference](./reference/database.md).

**Developers & infrastructure**

- Jump straight to the [Setup Checklist](./setup.md) and the five developer chapters in the sidebar.
- Keep the [Backend Reference](/reference/backend.md) nearby when touching Prisma, Express routes, or PM2. Pair it with the [Database Reference](/reference/database.md) for current schemas and import rules.
- Traefik/DNS/port questions should follow the procedures laid out in [Chapter 4 – Deploy & Operate](./guide/chapter-4-devops.md).

## 1. Daily admin checklist

| Step | Action | Notes |
| --- | --- | --- |
| 1 | Sign in at `/admin` | Use your admin credentials. Newly provisioned accounts appear in the [Admin Operations Handbook](./guide/admin-operations.md#5-adding-or-resetting-admin-accounts). |
| 2 | Open the **Pending Appeals** card | Approve or reject each request after verifying the data provided (IGN, reason). |
| 3 | Review the **Server Inventory** | Confirm IP addresses, access levels, and rule text are correct. Update metadata when server owners request changes. |
| 4 | Keep an eye on OTP/email flows | Players who cannot log in will reach out here; see [OTP troubleshooting](#4-email-otp-and-security-codes). |
| 5 | Log decisions in the ops journal | Leave a short note in the shared channel or ticket so the next shift understands what happened. |

## 2. Understanding the admin dashboard

The dashboard is split into four working zones:

1. **Header** – Displays your admin badge and includes the “Admin Docs” button. Clicking it opens the detailed handbook in a new tab.
2. **Pending Appeals** – Collapsible list of all active upgrade/whitelist appeals. Buttons fire API calls and show toast confirmation.
3. **Server Inventory** – Grid backed by the Prisma `ServerConfig` table. Use it to confirm which servers are `student` vs `public`, what the IP/ports are, and the rules players must accept.
4. **Session controls** – Log out when you’re done; tokens live in `localStorage.adminToken`.

If any panel looks broken or data fails to load, capture the toast error and escalate to the developers using the references in the footer.

## 3. Player lifecycle management

### 3.0 Intake wizard (homepage)

Players now walk through a four-step, sliding wizard on the public homepage:

1. **Email & server** – Tabs across the top display every server. Once a player enters a valid email the next panel opens.
2. **Identity** – Minecraft IGN + real name fields appear. Both must be filled to continue.
3. **Verification** – Players press “Send Magic Link” which emails them a secure sign-in URL. Opening it on the same device flips the step to “verified.”
4. **Finalise** – Appeals (if enabled) and the “I have read the rules” checkbox live here. The submit button stays disabled until the magic link is confirmed.

Remind users that student-only servers require an email ending with the configured domain. If “Never Allow Appeals” is set, the UI simply tells them which domain they need.

### 3.1 Magic link verification

1. Ask the player to complete Step 1–2 on the homepage and click **Send Magic Link**.
2. If the email never arrives:
   - Check spam/junk folders and make sure the inbox accepts messages from `noreply@futf.se`.
   - Verify `SMTP_*` values in `server/.env` (developer doc [Backend Reference → Email service](/reference/backend.html#services)).
   - Review `pm2 logs web2-api-staging` for SMTP errors or provider throttling.
3. They must open the link on the same device/browser. If they use another mailbox app, have them copy the link into the browser that submitted the request.
4. If still stuck, resend the link (button text switches to “Resend Magic Link”) and escalate to developers if mail logs look clean.

### 3.2 Appeals workflow

1. Appeals arrive whenever a player wants higher access (e.g., move from `public` to `student`).
2. Expand the row to see their reason, student email, and submission date.
3. Approve or reject; the backend immediately updates `ServerAccess` and notifies the user.
4. If the appeal mentions a server not listed in your inventory, cross-check the **Servers** view (or Prisma) and alert the developers to add it.

### 3.3 Removing or locking accounts

Occasionally you may need to suspend a user:

- Revoke access via the developer API (`/api/admin/access-requests/:id/reject`) or ask a developer to run a Prisma script.
- If an account is compromised, reset their password/OTP secret and notify them to relaunch the verification flow.

## 4. Email delivery troubleshooting

| Symptom | What to check | Escalation |
| --- | --- | --- |
| Magic link never arrives | `pm2 logs web2-api-staging` plus `SMTP_*` values in `.env`. Make sure the SMTP service isn’t blocking the sender. | If the relay is down or greylisting requests, ping developers to fail over. |
| Link opens but UI still locked | The link was opened in a different browser/device. Ask the player to open it in the same browser where they initiated the request so `localStorage` syncs. | Capture the email and time, then alert developers to inspect the `User` table for `verified=false`. |
| Appeal confirmation missing | Check `notifications` or server logs for 500 errors. Usually indicates SMTP credentials expired. | Developers need to rotate secrets. See [Setup → Environment variables](/setup). |

## 5. Server management playbook

1. **Add or edit a server** – Use the dashboard drawer to update name, description, IP, rules, and access level. All changes are stored in the `ServerConfig` table via Prisma and take effect immediately.
2. **Check online status** – The status badge pings the Minecraft host via `minecraft-server-util`. If it stays `pending`, verify the host/port combination or consult the infrastructure team.
3. **Coordinate with server owners** – Update the `contact` field so players know who to email for gameplay issues.
4. **Access mode** – Choose one of four presets:
   - `open` – no whitelist flow; anyone can join right away.
   - `student` – requires `@student.uu.se`; you can optionally allow appeals for non-students.
   - `appeal_only` – every request must be reviewed manually.
5. **Appeal policy** – When the mode isn’t `open`, pick how appeals behave:
   - `never` – student email required, no appeals.
   - `non_student` – players missing the student domain can appeal.
   - `always` – every request becomes an appeal (manual approval only).
6. **Order of appearance** – Use the ↑/↓ arrows in the admin dashboard to reorder servers. The sequence is stored in the `ServerConfig` table, so whatever you choose is exactly how players see the tab list.

> Need query examples or schema details? See [Developer Guide → Chapter 3 – Backend Services](/guide/chapter-3-backend.html).

## 6. Admin-specific quick links

- [Admin Operations Handbook](./guide/admin-operations.md) – Deep dives on every button, plus scripts for creating admin accounts.
- [Admin Account Provisioning](./guide/admin-accounts.md) – Dedicated walkthrough for creating, auditing, and rotating admin users.
- [Developer Guide](./guide/chapter-1-foundations.md) – Architecture diagrams, Prisma schema walkthroughs, and deployment scripts.
- [Backend Reference](/reference/backend.md) – Complete API list, useful when you need to verify an endpoint or share a curl command with a developer.
- [Frontend Reference](/reference/frontend.md) – Component map for the React UI (helpful when reporting bugs with screenshots).

## 7. When to call for developer help

Escalate immediately when:

- PM2 shows the frontend or backend process in `errored` state and restarting does not fix it.
- Prisma migrations fail or you see database errors in logs (developers will follow the [deployment workflow](/guide/chapter-4-devops.html)).
- Mail/OTP infrastructure is down for more than 10 minutes.
- DNS/Traefik changes are required (e.g., new subdomain). Refer to the developer docs for the full checklist.

Document the incident in the ops journal, attach log snippets, and include the time you escalated. Developers will take over from there.

---

**Next up:**  
👉 Continue with the [Admin Operations Handbook](./guide/admin-operations.md) for step-by-step instructions.  
👉 Switch to the [Developer Guide](./guide/chapter-1-foundations.md) when you need to dive into code, ports, or infrastructure.
