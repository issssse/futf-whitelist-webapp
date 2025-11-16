# File & Module Map

Use this map to locate any feature quickly.

## Top-level (`web2/`)

| Path | Description |
| --- | --- |
| `src/` | React components, routes, assets |
| `server/` | Express API, Prisma schema, Nodemailer services |
| `docs/` | VitePress documentation site |
| `public/` | Fonts, favicons, hero images |
| `dist/` | Built frontend (ignored until `npm run build`) |
| `tailwind.config.ts` | Tailwind theme tokens |
| `vite.config.ts` | Vite + proxy + dev server configuration |
| `LOVABLE_WEB_REPORT.md` | Historical audit/migration notes |
| `SUPABASE_MIGRATION_PLAN.md` | Inventory of Supabase -> Express changes |

## Frontend (`src/`)

| Path | Purpose |
| --- | --- |
| `main.tsx` | React entry point + router |
| `App.tsx` | Layout shell (navbar, query provider, router outlet) |
| `components/Navbar.tsx` | Top navigation & session awareness |
| `components/ui/*` | shadcn/ui primitives |
| `lib/api.ts` | Axios HTTP client helpers |
| `lib/types.ts` | Shared TypeScript interfaces |
| `pages/Home.tsx` | Player dashboard + whitelist request flow |
| `pages/Login.tsx` | Legacy login link sender |
| `pages/Verify.tsx` | Token verification screen |
| `pages/Auth.tsx` | Admin credential login |
| `pages/Admin.tsx` | Appeal review + server list |
| `pages/ServerEdit.tsx` | Admin server editor |
| `assets/` | Hero art, logos |
| `index.css` | Global styles |

## Backend (`server/`)

| Path | Purpose |
| --- | --- |
| `server.js` | Express bootstrap + route registration |
| `routes/auth.routes.js` | Player auth + email verify |
| `routes/user.routes.js` | Profile + login links |
| `routes/server.routes.js` | Server CRUD, status, rule acceptance |
| `routes/admin.routes.js` | Admin login + approvals |
| `routes/otp.routes.js` | OTP send/verify |
| `routes/appeal.routes.js` | Appeal submission + moderation |
| `routes/public.routes.js` | Public whitelist API |
| `services/email.service.js` | Nodemailer + OTP helper |
| `services/server.service.js` | `servers.json` loader/updater |
| `servers.json` | Canonical server metadata |
| `middleware/auth.middleware.js` | JWT check for admin routes |
| `prisma/schema.prisma` | Database schema |
| `prisma/migrations/` | SQL history |

## Documentation (`docs/`)

| Path | Purpose |
| --- | --- |
| `.vitepress/config.ts` | Site navigation + theme |
| `index.md` | Landing page |
| `setup.md` | Environment checklist |
| `guide/chapter-*.md` | Five-chapter guide |
| `reference/*` | Reference library (this file + frontend/backend docs) |

Keep this map updated whenever the project layout changes.
