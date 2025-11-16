# Lovable-Web Architecture & Integration Report

## 1. High-Level Overview
- **Framework & Tooling**: Vite + React 18 with TypeScript, TanStack Query, shadcn/ui, Tailwind CSS, and Lucide icons (`lovable-web/package.json`). The app bootstraps in `src/App.tsx`, wrapping the router with QueryClient and tooltip/toast providers.
- **Routing**: React Router exposes `/`, `/auth`, `/verify`, `/admin`, `/admin/server/:id`, and a wildcard 404 (`lovable-web/src/App.tsx`). The Vite dev server proxies `/api` to `VITE_API_URL` (default `http://localhost:5002`) for backwards compatibility with the legacy Express backend (`lovable-web/vite.config.ts`).
- **State & Styling**: Tailwind tokens are defined in `src/index.css`, giving a Minecraft-styled palette and custom fonts. Toasts use both shadcn’s native toaster and `sonner`.
- **Data Source**: Unlike the original `web` project, Lovable-Web stores everything in a Supabase project (`lovable-web/supabase/config.toml`). Tables are defined via migrations under `supabase/migrations`, and custom Deno edge functions live in `supabase/functions`.

## 2. Supabase Schema & Functions
### 2.1 Tables & Enums
- `user_roles` + enum `app_role` implementing RBAC; RLS allows users to view their roles and admins to manage them (`20251115000050_583da6a1...sql`).
- `servers`: configuration table (id, name, description, ip, `student_required`, `appeal_policy`, `required_email_domain`, `contact`, `rules`, timestamps). RLS: public read, admins manage (`same migration`).
- `appeals`: whitelist requests (server_id FK, user_email, minecraft_username, real_name, student_email, reason, status, reviewer metadata, timestamps). RLS lets anyone insert/view, admins manage (`20251115002532_0726332c...sql`).
- `email_verifications`: OTP codes with expiration, verification flag, indexes, RLS allowing anyone to insert/read their rows (`20251115010029_d3d41477...sql`).

### 2.2 Edge Functions
- `send-verification-code`: Generates 6-digit OTP, stores in `email_verifications`, and emails via Resend (`supabase/functions/send-verification-code`).
- `verify-code`: Validates OTPs and marks them verified (`supabase/functions/verify-code`).
- `ping-server`: TCP check for Minecraft server liveness, returning `{ online: boolean }` (`supabase/functions/ping-server`).
- `notify-admins-appeal`: Looks up all admin users via `user_roles`, fetches their emails from Supabase auth, and emails them via Resend about new appeals (`supabase/functions/notify-admins-appeal`).

## 3. React Components & Flows
### 3.1 Navbar
- Observes Supabase auth state (`supabase.auth.onAuthStateChange`) to toggle between “Admin” link and full admin controls with logout (`src/components/Navbar.tsx`).

### 3.2 Home Page (`/`)
- Pulls `servers` from Supabase, sorts “Survival” first, and renders each as a tabbed card with IP, rules, and requirements (`src/pages/Home.tsx`).
- Pings each server via `checkServerStatus`, which calls the `ping-server` edge function (`src/lib/serverStatus.ts`).
- Email verification uses OTP codes: “Send Code” → `send-verification-code`; “Verify Code” → `verify-code`. Only after `emailVerified` is true can the whitelist form submit.
- Submitting inserts into `appeals` with derived fields (`student_email`, `status`). If the user lacks automatic access, the frontend invokes `notify-admins-appeal`.
- No persistent user profile exists; every submission is a new row keyed by email/Minecraft name.

### 3.3 Admin Dashboard (`/admin`)
- Confirms the current Supabase user has `role = admin` in `user_roles`. If not, shows an access-required card linking to `/auth`.
- Lists pending appeals with collapsible detail views. Approve/Reject buttons update `appeals` status and stamp reviewer metadata, then reload data.
- Server management section lists all servers with quick “Edit” buttons (`/admin/server/:id`).

### 3.4 Server Editor (`/admin/server/:id`)
- Fetches one server or scaffolds a new record. Admin can edit name, description, IP, `student_required`, `appeal_policy`, contact, and line-separated rules. Saves via Supabase `upsert`, delete via `delete`, with toasts for feedback.

### 3.5 Auth & Verify Pages
- `/auth`: Supabase password login form using `supabase.auth.signInWithPassword`. When a session exists, auto-redirects to `/admin`.
- `/verify`: **Still uses the legacy Express API** via `lib/api.ts`. It calls `/api/auth/verify?token=` or `/api/upgrade/verify?token=` and stores `userId` in `localStorage`.
- `/login`: Present but unused; it triggers the old `/api/user/login` magic-link flow.

### 3.6 Utilities
- `lib/api.ts`: Axios client for the Express `/api` routes (login, profile, server access, admin actions). Currently only `Login` and `Verify` import it; the rest of the app ignores it.
- `hooks/use-toast.ts`: Custom toast store used across pages.
- `hooks/use-mobile.tsx`: Media-query hook to detect mobile layouts.

## 4. End-to-End User Journeys
1. **Whitelist Request**
   - User selects a server, sends/enters an OTP (Supabase function), verifies email, fills in Minecraft name + real name + notes, accepts rules, and submits.
   - Insert into `appeals`. When `student_required` and `required_email_domain` criteria are met, status auto-approves; otherwise it remains pending and triggers admin emails.
   - There is no integration with the original `/api/servers/:id/accept-rules` endpoint or `ServerAccess` records.
2. **Admin Review**
   - Admin logs in via Supabase on `/auth` (Supabase password-based).
   - `/admin` loads servers + appeals, allows approvals/rejections, and edits server metadata directly in Supabase.
3. **Server Status & Notifications**
   - Client polls `ping-server` function to display online/offline badges.
   - `notify-admins-appeal` emails all Supabase admins when a review is required.

## 5. Comparison with Original `web` Project
| Area | `web` (Vue + Express + Prisma) | `lovable-web` (React + Supabase) |
| --- | --- | --- |
| **Data Storage** | PostgreSQL via Prisma models (`User`, `ServerAccess`, `AccessRequest`, `Admin`) | Supabase tables (`servers`, `appeals`, `email_verifications`, `user_roles`) |
| **Auth** | Node email verification & JWT admin login | Supabase OTP codes + Supabase password auth |
| **Whitelist Grant** | `/api/servers/:id/accept-rules` creates `ServerAccess` rows consumed by plugins | Inserting into `appeals` table only; no `serverAccess` equivalent or plugin integration |
| **Admin Tools** | `/api/admin/*` with JWT + Express middleware | Direct Supabase queries with RBAC + Supabase auth |
| **Public APIs** | `/api/public/*` for in-game checks | None; any plugin would need Supabase access or new REST endpoints |
| **Verification Flow** | Email tokens stored in `User.verificationToken` | OTP codes in `email_verifications`, totally separate from Express |

## 6. Biggest Hurdles to Make Lovable-Web Work with Existing Backend/Plugins
1. **Data Source Divergence**: Lovable-Web writes to Supabase tables, but the production backend and Minecraft plugins read the Prisma-managed Postgres schema. Without migrating the backend to Supabase (or vice versa), approved appeals never propagate to actual whitelists.
2. **Auth Incompatibility**: Supabase sessions aren’t recognized by the Express admin APIs. React’s `lib/api.ts` calls expect JWTs from `/api/admin/login`, but the UI never obtains them. Similarly, OTP verification in Supabase doesn’t satisfy `/api/auth/verify`.
3. **Missing `serverAccess` Flow**: There’s no component that calls `/api/servers/:id/accept-rules` or records rule acceptance, so external consumers (plugins, `/api/public/check-whitelist`) have nothing to read.
4. **Edge Dependencies**: The new flow relies on Supabase edge functions and the Resend API; these services aren’t configured or referenced in the old stack.
5. **Partial Legacy Usage**: The Verify and Login pages still call the Express API, so the app mixes two incompatible auth systems. Deciding on one source of truth is necessary before shipping.

## 7. Recommendations Before Adoption
1. **Choose a Single Backend**: Either migrate the Express backend to Supabase (recreating `/api` endpoints and plugin data there) or refactor Lovable-Web to reuse the existing `/api` endpoints instead of hitting Supabase directly.
2. **Bridge Whitelist Data**: Implement a service that converts approved `appeals` into the same `ServerAccess` records the plugins need—or redesign the plugins to query Supabase.
3. **Align Verification**: Ensure the verification emails/links generated by the frontend correspond to whichever backend handles auth. If sticking with Supabase OTP, drop the legacy `/api/auth/verify` flow entirely.
4. **Sync Admin Auth**: Supabase RBAC and Express JWTs need to converge. Consider replacing the Node `Admin` table with Supabase auth so both UIs use the same credentials.
5. **Document Environment Needs**: Supabase URL/key, service role key for edge functions, and Resend API key must be documented for deployment.
