# Port Usage – 18 Nov 2025

Based on `ss -tulpn` (run inside `/code/isacc/web2`) and `pm2 describe …` for each long‑running process.

| Port | Purpose | Managed by |
| --- | --- | --- |
| 9443 / 9080 | Traefik public HTTPS/HTTP entrypoints (`/opt/deployment/traefik/config/traefik.yml`) | systemd/Traefik |
| 80 / 443 | Traefik VPN entrypoints (`securetuppdev-web`/`securetuppdev`) | systemd/Traefik |
| 1025‑1027 | Mail relays (`securetuppdev.futf.se` MailHog instances) | systemd |
| 5432 | PostgreSQL (`securetuppdev.futf.se:5432`) | managed service |
| 5001 | `mc-front` (old Vue dev server at `/code/theodor/mc/web/client`) | pm2 process `mc-front` |
| 5002 | `mc-back` (old Express API at `/code/theodor/mc/web/server`) | pm2 process `mc-back` |
| 5003 | Loopback listener (Legacy dev API; bound on 127.0.0.1) – confirm before reuse | owner of local dev shell |
| 5004 | `database` (Postgres manager UI `/code/theodor/database/postgres-manager`, `npm run start -- --port 5004`) | pm2 process `database` |
| 5010 | `forms-dev-front` (`/code/theodor/forms/form-creator`, `npm run dev -- -p 5010`) | pm2 process `forms-dev-front` |
| 5011 | `forms-dev-back` (`/code/theodor/forms/backend`, `node dist/index.js`) | pm2 process `forms-dev-back` |
| 5020 | `arb` (`/code/theodor/arb2/arb`, `npm run start -- --port 5020`) | pm2 process `arb` |
| 5030 | `alumn` (`/code/theodor/alum_payment/alumn-ticket`, `npm run dev -- --port 5030`) | pm2 process `alumn` |
| 5041 | `tefat` (`/code/theodor/tefat`, `pnpm run dev --port 5041`) | pm2 process `tefat` |
| 5050 | `styrdokumentdiff` (`/code/theodor/styrdokumentdiff`, `npm run dev -- --port 5050`) | pm2 process `styrdokumentdiff` |
| 5050s entrypoints | Traefik metrics (`:8082`) and SSH (`:22`) also visible in `ss` output | system services |
| 5101 | **New** `web2-front-staging` (Express static server + API proxy) | pm2 process `web2-front-staging` |
| 5102 | **New** `web2-api-staging` (Express/Prisma API from `/code/isacc/web2/server`) | pm2 process `web2-api-staging` |

Use `pm2 ls` + `pm2 describe <name>` whenever you need to confirm ownership before reassigning a port. `Traefik` expects to talk to services on the `tuppdev.local` hostname, so any production move must expose the desired port there.
