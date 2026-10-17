# MediCare HMS — Frontend

A production-style frontend for the Hospital & Doctor Management System, built with
Next.js 15 (App Router) and TypeScript against the real deployed backend at
`https://hospital-doctor-management-system.vercel.app/api/v1`.

## Tech stack

| Concern        | Choice                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | Next.js 15 (App Router), React 19, TypeScript (strict, no `any`)                                                                        |
| Styling / UI   | Tailwind CSS v4, hand-built shadcn/ui-style primitives on Radix UI                                                                      |
| Server state   | TanStack Query                                                                                                                          |
| Client state   | Zustand (`persist`), paired with a readable `hms_role` cookie so `middleware.ts` can gate routes (middleware can't read `localStorage`) |
| Forms          | React Hook Form + Zod                                                                                                                   |
| Auth           | Custom JWT (access + refresh) issued by the backend, Bearer-injected via an Axios interceptor with de-duplicated refresh-on-401         |
| Payments       | SSLCommerz (Test Mode) — real redirect-based initiate → gateway → success/cancel flow, no simulated payments                            |
| Charts         | Recharts                                                                                                                                |
| Icons / toasts | Lucide React, Sonner                                                                                                                    |

## Getting started

```bash
npm install
cp .env.example .env.local   # already points at the deployed backend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build       # production build + type check
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit only, no build output
npm run format      # Prettier (write)
npm run check       # lint + typecheck + format check, the pre-commit gate
```

## Demo accounts (one-click login)

The login page (`/login`) has a **Quick Demo Login** section with one button per role,
in addition to a normal email/password form. Each button signs in with real,
working credentials against the live backend and redirects to that role's
dashboard — no typing required for evaluation.

| Role    | Email                            | Password          | Notes                                                                                                                                                                       |
| ------- | -------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admin   | `admin@hospital.test`            | `Admin@12345`     | Seeded by the backend's `prisma/seed.ts`                                                                                                                                    |
| Doctor  | `dr.rahman@hospital.test`        | `Doctor@12345`    | Seeded by the backend's `prisma/seed.ts`                                                                                                                                    |
| Patient | `demo.patient@medicare-hms.test` | `DemoPatient@123` | Not pre-seeded — the Patient demo button self-heals: it tries to log in, and registers this account on the fly the first time it's clicked (see `src/lib/demo-accounts.ts`) |

## Roles & route protection

Three fixed roles — **Patient**, **Doctor**, **Admin** — each with their own dashboard
under `/patient`, `/doctor`, `/admin`. Protection is enforced at two levels:

- **Route level** — `src/middleware.ts` reads the `hms_role` cookie (set alongside the
  JWTs on login/register) and redirects unauthenticated visitors to `/login`, and
  wrong-role visitors to their own dashboard.
- **UI level** — the site header, dashboard sidebars and page content render
  conditionally based on `useAuth().user.role` / `hasRole()`, not just the route guard.

## Pages

**Public (6):** Home, About, Services, Pricing, FAQ, Contact
**Auth (2):** Login (with one-click demo login), Register
**Admin dashboard (4):** Overview & analytics (charts), Manage users & doctor
verification (CRUD-style, filtered, paginated), Reports & audit logs, Profile
**Patient dashboard (9):** My activity, Find a doctor (URL-synced search/filter),
Doctor detail & booking, Appointments (list + detail with cancel/reschedule/pay),
Prescriptions (list + detail), Lab reports, Payment history, Profile
**Doctor dashboard (5):** My tasks, Consultation workflow (multi-step: complaint →
diagnosis → prescription → lab request), Schedule & leave, Earnings & analytics
(charts), Profile & availability
**Payment (2):** Success redirect, Cancel redirect
**Shared/utility (3):** Global `loading.tsx`, `error.tsx` boundary, `not-found.tsx`

All filtering, sorting, search and pagination across list views (doctor search,
appointments, users, audit logs) is synced to the URL via `useSearchParams`, so
views are bookmarkable and shareable.

## Payments

Booking an appointment creates it in `PENDING_PAYMENT` status, then redirects the
patient through a real SSLCommerz (Test Mode) payment: `POST /payments/initiate`
returns a gateway URL, the browser is sent there to complete payment, and
SSLCommerz redirects back to `/payment/success` or `/payment/cancel`, which verify
the final status via `GET /payments/:id`. There is no Cash-on-Delivery option and
no manual "mark as paid" button anywhere in the app.

## Known limitation

This was built and type-checked in a sandboxed environment whose outbound network
policy blocks the deployed backend host, so live API responses could not be
verified from inside that environment. Every request is built strictly against the
documented backend contract (matching the Postman collection from the backend
project) and the app builds and lints cleanly; it should be verified against the
live backend once deployed or run locally with network access.

## Project structure

```
src/
  app/            routes (public, auth, admin, doctor, patient, payment)
  components/
    ui/           shadcn-style primitives (button, input, form, table, ...)
    shared/       DataTable, StatCard, StatusBadge, SearchInput, PageHeader, ...
    layout/       SiteHeader, SiteFooter, DashboardShell
  hooks/          useAuth, useDebounce, usePagination, useQueryState
  lib/
    api/          typed service functions per backend resource
    api-client.ts Axios instance + auth refresh interceptor
    demo-accounts.ts  one-click demo login credentials + self-healing patient login
  store/          Zustand auth store
  types/          API contract types
```
