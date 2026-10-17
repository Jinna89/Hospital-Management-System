# 🏥 Hospital & Doctor Management System

A production-oriented **backend REST API** for real hospital operations — not a CRUD demo. Patients discover doctors, book and pay for appointments online, attend consultations, and manage their medical history. Doctors run their schedules and consultations. Admins run the hospital.

Built around the problems that actually break naive implementations: **preventing double-booked appointment slots under concurrent requests**, **never trusting client-supplied payment amounts**, **strict role-based access control**, and **append-only audit logging** for every sensitive action.

> 📌 **Status:** Core architecture, database schema, and the Authentication module are implemented and working. Every other module (Doctors, Appointments, Payments, etc.) is scaffolded and API-documented but pending business-logic implementation — see [Implementation Status](#-implementation-status) below.

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Database Design](#-database-design)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
- [Project Structure](#-project-structure)
- [Implementation Status](#-implementation-status)
- [Roadmap](#-roadmap)
- [Security Notes](#-security-notes)

---

## 🎯 Overview

| | |
|---|---|
| **Category** | Healthcare / Hospital Operations |
| **Type** | Backend REST API |
| **Roles** | Patient · Doctor · Admin |
| **API Base Path** | `/api/v1` |
| **Response Format** | `{ success, message, data }` on every endpoint, no exceptions |

The system models the full patient journey — register → search doctors → view availability → book → pay online → check in → consult → receive prescription / lab request → follow-up → medical history — and gives hospital staff the tools to run departments, doctors, payments, and policy behind it.

---

## ✨ Features

### 👤 Patient
- Register / login, manage profile
- Search & filter doctors by department, specialty, fee, experience
- View real-time doctor availability (computed dynamically from schedule, breaks, leave, and existing bookings)
- Book appointments and pay online via **SSLCommerz**
- Cancel / reschedule under configurable business rules
- View consultation history, prescriptions, lab reports, invoices, and payment history
- Receive notifications for booking, payment, and appointment events

### 🩺 Doctor
- Manage professional profile and weekly recurring schedule
- Define breaks, leave, and holidays
- View assigned appointments and manage consultation state (check-in → in progress → completed)
- Record chief complaint, symptoms, diagnosis, clinical notes, treatment plan, follow-up date
- Create prescriptions and request lab tests
- View authorized patient medical history
- **Cannot** access user management, global payments, roles, hospitals, or audit logs — enforced at the middleware level, not just the UI

### 🛡️ Admin
- Manage users, doctors, patients, departments
- Verify / reject doctor applications (`PENDING → VERIFIED/REJECTED`)
- Manage appointment policy, view and moderate all appointments
- Manage payment records and view revenue analytics
- View append-only audit logs of every sensitive action
- Suspend / reactivate accounts
- Dashboard: total patients/doctors/appointments, today's & monthly appointments, monthly revenue, payment success rate, department & doctor performance

### ⚙️ System-level
- **Double-booking prevention** enforced at the database layer (unique constraint + transaction), not just application logic
- **Server-side payment amounts** — a client can never declare its own price or its own "success"; SSLCommerz payments are independently re-verified server-side
- **Controlled state machines** for appointments (`PENDING_PAYMENT → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED`, with `CANCELLED`/`NO_SHOW`/`RESCHEDULED` branches) — invalid transitions like `COMPLETED → PENDING_PAYMENT` are rejected
- **Append-only audit trail** for admin verifications, suspensions, prescriptions, status changes, and payment events
- **Soft delete** on entities that must preserve history (Doctor, Patient, Department, Medicine, Lab Test)
- Rate limiting on auth, payment, and booking endpoints
- Structured validation errors on every `POST`/`PATCH` via Zod

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Validation | Zod |
| Auth | JWT (access + rotating refresh tokens) |
| Password Hashing | Argon2id |
| File Uploads | Multer + Cloudinary |
| Email | Nodemailer |
| Payments | SSLCommerz |
| Security | Helmet, CORS, express-rate-limit |
| Testing | Vitest |

No Redis or message broker required — rate limiting uses an in-memory store, which is sufficient for a single-instance deployment.

---

## 🏗 Architecture

**Controller → Service → Prisma.** Business logic never lives in route handlers.

```
Request
  │
  ▼
Middleware (Helmet, CORS, rate limit)
  │
  ▼
requireAuth() ──▶ requireRole('DOCTOR' | 'PATIENT' | 'ADMIN')
  │
  ▼
validate(zodSchema)
  │
  ▼
Controller (thin — parses req, calls service, sends standard response)
  │
  ▼
Service (business logic, Prisma transactions, audit logging)
  │
  ▼
Prisma → PostgreSQL
```

Every error — thrown `AppError`, Zod validation failure, or Prisma constraint violation (e.g. a losing race on a double-booked slot) — flows through one centralized error handler and comes out in the same `{ success: false, message, errors }` shape.

---

## 🗄 Database Design

Modeled in Prisma across 20 entities: `User`, `Patient`, `Doctor`, `Department`, `DoctorSchedule`, `DoctorLeave`, `Appointment`, `AppointmentStatusHistory`, `Consultation`, `Prescription`, `PrescriptionItem`, `Medicine`, `LabTest`, `LabTestRequest`, `LabResult`, `Payment`, `Notification`, `AuditLog`, `RefreshToken`, `DoctorDepartment`.

Key decisions:
- **Roles as an enum**, not a dynamic table — the system has exactly 3 fixed roles by design
- **`@@unique([doctorId, appointmentDate, startTime])`** on `Appointment` — the database itself refuses two bookings for the same slot, regardless of application-level checks
- **Payment amount is a server-side snapshot** of the doctor's fee at booking time, never trusted from the client
- **Refresh tokens stored hashed**, with rotation on every use and a `revokedAt` field for logout/compromise handling
- Composite indexes on the query patterns that matter: `(doctorId, appointmentDate)`, `(entityType, entityId)` on audit logs, etc.

---

## 🚀 Getting Started

```bash
git clone <https://github.com/Jinna89/Hospital-Doctor-Management-System>
cd hospital-management-system

cp .env.example .env      # fill in real values — see below
npm install

npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed        # departments, an admin, and a sample verified doctor

npm run dev                # http://localhost:5000
```

Health check: `GET /health`

Seed credentials (⚠️ change immediately outside local dev):
| Role | Email | Password |
|---|---|---|
| Admin | `admin@hospital.test` | `Admin@12345` |
| Doctor | `dr.rahman@hospital.test` | `Doctor@12345` |
| Patient | `demo.patient@medicare-hms.test` | `DemoPatient@123` |

Production build:
```bash
npm run build
npm start
```

Quality checks (run before every commit):
```bash
npm run typecheck      # tsc --noEmit
npm run lint           # ESLint
npm run format:check   # Prettier
npm test               # Vitest integration suite (embedded Postgres, no setup needed)
```

---

## 🔑 Environment Variables

See `.env.example` for the full list with placeholders. Required at minimum:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Token signing secrets (long random strings) |
| `CLOUDINARY_*` | File uploads (doctor images, lab reports) |
| `SSLCOMMERZ_*` | Payment gateway credentials |
| `SMTP_*` | Email notifications |

Never commit `.env`. Only `.env.example` (placeholders) belongs in version control.

---

## 📬 API Documentation

A full Postman collection lives in [`postman/`](./Postman) — **42 documented endpoints** across Auth, Profile, Doctors, Doctor Schedule, Appointments, Consultation, Prescription, Laboratory, Payments, and Admin, each with method, auth/role requirements, params, request body, validation rules, and example success + error responses.

```bash
Postman → Import → postman/Hospital-Management-System.postman_collection.json
                 → postman/Hospital-Management-System.postman_environment.json
```

Run **Authentication → Register/Login** first — the collection auto-saves your access/refresh tokens so every other request just works.

All endpoints are versioned under `/api/v1` and follow one response contract:

```jsonc
// Success
{ "success": true, "message": "Operation successful", "data": {} }

// Error
{ "success": false, "message": "Something went wrong", "errors": [] }
```

---

## 📁 Project Structure

```
src/
├── app.ts / server.ts
├── config/            # env validation, Prisma client, (no Redis)
├── middlewares/        # auth, role, validation, rate-limit, error handling
├── modules/<name>/
│   ├── <name>.routes.ts
│   ├── <name>.controller.ts
│   ├── <name>.service.ts
│   └── <name>.validation.ts
├── utils/              # AppError, standard response, jwt, password hashing
└── routes/index.ts     # mounts every module under /api/v1
prisma/
├── schema.prisma
└── seed.ts
postman/                # Postman collection + environment
```

---

## ✅ Implementation Status

| Module | Status |
|---|---|
| Database schema (Prisma) | ✅ Complete |
| Auth (register/login/refresh/logout) | ✅ Complete |
| RBAC middleware | ✅ Complete |
| Doctors / Departments | 🟡 Scaffolded, API-documented |
| Doctor Scheduling & Slot Booking | 🟡 Scaffolded, API-documented |
| Appointments | 🟡 Scaffolded, API-documented |
| Consultations / Prescriptions | 🟡 Scaffolded, API-documented |
| Laboratory | 🟡 Scaffolded, API-documented |
| Payments (SSLCommerz) | 🟡 Scaffolded, API-documented |
| Notifications | 🟡 Scaffolded, API-documented |
| Admin Analytics / Audit Logs | 🟡 Scaffolded, API-documented |

🟡 = route is mounted, RBAC-gated, and returns a placeholder response; the Postman collection documents its intended contract.

---

## 🗺 Roadmap

1. Doctor scheduling & slot generation + double-booking-safe booking transaction
2. SSLCommerz payment flow (initiate → gateway → verify → confirm, idempotent callbacks)
3. Consultation → Prescription → Lab Test workflow
4. Admin management actions + audit log writes
5. Analytics & aggregation queries
6. Notifications
7. Automated tests, especially concurrent-booking race conditions

---

## 🔒 Security Notes

- Passwords hashed with **Argon2id**, never stored or logged in plaintext
- Refresh tokens stored **hashed**, rotated on every use, revocable
- `requireAuth()` re-checks account status on every request — a suspended account stops working immediately, not just after token expiry
- Payment amounts and appointment fees are always server-derived, never client-supplied
- Structured, consistent error responses — no leaking stack traces in production

---
