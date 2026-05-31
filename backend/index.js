import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { connectDB } from './config/db.js';
import { notFound, errorHandler } from './middleware/error.middleware.js';
import { startBirthdayCron } from './jobs/birthday.job.js';

import authRoutes        from './routes/auth.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import paymentRoutes     from './routes/payment.routes.js';
import serviceRoutes     from './routes/service.routes.js';
import enquiryRoutes     from './routes/enquiry.routes.js';
import reviewRoutes      from './routes/review.routes.js';
import galleryRoutes     from './routes/gallery.routes.js';
import adminRoutes       from './routes/admin.routes.js';
import staffRoutes       from './routes/staff.routes.js';
import opdRoutes         from './routes/opd.routes.js';

const app = express();

/* -------- security & parsing -------- */
// crossOriginResourcePolicy must be relaxed so the React frontend (different
// origin) can render <img> tags pointing at /uploads.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Static gallery uploads. Files live at backend/public/uploads/... and are
// served at /uploads/... — eg /uploads/gallery/abc.webp. Long cache, since
// filenames are content-hashed at upload time.
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads'), {
  maxAge: '30d',
  immutable: true,
}));
app.use(cors({
  origin: (process.env.FRONTEND_URL || 'http://localhost:5173').split(',').map(s => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* -------- rate limiting -------- */
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
}));
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts, please try again later.' },
}));

/* -------- health -------- */
app.get('/api/health', (_req, res) => {
  res.status(200).json({ data: { time: new Date().toISOString() }, message: 'ok' });
});

/* -------- routes -------- */
app.use('/api/auth',         authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/payments',     paymentRoutes);
app.use('/api/services',     serviceRoutes);
app.use('/api/enquiries',    enquiryRoutes);
app.use('/api/reviews',      reviewRoutes);
app.use('/api/gallery',      galleryRoutes);
app.use('/api/admin',        adminRoutes);
app.use('/api/staff',        staffRoutes);
app.use('/api/opd',          opdRoutes);

/* -------- 404 + error handler (must be last) -------- */
app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

(async () => {
  try {
    await connectDB();
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] could not connect at startup:', err.message);
    // Don't exit — server still serves health and surfaces a useful 500 until DB comes back.
  }

  startBirthdayCron();

  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[server] env: ${process.env.NODE_ENV || 'development'}`);
  });
})();

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
});
