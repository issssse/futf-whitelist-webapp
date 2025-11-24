## Database architecture

The platform uses PostgreSQL via Prisma (`server/prisma/schema.prisma`). Key models:

- **User** – email (unique), minecraftName (unique), realName?, isStudent, verified, verificationToken, timestamps.
- **ServerConfig** – id, name, description, ip, accessLevel, requiredEmailDomain, appealPolicy, contact, `rules` JSON (`markdownUrl`, `pdfUrl`, `mustAccept`), order, timestamps.
- **ServerAccess** – userId + serverId (unique), rulesAccepted, timestamps.
- **AccessRequest** – legacy/extra request flow: requestedLevel, note, approvals, verificationToken.
- **EmailVerification** – OTP/magic-link codes: email, code, expiresAt, verified.
- **Appeal** – whitelist appeals: serverId, userEmail, minecraftName, realName?, studentEmail?, reason, status, reviewer info.
- **Admin** – username (unique), passwordHash, email.
- **OrbiMember** – membershipId (unique), hashedEmail (unique), name?, status, validFrom; email hashed as `sha256(ORBI_HASH_PEPPER:normalizedEmail)`.

### How flows use it
- **Magic link / register** (`POST /api/auth/register`) creates/updates User and sends email; respects server access rules (membership, student domain). Verification sets User.verified and leads to ServerAccess on approval.
- **Appeals** (`/api/appeals`) are created when requirements aren’t met but appeals are allowed. Approvals add access.
- **Rules**: URLs stored in ServerConfig.rules drive the “must accept rules” modal on the homepage.
- **Orbi checks** (`/api/orbi/check`) normalize + hash email and match OrbiMember by membershipId or hashedEmail; name is used to autofill realName. Admin CSV import lives at `/api/orbi/upload`.
- **Admin dashboard** surfaces ServerConfig, pending appeals, and Orbi stats (count/updatedAt) and drives CSV preview/diff import.

### Changing the schema safely
1. Edit `server/prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name <change>` (or your migrate script), then `npx prisma generate`.
3. Restart the API (`pm2 restart web2-api-staging`) so the new client loads.
4. Smoke test: `curl <api>/api/servers`, `curl <api>/api/orbi/check?email=…`, and a test `POST /api/auth/register …`.

### Orbi import rules
- CSV columns: name, email, status, valid-from, membershipId (col 8). If membershipId missing, hashedEmail is used as key, but membershipId is expected to be unique.
- Emails are normalized (gmail dots removed, plus-part stripped) then hashed with `ORBI_HASH_PEPPER`.
- Import returns Incoming vs Current counts and Added/Updated/Unchanged/Deleted; preview shows first rows.
- Missing `ORBI_HASH_PEPPER` or CSV path (`ORBI_CSV_PATH` or default `data/FUTF_orbi.csv`) will fail the import.

### Ops notes
- ENV: `DATABASE_URL`, `ORBI_HASH_PEPPER`, `SMTP_*`, `FRONTEND_URL`, `JWT_SECRET`.
- SMTP: if Gmail throttles (421 4.7.0), switch to Mailpit/another relay to avoid magic-link “Network Error”.
- Default server ordering is from `ServerConfig.order`; not via .env anymore.
- Before bulk imports or schema tweaks, snapshot the DB; Orbi import replaces the list in place.

### Manual changes
- Prefer admin UI for servers, rules URLs, and Orbi import.
- If editing directly, keep uniqueness: User.email/minecraftName, ServerAccess(userId,serverId), OrbiMember.membershipId.
- Always normalize + hash emails when inserting OrbiMember (use the service helpers).
