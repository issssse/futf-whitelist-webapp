# Environment Setup Checklist

This page walks through preparing a workstation or server for Web2 development, testing, and deployment.

## 1. Prerequisites

| Tool | Version (min) | Purpose |
| --- | --- | --- |
| Node.js | 18+ (tested on 22) | Frontend + VitePress + Nodemon |
| npm | 9+ | Dependency manager |
| PostgreSQL | 14+ | Primary data store |
| SMTP relay | Any (MailHog in dev) | Delivers OTP and notification emails |
| Git + SSH | latest | Pull/push repo, deploy |

## 2. Clone and bootstrap

```bash
# On your workstation
git clone git@github.com:theodor/mctupp.git
cd mctupp/web2

# install dependencies for the frontend/docs
npm install

# install backend deps
cd server
npm install
```

Repeat the `npm install` step whenever `package.json` changes.

## 3. Configure environment variables

Create `web2/server/.env` with production credentials:

```ini
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=disable"
PORT=5003
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=none
SMTP_PASS=none
FRONTEND_URL=http://localhost:8080
JWT_SECRET=super-secret-string
```

> **Tip:** In production use `sslmode=require` and real SMTP credentials.

The frontend uses `vite.config.ts` to proxy `/api` calls to `process.env.VITE_API_URL`. Override it at runtime:

```bash
VITE_API_URL="http://localhost:5003" npm run dev
```

## 4. Database migrations

```bash
cd web2/server
npx prisma migrate deploy   # applies SQL from prisma/migrations
npx prisma generate         # ensures the client matches the schema
```

Seed admin users using Prisma scripts or the snippets listed in `docs/reference/backend.md`.

## 5. Run the stack locally

```bash
# Terminal 1 – API
cd web2/server
npm run dev:port  # runs nodemon on port 5003

# Terminal 2 – Frontend
cd web2
npm run dev -- --host
```

Visit `http://localhost:8080` for the React UI; API health check lives at `http://localhost:5003/`.

## 6. Build for production

```bash
# Frontend build artifact in web2/dist
npm run build

# Docs (optional)
npm run docs:build
```

Serve `dist/` via nginx/Caddy or `vite preview`. Deploy the Express server with PM2/systemd (see guide chapter 4).

## Next steps

- Read [Chapter 1 – Foundations](./guide/chapter-1-foundations.md)
- Map every file with the [reference index](./reference/file-map.md)
