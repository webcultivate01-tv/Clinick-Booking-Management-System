/**
 * Idempotent seed script.
 *   node db/seed.js
 *
 * - Creates the default admin user (from env) if not present.
 * - Inserts a small set of starter services so the booking form has options.
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

const STARTER_SERVICES = [
  {
    title: 'HydraFacial',
    slug: 'hydrafacial',
    short_description: 'Deep cleansing, exfoliation and hydration in one session.',
    description: 'A multi-step facial treatment that cleanses, exfoliates and hydrates the skin using a patented vacuum-based device.',
    price: 2500,
    duration_minutes: 60,
  },
  {
    title: 'Laser Skin Resurfacing',
    slug: 'laser-skin-resurfacing',
    short_description: 'Reduce fine lines, scars and pigmentation with fractional laser.',
    description: 'Fractional laser resurfacing stimulates collagen and improves overall skin texture and tone.',
    price: 7500,
    duration_minutes: 45,
  },
  {
    title: 'Anti-Aging Consultation',
    slug: 'anti-aging-consultation',
    short_description: 'Personalised plan for fine lines, wrinkles and skin elasticity.',
    description: 'One-on-one consultation with a board-certified dermatologist to design an anti-aging routine.',
    price: 800,
    duration_minutes: 30,
  },
  {
    title: 'Acne & Scar Treatment',
    slug: 'acne-scar-treatment',
    short_description: 'Medical-grade therapies for active acne and post-acne scars.',
    description: 'Combination of chemical peels, microneedling and topical regimens for acne and scar improvement.',
    price: 3500,
    duration_minutes: 45,
  },
  {
    title: 'Botox / Filler Consultation',
    slug: 'botox-filler-consultation',
    short_description: 'Discuss aesthetic goals with a certified dermatologist.',
    description: 'Initial consultation before any injectable procedure. Treatment cost charged separately.',
    price: 1000,
    duration_minutes: 30,
  },
];

async function run() {
  const {
    DEFAULT_ADMIN_EMAIL = 'admin@lumiere.local',
    DEFAULT_ADMIN_PASSWORD = 'Admin@12345',
    DEFAULT_ADMIN_NAME = 'Clinic Admin',
  } = process.env;

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ? LIMIT 1', [
    DEFAULT_ADMIN_EMAIL,
  ]);

  if (existing.length === 0) {
    const hash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
    await pool.query(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, 'admin', 1)`,
      [DEFAULT_ADMIN_NAME, DEFAULT_ADMIN_EMAIL, hash]
    );
    console.log(`[seed] created default admin: ${DEFAULT_ADMIN_EMAIL} / ${DEFAULT_ADMIN_PASSWORD}`);
  } else {
    console.log(`[seed] admin already exists: ${DEFAULT_ADMIN_EMAIL}`);
  }

  for (const s of STARTER_SERVICES) {
    const [rows] = await pool.query('SELECT id FROM services WHERE slug = ? LIMIT 1', [s.slug]);
    if (rows.length === 0) {
      await pool.query(
        `INSERT INTO services (title, slug, description, short_description, price, duration_minutes, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)`,
        [s.title, s.slug, s.description, s.short_description, s.price, s.duration_minutes]
      );
      console.log(`[seed] inserted service: ${s.title}`);
    }
  }

  console.log('[seed] done');
  await pool.end();
}

run().catch(async (err) => {
  console.error('[seed] failed:', err.message);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
