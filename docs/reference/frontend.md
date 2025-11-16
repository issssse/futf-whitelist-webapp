# Frontend Reference

Detailed descriptions of every significant component, hook, and service.

## Core entrypoints

### `src/main.tsx`
- Imports global CSS, mounts `<App />`, registers routes via `react-router-dom`.

### `src/App.tsx`
- Wraps children with `QueryClientProvider`, tooltip + toast providers.
- Defines routes: `/`, `/login`, `/verify`, `/auth`, `/admin`, `/admin/server/:id`.

### `src/components/Navbar.tsx`
- Reads `localStorage.userId` + `adminToken` to toggle nav links.
- Provides logout utilities that clear storage and redirect.

## Pages

| Component | Highlights |
| --- | --- |
| `Home.tsx` | Fetches servers, handles OTP send/verify, displays server cards, submits appeals via `api.createAppeal`. |
| `Login.tsx` | Calls `api.login(email)` to trigger `/api/user/login`, shows success state. |
| `Verify.tsx` | Consumes token query params, calls `api.verify` or `api.verifyUpgrade`. |
| `Auth.tsx` | Posts credentials to `api.adminLogin`, stores token on success. |
| `Admin.tsx` | Loads `api.getAppeals` + `api.getServers`, approves/rejects via `api.approveAppeal`/`api.rejectAppeal`. |
| `ServerEdit.tsx` | Loads server details, toggles student rules, saves through `api.createServer`/`api.updateServer`/`api.deleteServer`. |

## Services

### `src/lib/api.ts`
Exports helper functions (Axios) for:
- `login`, `verify`, `getProfile`, `updateProfile`
- Server endpoints (`getServers`, `getServer`, `acceptRules`, `getServerStatus`, CRUD)
- OTP + appeals (`sendOtp`, `verifyOtp`, `createAppeal`, `getAppeals`, `approveAppeal`, `rejectAppeal`)
- Admin flows (`adminLogin`, `getAccessRequests`, `approveRequest`, `rejectRequest`)

### `src/lib/serverStatus.ts`
- Calls `/api/servers/:id/status` to show online/offline indicators.

## UI Toolkit

- `src/components/ui/*` contains shadcn-generated components (Button, Card, Tabs, etc.).
- Tailwind theme defined in `tailwind.config.ts` plus CSS variables in `src/index.css`.

## Storage conventions

- `localStorage.userId` persists player sessions; set on verify, cleared via logout.
- `localStorage.adminToken` stores JWT; admin views read it for API calls.
- React `useState` + `useEffect` manage form state; React Query caches data fetches where necessary.

## Testing hooks

- Run `npm run dev` and point the browser to `http://localhost:8080`.
- Use browser devtools to inspect network calls when modifying `api.ts`.

Keep this reference aligned with component changes to avoid knowledge gaps.
