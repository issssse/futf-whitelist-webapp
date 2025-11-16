# Supabase ➜ Express/PostgreSQL Migration Inventory

## 1. Project-Level Strategy
1. **Align Data Model**  
   - Map Supabase tables (`servers`, `appeals`, `email_verifications`, `user_roles`) to Prisma models (`ServerAccess`, `AccessRequest`, `User`, `Admin`) or design equivalent tables in the existing Postgres schema.  
   - Create migrations on the Express backend for any new columns (e.g., `appeal_policy`, `student_required`, `rules` arrays, notification flags).

2. **Implement/Extend Express APIs**  
   - Reuse or extend `/api/servers`, `/api/admin`, `/api/user`, `/api/public`, `/api/upgrade` routes to cover every operation the React app currently performs via Supabase queries and edge functions.  
   - Add new endpoints for OTP verification (if keeping the code/appeal workflow), server pinging, and admin email notifications.

3. **Replace Supabase Auth**  
   - Swap Supabase password login for the existing JWT admin login (`/api/admin/login`).  
   - Replace Supabase OTP verification with Express’ email verification (or build `/api/otp/send` + `/api/otp/verify` endpoints backed by Postgres tables).

4. **Rewire the React Client**  
   - Remove `@supabase/supabase-js` usage throughout the app.  
   - Point all data fetching to Axios helpers under `src/lib/api.ts` (create new methods where needed).  
   - Replace Supabase state in Navbar/Auth/Admin/Home/ServerEdit/serverStatus with data from the Express endpoints.

5. **Retire Supabase Functions**  
   - Port the Deno edge code (`send-verification-code`, `verify-code`, `ping-server`, `notify-admins-appeal`) to Express services or background jobs.  

6. **Testing & Cleanup**  
   - Regression test all user/admin flows.  
   - Remove `supabase` config folders, migrations, and dependencies once the Express versions are stable.

## 2. File-Level Conversion Plan
| File | Current Supabase Usage | Express/Postgres Replacement |
| --- | --- | --- |
| `src/components/Navbar.tsx` | Checks auth status via `supabase.auth.getSession()`/`onAuthStateChange()` and logs out with `supabase.auth.signOut()` | Store admin JWT from `/api/admin/login` in `localStorage`; derive logged-in state from token presence; call new `/api/admin/logout` or simply clear storage. |
| `src/pages/Auth.tsx` | Full Supabase password login flow (`signInWithPassword`, `getSession`, subscription) | Replace with form calling `api.adminLogin(username, password)`; on success, store token and redirect. Remove Supabase session polling. |
| `src/pages/Home.tsx` | Reads `servers`, inserts into `appeals`, uses Supabase functions for OTP send/verify and admin notifications | Fetch `servers` via `api.getServers`; submit requests via new Express endpoint (e.g., `/api/appeals` or `/api/upgrade/request`); replace OTP functions with existing `/api/user/login` & `/api/auth/verify` or new `/api/otp/*`; move admin notifications to backend (Express should email when a pending request is created). |
| `src/pages/Admin.tsx` | Uses Supabase auth to confirm admin role, queries `servers` & `appeals`, updates `appeals`, navigates to editor | Use `/api/admin/login` token to gate access; call `/api/servers` and `/api/admin/access-requests`; POST to `/api/admin/access-requests/:id/(approve|reject)`; remove Supabase role checks. |
| `src/pages/ServerEdit.tsx` | CRUD against `servers` table via Supabase | Add admin-only Express endpoints for server CRUD (extend `/api/servers` with POST/PUT/DELETE) and call them through Axios. |
| `src/lib/serverStatus.ts` | Calls `supabase.functions.invoke('ping-server')` | Add Express endpoint `/api/servers/:id/status` that runs the TCP check server-side, or move the ping logic client-side using `fetch` to a lightweight service. |
| `src/lib/api.ts` | Currently points to Express but only used by Login/Verify | Expand this helper with new methods that mirror every former Supabase operation (servers list/CRUD, appeals list/update, OTP send/verify if implemented). |
| `src/integrations/supabase/client.ts` | Instantiates Supabase browser client | Delete after migration; all data will flow through Axios/Express. |
| `supabase/functions/*` | `send-verification-code`, `verify-code`, `ping-server`, `notify-admins-appeal` | Move logic into Express controllers/services (e.g., `otp.controller.js`, `serverStatus.controller.js`, notification worker). |
| `supabase/migrations/*` & `supabase/config.toml` | Define Supabase-only tables and project ID | Remove once equivalent schema exists in Prisma/Postgres. |
| `package.json` | Depends on `@supabase/supabase-js` | Remove dependency after client code no longer imports it. |

## 3. Function-Level Conversion Checklist
Each row lists every Supabase call/function and the Express/Postgres action required.

| Location & Function | Supabase Behavior | Express/Postgres Replacement |
| --- | --- | --- |
| `Navbar.tsx`: `supabase.auth.getSession()` / `onAuthStateChange` | Tracks active Supabase session | Replace with a hook that reads admin JWT from storage and optionally pings `/api/admin/me` to validate. |
| `Navbar.tsx`: `supabase.auth.signOut()` | Ends Supabase session | Clear stored JWT and optionally hit `/api/admin/logout`. |
| `Auth.tsx`: `supabase.auth.signInWithPassword` | Authenticates admin via Supabase | Call `api.adminLogin(credentials)` to receive Express JWT; handle 401s as before. |
| `Auth.tsx`: `supabase.auth.getSession()` / `onAuthStateChange` | Redirects when Supabase session exists | Replace with check for `adminToken` and maybe a `/api/admin/me` call. |
| `Home.tsx`: `supabase.from('servers').select('*')` | Fetches server list | Call `api.getServers()` (already available) and extend backend to include new fields like `student_required`, `appeal_policy`, `contact`. |
| `Home.tsx`: `supabase.functions.invoke('send-verification-code')` | Emails OTP stored in Supabase | Either drop OTP flow and reuse existing `/api/user/login` email links, or add Express route `/api/otp/send` backed by a Postgres table storing codes. |
| `Home.tsx`: `supabase.functions.invoke('verify-code')` | Validates OTP | Same decision as above: rely on `/api/auth/verify` or add `/api/otp/verify`. |
| `Home.tsx`: `supabase.from('appeals').insert(...)` | Inserts or auto-approves access | Convert to POST `/api/upgrade/request` (existing) or new `/api/appeals` route that writes to the Prisma `AccessRequest` model. Auto-approve logic should live server-side. |
| `Home.tsx`: `supabase.functions.invoke('notify-admins-appeal')` | Emails admins via Supabase | Let the Express endpoint for appeals trigger Nodemailer notifications when status is `pending`. |
| `Admin.tsx`: `supabase.auth.getUser()` | Determines current Supabase user | Replace with `api.adminValidate(token)` or rely on stored user info from login response. |
| `Admin.tsx`: `supabase.from('user_roles').select('role')` | Confirms Supabase role = admin | No equivalent needed; Express JWT already encodes admin privileges. |
| `Admin.tsx`: `supabase.from('servers').select('*')` | Loads server list | Use `api.getServers()` (extend response to match UI). |
| `Admin.tsx`: `supabase.from('appeals').select(...).eq('status','pending')` | Fetches pending requests | Replace with GET `/api/admin/access-requests` (already exists) and ensure backend returns `server` info for UI. |
| `Admin.tsx`: `supabase.from('appeals').update({status})` | Approve/reject appeals | Call `/api/admin/access-requests/:id/(approve|reject)` (existing). Backend should also update `ServerAccess` or `User.isStudent`. |
| `ServerEdit.tsx`: `supabase.from('servers').select('*').eq('id',id)` | Loads server config | Add GET `/api/servers/:id` (already exists) plus admin fields; for new server, create default object client-side. |
| `ServerEdit.tsx`: `supabase.from('servers').upsert(serverData)` | Creates or updates server entry | Implement POST/PUT `/api/servers` endpoints restricted to admins. |
| `ServerEdit.tsx`: `supabase.from('servers').delete().eq('id', server.id)` | Deletes server record | Add DELETE `/api/servers/:id` route aligned with Prisma. |
| `serverStatus.ts`: `supabase.functions.invoke('ping-server')` | Runs TCP ping | Move ping logic into backend or a lightweight Node helper. Expose the result via `/api/servers/:id/status`. |
| Edge Function: `send-verification-code` | Uses Supabase + Resend to issue OTP | Build Express controller `otp.sendCode` that stores codes in Postgres (maybe new table) and uses Nodemailer/Resend. |
| Edge Function: `verify-code` | Confirms OTP from Supabase table | Add Express controller `otp.verifyCode` reading the same Postgres table. |
| Edge Function: `notify-admins-appeal` | Emails admins using Supabase auth/admin API | Implement Express service that queries the Prisma `Admin` table (or new config) and sends emails via Nodemailer. |
| Edge Function: `ping-server` | Deno TCP check | Reimplement in Node using `net.createConnection` or reuse existing plugin data. |
| Supabase migrations (`user_roles`, `appeals`, `servers`, `email_verifications`) | Define Supabase-only schema | Write Prisma migrations mirroring needed columns (e.g., extend `ServerAccess`, add `AppealPolicy` columns) or fold functionality into existing tables. |

## 4. Next Steps
1. Update backend schema/migrations to host all required fields and tables.  
2. Extend Express routers to expose equivalent functionality.  
3. Refactor React components to replace each Supabase import with Axios calls.  
4. Remove Supabase dependencies/files once tests confirm the Express-powered flows work end-to-end.
