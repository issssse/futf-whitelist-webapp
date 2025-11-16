# Backend Reference

Catalog of all API routes, services, and maintenance scripts.

## Server routes

### Auth (`routes/auth.routes.js`)
- `POST /api/auth/register`
- `GET /api/auth/verify`

### User (`routes/user.routes.js`)
- `GET /api/user/profile/:id`
- `PUT /api/user/profile/:id`
- `POST /api/user/login`
- `GET /api/user/my-servers/:id`

### Servers (`routes/server.routes.js`)
- `GET /api/servers`
- `GET /api/servers/:serverId`
- `GET /api/servers/:serverId/status`
- `POST /api/servers/:serverId/accept-rules`
- `GET /api/servers/:serverId/check-access/:userId`
- `POST /api/servers` *(admin)*
- `PUT /api/servers/:serverId` *(admin)*
- `DELETE /api/servers/:serverId` *(admin)*

### OTP (`routes/otp.routes.js`)
- `POST /api/otp/send`
- `POST /api/otp/verify`

### Appeals (`routes/appeal.routes.js`)
- `POST /api/appeals`
- `GET /api/appeals` *(admin)*
- `POST /api/appeals/:id/approve`
- `POST /api/appeals/:id/reject`

### Admin (`routes/admin.routes.js`)
- `POST /api/admin/login`
- `GET /api/admin/access-requests`
- `POST /api/admin/access-requests/:id/approve`
- `POST /api/admin/access-requests/:id/reject`

### Public (`routes/public.routes.js`)
- `GET /api/public/check-whitelist/:serverId?username=IGN`
- `POST /api/public/get-names/:serverId`

## Services

- `services/email.service.js` – Nodemailer transport (JSON transport fallback for dev), OTP + appeal notifications.
- `services/server.service.js` – Loads/saves `servers.json` with helper methods (`getAllServers`, `updateServer`, etc.).

## Middleware

- `middleware/auth.middleware.js` – `authenticateAdmin` verifies JWT from `Authorization: Bearer` header.

## Prisma scripts

Create/update admin:

```bash
cd web2/server
node - <<'NODE'
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
(async () => {
  const passwordHash = await bcrypt.hash('ChangeMe123', 10);
  await prisma.admin.upsert({
    where: { username: 'admin' },
    update: { passwordHash },
    create: { username: 'admin', email: 'admin@example.com', passwordHash }
  });
  await prisma.$disconnect();
})();
NODE
```

List pending appeals via Prisma Studio:

```
npx prisma studio
```

## Configuration files

- `.env` – `DATABASE_URL`, `PORT`, SMTP credentials, `JWT_SECRET`, `FRONTEND_URL`.
- `servers.json` – Source of truth for server metadata.

## Testing endpoints

```bash
# Health check
curl http://localhost:5003/

# Login as admin
curl -X POST http://localhost:5003/api/admin/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"secret"}'
```

Document new routes/services here whenever the API expands.
