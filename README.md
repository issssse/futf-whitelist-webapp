# Web2 – FUTF Minecraft Whitelist Platform

Web2 is the next-generation portal for managing FUTF Minecraft servers. It pairs a React + Vite frontend with an Express/Prisma backend and now ships with a full VitePress documentation site.

## Feature snapshot

- 🎮 Player dashboard for submitting whitelist/student appeals
- 🧠 OTP-based email verification + legacy magic links
- 🛡️ Admin console with appeal moderation and server CRUD
- 💾 Prisma/PostgreSQL data model with migrations
- 📚 Comprehensive docs (`docs/`) covering setup, guides, and references

## Quick start

```bash
# frontend + docs deps
npm install

# backend deps
cd server
npm install

# prisma
npx prisma generate
npx prisma migrate deploy
```

Copy `server/.env.example` (or create `.env`) with your DB+SMTP credentials, then run:

```bash
# terminal 1 – API (defaults to port 5003)
cd server
npm run dev:port

# terminal 2 – frontend (port 8080)
cd ..
npm run dev -- --host
```

Visit `http://localhost:8080`. The dev server proxies `/api` to `http://localhost:5003` (configurable via `VITE_API_URL`).

## Documentation

We ship VitePress docs under `web2/docs`.

```bash
npm run docs:dev    # live preview
npm run docs:build  # static HTML in docs/.vitepress/dist
```

Docs structure:

- `index.md` – overview
- `setup.md` – environment checklist
- `guide/chapter-*.md` – five-chapter narrative
- `reference/*.md` – file map, frontend/backend references

## Scripts

| Command                       | Description                         |
| ----------------------------- | ----------------------------------- |
| `npm run dev`                 | Vite dev server (frontend)          |
| `npm run build`               | Production frontend build           |
| `npm run docs:*`              | VitePress docs (dev/build/serve)    |
| `npm run dev:port` *(server)* | Nodemon Express server on port 5003 |
| `npm run serve:prod`          | Static build + proxy server (port via `FRONTEND_PORT`) |

## Deploying

1. Build frontend: `npm run build`
2. Copy `dist/` to your web host or serve via nginx.
3. Deploy Express API (e.g., PM2, systemd). Use `PORT` env var.
4. Keep `servers.json` and Prisma migrations under version control.

## Useful references

- [Documentation home](docs/index.md)

Happy crafting! 🛠️
