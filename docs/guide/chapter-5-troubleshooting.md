# Chapter 5 – Troubleshoot & Extend

This chapter provides diagnostics for common issues and guidance for extending the platform.

## 5.1 Frequent issues

| Symptom | Cause | Fix |
| --- | --- | --- |
| `PrismaClientInitializationError: Can't reach database` | Wrong `DATABASE_URL` or firewall | Verify `.env`, check VPN/tunnel, run `psql` test |
| OTP emails not sending | SMTP misconfigured or dev JSON transport | Set `SMTP_HOST`, ensure server reachable, watch API logs |
| Admin login returns 500 | Admin table empty or DB offline | Seed admin via Prisma script, restart API |
| Frontend cannot hit `/api` | Proxy port mismatch | Update `vite.config.ts` or set `VITE_API_URL` |
| Server list missing updates | DB transaction failed | Check `pm2 logs web2-api-staging` for Prisma errors, rerun the action |

## 5.2 Debug commands

```bash
# Tail API logs
pm2 logs web2-api

# Inspect Prisma migrations
npx prisma migrate status

# Verify admin exists
npx prisma studio
```

## 5.3 Extending functionality

1. **Add new API endpoint**
   - Define route under `server/routes/*`
   - Expose Prisma logic via services module if reusable
   - Document endpoint in `docs/reference/backend.md`
   - Add Axios helper + React UI usage

2. **Add new server fields**
   - Update the `ServerConfig` table (Prisma)
   - Adjust `Server` interface in `src/lib/types.ts`
   - Reflect changes in Admin editor and Home page

3. **New documentation**
   - Author Markdown page within `docs/`
   - Update `.vitepress/config.ts` navigation
   - Run `npm run docs:build`

## 5.4 Support workflow

- Collect logs + steps to reproduce
- File GitHub issue with environment details
- Update this chapter with solved incidents to create a living troubleshooting guide

### Next steps

- Dive into [Reference docs](../reference/file-map.md)
- Keep README + SUPABASE migration docs in sync
- Share improvements via PR so the entire team benefits
