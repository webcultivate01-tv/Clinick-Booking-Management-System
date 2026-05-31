# Lumière Skin Clinic — Frontend

React (Vite) frontend for the Lumière Skin Clinic appointment system.

## Stack

- **React 18 + Vite 5** — fast dev server + production build
- **React Router 6** — routing
- **Redux Toolkit + React-Redux** — auth state (dashboard slices land in Phase 3)
- **Axios** — API client with cookie support + bearer fallback
- **Tailwind CSS 3** — utility styling with the exact site palette + Playfair/Inter fonts
- **react-hot-toast** — non-blocking notifications
- **Razorpay Checkout JS** — loaded from CDN in `index.html`

## Setup

```bash
cd frontend
npm install
cp .env.example .env       # optional — only needed if backend isn't at /api
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:5000`, so you don't need CORS config in development.

## Project layout

```
frontend/
  index.html              ← Razorpay checkout JS + fonts + FA loaded here
  src/
    api/                  axios instance + endpoint wrappers
    components/
      common/             Navbar, Footer, MobileDrawer, Loader, StatusBadge, WhatsAppFab
      layout/             PublicLayout (Phase 3 will add DashboardLayout)
      appointment/        Stepper, PatientDetailsStep, ServiceStep, SlotStep, ReviewStep
    pages/
      public/             Home, About, Services, ServiceDetails, Gallery, Reviews, Contact,
                          Appointment, BookingConfirmation
      auth/               Login (admin/staff)
    store/                Redux store + auth slice
    styles/index.css      Tailwind layers + ported site CSS (navbar, drawer, marquee, badges)
    utils/                formatters (INR, date, time)
    App.jsx, main.jsx
```

## What's implemented in Phase 2

- ✅ **Full booking flow** — 5-step form (Details → Service → Slot → Review → Payment)
  hitting `POST /api/appointments/create-order` and `POST /api/appointments/verify-payment`,
  with Razorpay checkout opening in a modal and queue number shown on the confirmation page.
- ✅ **Confirmation page** — shows queue number, paid/confirmed badges, service + slot details.
- ✅ **Home** — hero, animated marquee, "why us", treatments grid, dark CTA — all ported from the original HTML.
- ✅ **Services** — fetches active services from backend, links to detail page.
- ✅ **Service detail** — `/services/:slug` reads from backend.
- ✅ **Reviews** — lists approved reviews + submission form with star rating.
- ✅ **Contact** — enquiry form submits to backend; clinic info column.
- ✅ **Gallery** — fetches from backend (empty state until admin uploads in Phase 3).
- ✅ **Login** — admin/staff sign-in via Redux thunk; routes to `/admin` or `/staff` post-login.
- ✅ **Mobile responsive** — sticky navbar, slide-in drawer, all forms touch-friendly.

## What lands in the next pass

- Full content port of **About** (founder story, mission, timeline).
- Full content port of **Services** detail layouts to match the original.
- Per-section animations (intersection-observer-driven reveal classes are already in CSS).
- Phase 3 brings the dashboard (sidebar, stats cards, appointment table, etc.).

## Booking flow — end-to-end test

1. Start backend (`npm run dev` in `backend/`).
2. Start frontend (`npm run dev` here).
3. Visit `http://localhost:5173`.
4. Click **Book Now** → fill the 5-step form → reach the Razorpay popup.
5. Use a Razorpay **test card**: `4111 1111 1111 1111`, any future CVV/expiry, any name.
6. After success, you should be redirected to `/appointment/confirmation/:id` with the queue number.
7. Check the admin email (the address in `EMAIL_USER`) for a confirmation message.

If Razorpay fails to open: check `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in the backend's `.env`.

## Production build

```bash
npm run build       # outputs to dist/
npm run preview     # local preview of the production bundle
```

Set `VITE_API_URL=https://api.your-domain.com` in `.env` before building for prod.
