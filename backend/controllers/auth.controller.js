import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/generateToken.js';
import {
  findUserByEmail,
  findUserById,
  createUser,
} from '../model/user.model.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const COOKIE_OPTS = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE === 'true',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

function publicUser(u) {
  if (!u) return null;
  // Always strip password_hash before sending to the client.
  const { password_hash, ...safe } = u;
  return safe;
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 * Generic error message on bad creds — no user enumeration.
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await findUserByEmail(normalizedEmail);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken({ id: user.id, role: user.role });
    res.cookie('token', token, COOKIE_OPTS());

    res.status(201).json({
      data: { user: publicUser(user), token },
      message: 'Logged in',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * POST /api/auth/logout — clears the cookie.
 */
export const logout = async (_req, res) => {
  try {
    res.clearCookie('token', { ...COOKIE_OPTS(), maxAge: 0 });
    res.status(200).json({ data: null, message: 'Logged out' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * GET /api/auth/me — returns the user attached by isAuth.
 */
export const me = async (req, res) => {
  try {
    const fresh = await findUserById(req.user.id);
    res.status(200).json({ data: { user: publicUser(fresh) }, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/**
 * POST /api/auth/register
 * Restricted: only an authenticated admin can create new users (admin or staff).
 * There is no public self-registration in this product.
 */
export const register = async (req, res) => {
  try {
    const { full_name, email, mobile, password, role = 'staff', gender, dob } = req.body || {};

    if (!full_name || String(full_name).trim().length < 2) {
      return res.status(400).json({ message: 'full_name must be at least 2 characters' });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (mobile && !MOBILE_RE.test(String(mobile).trim())) {
      return res.status(400).json({ message: 'Mobile must be a 10-digit Indian number starting with 6-9' });
    }
    if (!password || String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }
    if (!['admin', 'staff'].includes(role)) {
      return res.status(400).json({ message: 'role must be admin or staff' });
    }
    if (gender && !['male', 'female', 'other'].includes(gender)) {
      return res.status(400).json({ message: 'Invalid gender' });
    }
    if (dob && !ISO_DATE_RE.test(String(dob))) {
      return res.status(400).json({ message: 'dob must be in YYYY-MM-DD format' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(400).json({ message: 'An account with that email already exists' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const user = await createUser({
      full_name: String(full_name).trim(),
      email: normalizedEmail,
      mobile: mobile ? String(mobile).trim() : null,
      password_hash,
      role,
      gender,
      dob,
    });

    res.status(201).json({ data: { user: publicUser(user) }, message: 'User created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
