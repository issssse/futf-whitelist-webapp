---
title: Welcome
description: High-level tour of the FUTF Minecraft platform
---

# Web2 Platform Overview

Welcome to **Web2**, the modernised whitelist and server management portal for FUTF Minecraft. This documentation hub covers every layer of the stack—from the Vue-inspired React interface to the Express/Prisma API and operational playbooks.

Use this page as the launchpad for:

- ✅ **Architecture orientation** (stacks, directories, services)
- ✅ **How-to guides** for onboarding, administering, and extending the tool
- ✅ **Reference docs** that describe every route, component, and configuration file

## Quick links

- [Environment setup](./setup.md)
- [Five-chapter product guide](./guide/chapter-1-foundations.md)
- [Backend reference](./reference/backend.md)
- [Frontend reference](./reference/frontend.md)

## High-level architecture

| Layer | Tech | Notes |
| --- | --- | --- |
| Frontend | React 18 + Vite + Tailwind + shadcn/ui | Located in `web2/src`. Handles user login, whitelist requests, dashboards, and admin UI. |
| API | Express 5 with Prisma + PostgreSQL | Lives in `web2/server`. Exposes `/api` routes for auth, user management, servers, OTP, appeals, admin actions, and public hooks. |
| Database | PostgreSQL via Prisma schema | Tables for `User`, `ServerAccess`, `AccessRequest`, `Admin`, `EmailVerification`, and `Appeal`. |
| Docs | VitePress static site (this repo) | Build with `npm run docs:build`, host alongside the app, or deploy to static hosting. |

## Documentation conventions

- **File paths** are relative to the `web2` root unless stated otherwise.
- Code fences include the canonical module path so you can jump straight to the source.
- Every page lists “Next steps” to encourage exploration.

Happy shipping! 🎉
