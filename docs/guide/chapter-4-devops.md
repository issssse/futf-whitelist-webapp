# Chapter 4 – Deploy & Operate

This chapter covers automation, hosting, and observability.

## 4.1 Build artifacts

- `npm run build` → `web2/dist` (static frontend)
- `npm run docs:build` → `web2/docs/.vitepress/dist` (optional docs)
- Express API runs directly from `web2/server` with Node 18+

## 4.2 Deployment checklists

### Frontend

1. `npm ci && npm run build`
2. Upload `dist/` to nginx root or S3/CloudFront
3. Configure reverse proxy to forward `/api` to backend port (e.g., 5003)

### Backend

1. `cd web2/server && npm ci`
2. `npx prisma migrate deploy`
3. `pm2 start server.js --name web2-api --watch --env production` (or systemd)
4. Rotate `.env` secrets via Vault/Ansible when needed

## 4.3 Environment matrix

| Env | URL | Notes |
| --- | --- | --- |
| Local dev | `http://localhost:8080` | Vite dev + nodemon |
| Staging | `http://staging.tuppdev.futf.se` | Deploy preview; shares staging DB |
| Production | `https://mc.tuppdev.futf.se` | Live traffic |

Set `VITE_API_URL` per environment to ensure frontend proxies the correct API.

## 4.4 Logs & monitoring

- API logging via nodemon/PM2; forward to journald or ELK.
- Prisma errors surface in `server/logs` (or stdout). Configure Sentry if needed.
- Frontend exceptions captured by browser console; consider adding Sentry JS.

## 4.5 Backups & migrations

- Use `pg_dump` nightly; store in secure bucket.
- Keep migration history in Git (`server/prisma/migrations`).
- Snapshot `servers.json` before editing via Admin UI in production.

## 4.6 Zero-downtime tips

- Run `npm run build` + `pm2 reload web2-api` to swap code without downtime.
- Serve docs from CDN to avoid coupling to app releases.
- Use feature flags via `.env` or remote config when rolling out risky features.

### Next chapter

Troubleshoot common issues in [Chapter 5 – Troubleshoot & Extend](./chapter-5-troubleshooting.md).
