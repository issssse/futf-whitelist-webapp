# Chapter 2 – Frontend Experience

This chapter documents the React client, routing, and UI contracts.

## 2.1 Routing map

| Path | Component | Purpose |
| --- | --- | --- |
| `/` | `src/pages/Home.tsx` | Combined player dashboard + request form |
| `/login` | `src/pages/Login.tsx` | Magic-link entry form |
| `/verify` | `src/pages/Verify.tsx` | Handles token-based verification (legacy) |
| `/auth` | `src/pages/Auth.tsx` | Admin credential login |
| `/admin` | `src/pages/Admin.tsx` | Pending appeals + server list |
| `/admin/server/:id` | `src/pages/ServerEdit.tsx` | Server configuration CRUD |

## 2.2 Shared components

- `Navbar.tsx`: displays nav links based on `localStorage` state (`userId`, `adminToken`).
- `App.tsx`: wraps routes with React Query, tooltips, toast providers.
- `src/services/api.ts`: Axios wrapper for all `/api` endpoints (servers, OTP, appeals, admin, etc.).

## 2.3 State & storage

| Key | Owner | Used for |
| --- | --- | --- |
| `localStorage.userId` | Player | Maintains logged-in user session |
| `localStorage.adminToken` | Admin | Stores JWT for admin routes |
| React state | Pages/components | Forms, rule acceptance, server selections |

## 2.4 Styling

- Global CSS lives in `src/index.css` with the Minecraft palette.
- shadcn/ui components supply consistent cards, buttons, tabs, forms.
- Lucide icons provide UI affordances (`Server`, `Shield`, etc.).

## 2.5 Network layer

- All HTTP calls go through Axios (`src/lib/api.ts`).
- Vite dev server proxies `/api` to the Express port; adjust via `VITE_API_URL`.
- React Query (TanStack) caches requests where needed (currently for profile/servers).

## 2.6 Component responsibilities

- **Home** – orchestrates server fetch, OTP verification, rule acceptance, request submissions.
- **Login** – sends login emails through `/api/user/login` (legacy support).
- **Auth** – posts credentials to `/api/admin/login`, stores token, redirects.
- **Admin** – fetches `/api/appeals` + `/api/servers`, approves/rejects requests, opens server editor.
- **ServerEdit** – loads single server config, toggles student requirements, saves to `/api/servers` (POST/PUT/DELETE).

## 2.7 Extensibility tips

- Use `src/lib/api.ts` as the single source for new endpoints; mirror backend changes there.
- Keep translations/labels in components for now; consider extracting to a `locales` file if multi-lingual support is planned.
- For global state (e.g., notifications), add React Query caches or context providers rather than prop drilling.

### Next chapter

Inspect the Express API and database in [Chapter 3 – Backend Services](./chapter-3-backend.md).
