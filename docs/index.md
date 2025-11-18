---
title: Admin Control Center
description: Everything an operator needs to run the FUTF Minecraft Web2 platform.
---

# Admin Control Center

Welcome! This is the **operations landing page** for the Web2 platform. If you are responsible for approving players, monitoring servers, or answering support questions, start here. Each section explains what you can do inside the admin dashboard and when to escalate to the developer documentation.

> Need a deeper, technical explanation? Look for the <kbd>See developer docs</kbd> links sprinkled throughout. They jump straight into the dev section.

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
3. **Server Inventory** – Grid that mirrors `server/servers.json`. Use it to confirm which servers are `student` vs `public`, what the IP/ports are, and the rules players must accept.
4. **Session controls** – Log out when you’re done; tokens live in `localStorage.adminToken`.

If any panel looks broken or data fails to load, capture the toast error and escalate to the developers using the references in the footer.

## 3. Player lifecycle management

### 3.1 Login & OTP support

1. Ask the player to enter their email on the homepage and type the six-digit OTP.
2. If the OTP never arrives:
   - Check the spam folder and ensure the email isn’t blocked by their provider.
   - Verify `SMTP_*` values in `server/.env` (developer doc [Backend Reference → Email service](/reference/backend.html#services)).
   - Review `pm2 logs web2-api-staging` for SMTP or rate-limit errors.
3. Resend OTPs only after confirming the inbox; repeatedly hitting “Send” triggers throttling.

### 3.2 Appeals workflow

1. Appeals arrive whenever a player wants higher access (e.g., move from `public` to `student`).
2. Expand the row to see their reason, student email, and submission date.
3. Approve or reject; the backend immediately updates `ServerAccess` and notifies the user.
4. If the appeal mentions a server not listed in your inventory, cross-check `server/servers.json` and alert the developers to add it.

### 3.3 Removing or locking accounts

Occasionally you may need to suspend a user:

- Revoke access via the developer API (`/api/admin/access-requests/:id/reject`) or ask a developer to run a Prisma script.
- If an account is compromised, reset their password/OTP secret and notify them to relaunch the verification flow.

## 4. Email, OTP, and security codes

| Symptom | What to check | Escalation |
| --- | --- | --- |
| OTP never arrives | `pm2 logs web2-api-staging` plus `SMTP_*` values in `.env`. Make sure Mailpit/Mailgun have capacity. | If the SMTP provider is down, ping developers to fail over. |
| OTP always invalid | Ensure device clocks are accurate; players sometimes paste old codes. | Capture the email address and send to developers to inspect `EmailVerification` table. |
| Appeal confirmation missing | Check `notifications` or server logs for 500 errors. Usually indicates SMTP credentials expired. | Developers need to rotate secrets. See [Setup → Environment variables](/setup). |

## 5. Server management playbook

1. **Add or edit a server** – Use the dashboard drawer to update name, description, IP, rules, and access level. All changes are persisted to `server/servers.json` on disk.
2. **Check online status** – The status badge pings the Minecraft host via `minecraft-server-util`. If it stays `pending`, verify the host/port combination or consult the infrastructure team.
3. **Coordinate with server owners** – Update the `contact` field so players know who to email for gameplay issues.
4. **Appeal policies** – Set `appealPolicy` to `students`, `never`, or `custom`. This toggles whether the frontend even shows the “Appeal” button for that server.

> Need to know how the JSON file is parsed or how pm2 reloads it? See [Developer Guide → Chapter 3 – Backend Services](/guide/chapter-3-backend.html).

## 6. Admin-specific quick links

- [Admin Operations Handbook](./guide/admin-operations.md) – Deep dives on every button, plus scripts for creating admin accounts.
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
