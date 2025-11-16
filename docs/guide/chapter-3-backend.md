# Chapter 3 – Backend Services

This chapter explains the Express API, Prisma schema, and infrastructure glue.

## 3.1 Express entry point

`server/server.js` wires up shared middleware and routers:

```js
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/admin', adminRoutes);
```

Set `PORT` in `.env` (default 3001). The frontend proxy expects 5003 during local dev.

## 3.2 Prisma models

Located in `server/prisma/schema.prisma`:

- `User` – players, their Minecraft names, verification flags.
- `ServerAccess` – rule acceptance per server.
- `AccessRequest` – legacy upgrade requests.
- `Admin` – credentialed admins (username/passwordHash/email).
- `EmailVerification` – OTP codes with expiry.
- `Appeal` – new whitelist/student appeals submitted from Home page.

Run `npx prisma migrate deploy` to apply SQL, `npx prisma generate` to refresh the client.

## 3.3 Key routes

| Router | File | Highlights |
| --- | --- | --- |
| Auth | `routes/auth.routes.js` | Player registration + email verify (legacy) |
| User | `routes/user.routes.js` | Profile CRUD, magic login, server list |
| Servers | `routes/server.routes.js` | Public server list, rule acceptance, admin CRUD, status check |
| OTP | `routes/otp.routes.js` | `/send`, `/verify` for email codes |
| Appeals | `routes/appeal.routes.js` | Submit, list, approve/reject appeals |
| Admin | `routes/admin.routes.js` | Login, access-request approvals |
| Public | `routes/public.routes.js` | 3rd-party whitelist checks |

## 3.4 Email + notifications

`services/email.service.js` uses Nodemailer. In dev it defaults to a JSON transport (no SMTP required). Configure real SMTP credentials via `.env` for production.

## 3.5 Configuration source

`server/servers.json` is the canonical record for server metadata (id, name, IP, accessLevel, rules, contact). Admin CRUD endpoints mutate this file so keep it under version control and protect with backups.

## 3.6 Admin utilities

The documentation `docs/reference/backend.md` contains Prisma scripts for seeding admins and verifying OTP tables. Keep them handy for emergency fixes.

### Next chapter

Learn how to deploy and operate the stack in [Chapter 4 – Deploy & Operate](./chapter-4-devops.md).
