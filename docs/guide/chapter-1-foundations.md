# Chapter 1 – System Foundations

This chapter explains the purpose, personas, and high-level flows of Web2.

## 1.1 Personas & goals

| Persona | Needs |
| --- | --- |
| Player | Request whitelisting, update Minecraft profile, track status |
| Admin | Review appeals, manage servers, maintain auth |
| Dev/Ops | Deploy frontend/API, manage DB/SMTP secrets, run migrations |

## 1.2 User journeys

1. **Magic link login** – player submits email, verifies OTP, sets Minecraft name.
2. **Whitelist request** – choose a server, accept rules, request student access if required.
3. **Admin review** – admin logs in, inspects pending appeals, approves or rejects.

Sequence diagram (simplified):

```
Player -> Frontend: submit email
Frontend -> API (/api/otp/send): request code
API -> SMTP: deliver OTP
Player -> Frontend: enter code
Frontend -> API (/api/otp/verify): validate
Frontend -> API (/api/appeals): submit request
Admin -> Frontend: login
Frontend -> API (/api/admin/login)
Admin -> API: approve/reject
API -> PostgreSQL: update access
```

## 1.3 Repositories & layout

```text
web2/
├─ src/                # React views, services, routing
├─ server/             # Express API + Prisma schema
├─ docs/               # VitePress documentation (this site)
├─ public/             # Static assets & fonts
├─ dist/               # Built frontend
└─ README.md           # Quick start summary
```

## 1.4 Tech stack highlights

- **Frontend**: React 18, Vite, Tailwind, shadcn/ui, Axios, Lucide icons
- **State**: Local component state + localStorage (userId/adminToken)
- **Routing**: `react-router-dom` with `/`, `/login`, `/verify`, `/admin`, `/admin/server/:id`
- **Backend**: Express 5, Prisma ORM, PostgreSQL, Nodemailer, JSON Web Tokens
- **Docs**: VitePress for static HTML + Markdown

## 1.5 Collaboration model

- Pull requests must include docs updates when relevant (`docs/` + `README.md`).
- API contract changes go through `server/routes/*` review and update the backend reference page.
- Keep `web/` (legacy Vue app) untouched during dev; deploy Web2 to a parallel location for testing.

### Next chapter

Dive into the interface details in [Chapter 2 – Frontend Experience](./chapter-2-frontend.md).
