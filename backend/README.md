# Lumière Skin Clinic — Backend

Node + Express + MySQL backend for the appointment booking system.

## Stack

- Node.js + Express 4
- MySQL 8 (via `mysql2/promise`)
- JWT auth (HTTP-only cookie + Bearer header fallback)
- bcryptjs for password hashing
- Razorpay (orders + signature verification)
- Cloudinary (image upload, in-memory stream)
- Nodemailer (transactional + birthday emails)
- node-cron (daily birthday job at 09:00 IST)
- Zod for request validation
- Helmet, CORS, rate-limit for hardening

## Folder layout

```
backend/
  src/
    config/       db, cloudinary, razorpay, mailer
    controllers/  request handlers
    db/           schema.sql, migrate.js, seed.js
    jobs/         birthday cron
    middlewares/  auth, role, validate, error, upload
    models/       thin SQL data-access functions
    routes/       Express routers
    services/     queue, razorpay, cloudinary, email, birthday
    utils/        ApiError, ApiResponse, asyncHandler, tokens, validators
    app.js
    server.js
  .env.example
  package.json
```

## Setup

### 1. Install

```bash
cd backend
npm install
```

### 2. Configure

Copy `.env.example` to `.env` and fill in:

| Group        | Variables                                                              |
| ------------ | ---------------------------------------------------------------------- |
| Server       | `PORT`, `NODE_ENV`, `FRONTEND_URL`                                     |
| MySQL        | `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`              |
| JWT          | `JWT_SECRET`, `JWT_EXPIRES_IN`, `COOKIE_SECURE`                        |
| Razorpay     | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `DEFAULT_APPOINTMENT_FEE`    |
| Cloudinary   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| Email (SMTP) | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`   |
| Clinic       | `CLINIC_NAME`, `CLINIC_ADDRESS`, `CLINIC_PHONE`, `CLINIC_TIMEZONE`     |
| Default admin| `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_ADMIN_NAME`  |

### 3. Create the database + apply schema

```bash
npm run db:migrate
```

This creates the `skin_clinic_db` database (if missing) and applies `src/db/schema.sql`. Safe to re-run.

### 4. Seed default admin + starter services

```bash
npm run db:seed
```

Defaults from `.env`:

- Email: `admin@lumiere.local`
- Password: `Admin@12345`

**Change these in `.env` before running seed in any non-local environment.**

### 5. Run

```bash
npm run dev      # nodemon
# or
npm start
```

Server boots at `http://localhost:5000` and the birthday cron registers at 09:00 IST.

## Roles

| Role  | Public booking | Dashboard | Appointments | Patients | Staff mgmt | Admin mgmt | Services | Gallery | Payments | Settings |
| ----- | :------------: | :-------: | :----------: | :------: | :--------: | :--------: | :------: | :-----: | :------: | :------: |
| admin |       ✓        |     ✓     |      ✓       |    ✓     |     ✓      |     ✓      |    ✓     |    ✓    |    ✓     |    ✓     |
| staff |       ✓        |     ✓     |      ✓       |          |            |            |          |         |          |          |
| guest |       ✓        |           |              |          |            |            |          |         |          |          |

Staff are blocked at the route level — admin-only endpoints return 403 even if hit directly.

## API summary

All responses follow:

```json
{ "success": true, "message": "OK", "data": <payload> }
```

Errors:

```json
{ "success": false, "message": "...", "details": {...} }
```

### Auth

| Method | Path                  | Auth         | Notes                                |
| ------ | --------------------- | ------------ | ------------------------------------ |
| POST   | `/api/auth/login`     | public       | sets HTTP-only `token` cookie        |
| POST   | `/api/auth/logout`    | public       | clears cookie                        |
| GET    | `/api/auth/me`        | any logged-in| returns current user                 |
| POST   | `/api/auth/register`  | admin        | admin creates new admin/staff users  |

### Appointments (public booking + dashboard)

| Method | Path                                            | Auth          |
| ------ | ----------------------------------------------- | ------------- |
| POST   | `/api/appointments/create-order`                | public        |
| POST   | `/api/appointments/verify-payment`              | public        |
| GET    | `/api/appointments`                             | admin + staff |
| GET    | `/api/appointments/today`                       | admin + staff |
| GET    | `/api/appointments/stats`                       | admin + staff |
| GET    | `/api/appointments/:id`                         | admin + staff |
| PATCH  | `/api/appointments/:id/status`                  | admin + staff |
| PATCH  | `/api/appointments/:id/reschedule`              | admin + staff |
| POST   | `/api/appointments/:id/resend-confirmation`     | admin + staff |
| DELETE | `/api/appointments/:id`                         | admin         |

Appointment list filters (query string): `range=today|tomorrow|week|month`, `from`, `to`, `payment_status`, `appointment_status`, `service_id`, `doctor_id`, `search`, `sort=queue|date`, `limit`, `offset`.

### Payments

| Method | Path                  | Auth  |
| ------ | --------------------- | ----- |
| GET    | `/api/payments`       | admin |
| GET    | `/api/payments/:id`   | admin |

### Services

| Method | Path                       | Auth   |
| ------ | -------------------------- | ------ |
| GET    | `/api/services`            | public |
| GET    | `/api/services/:slug`      | public |
| POST   | `/api/services`            | admin (multipart: `image`) |
| PATCH  | `/api/services/:id`        | admin (multipart: `image`) |
| DELETE | `/api/services/:id`        | admin  |

### Enquiries

| Method | Path                            | Auth          |
| ------ | ------------------------------- | ------------- |
| POST   | `/api/enquiries`                | public        |
| GET    | `/api/enquiries`                | admin + staff |
| PATCH  | `/api/enquiries/:id/status`     | admin + staff |
| DELETE | `/api/enquiries/:id`            | admin         |

### Reviews

| Method | Path                          | Auth          |
| ------ | ----------------------------- | ------------- |
| POST   | `/api/reviews`                | public        |
| GET    | `/api/reviews/public`         | public        |
| GET    | `/api/reviews`                | admin + staff |
| PATCH  | `/api/reviews/:id/status`     | admin + staff |
| DELETE | `/api/reviews/:id`            | admin         |

### Gallery

| Method | Path                  | Auth   |
| ------ | --------------------- | ------ |
| GET    | `/api/gallery`        | public |
| POST   | `/api/gallery`        | admin (multipart: `image`) |
| PATCH  | `/api/gallery/:id`    | admin  |
| DELETE | `/api/gallery/:id`    | admin  |

### Admin & Staff dashboards

| Method | Path                          | Auth          |
| ------ | ----------------------------- | ------------- |
| GET    | `/api/admin/dashboard-stats`  | admin         |
| GET    | `/api/admin/patients`         | admin         |
| GET    | `/api/admin/staff`            | admin         |
| POST   | `/api/admin/staff`            | admin         |
| PATCH  | `/api/admin/staff/:id`        | admin         |
| DELETE | `/api/admin/staff/:id`        | admin         |
| GET    | `/api/admin/admins`           | admin         |
| POST   | `/api/admin/admins`           | admin         |
| DELETE | `/api/admin/admins/:id`       | admin         |
| GET    | `/api/staff/dashboard-stats`  | admin + staff |

## Queue number logic

Per appointment date, queue numbers start at 1 and increment in booking order:

1. Inside a transaction, lock all rows for `appointment_date` with `SELECT ... FOR UPDATE`.
2. `next = MAX(queue_number) + 1`.
3. Insert. On duplicate-key race, retry up to 3 times.
4. The `UNIQUE(appointment_date, queue_number)` index is the final safety net.

Today's dashboard sorts by `queue_number ASC, created_at ASC` — first booked, first shown.

## Razorpay flow

1. Frontend POSTs booking form → `POST /create-order`.
2. Backend upserts patient, creates appointment (pending), creates Razorpay order, inserts payment row.
3. Returns `order.id`, `key_id`, `amount` to frontend.
4. Frontend opens Razorpay checkout with these.
5. On success, frontend POSTs `razorpay_order_id`, `razorpay_payment_id`, `razorpay_signature` → `POST /verify-payment`.
6. Backend verifies HMAC signature **and** asks Razorpay for the payment state.
7. Marks payment row paid, appointment confirmed, fires confirmation email asynchronously.

`RAZORPAY_KEY_SECRET` is **never** exposed to the frontend.

## Birthday automation

- `src/jobs/birthday.job.js` schedules a cron at `0 9 * * *` in the timezone set by `CLINIC_TIMEZONE` (default `Asia/Kolkata`).
- The cron calls `birthday.service.runBirthdayJob()`, which:
  - Finds patients whose DOB month + day match today (IST).
  - Skips anyone already logged as sent today.
  - Sends the email; logs success or failure into `birthday_email_logs`.
- Duplicates are prevented by `UNIQUE(patient_id, sent_date)`.

## Security notes

- Passwords hashed with bcryptjs (cost 10).
- JWT signed with `JWT_SECRET`; verified on every authenticated request.
- All SQL goes through parameterised queries — no string concatenation.
- Helmet sets sensible HTTP security headers.
- Rate limit caps `/api` at ~20 rpm/IP, and login at 20 attempts / 15 min.
- Razorpay payments are verified server-side via HMAC + capture check; signature alone is not sufficient.
- File uploads are filtered by MIME and capped at 5 MB.

## What's next (Phase 2 + 3)

- **Phase 2:** React frontend conversion of the existing HTML pages, appointment booking flow, public reviews/enquiries.
- **Phase 3:** Admin + staff dashboard UI on top of these APIs.
