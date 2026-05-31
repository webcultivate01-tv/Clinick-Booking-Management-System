import { verifyToken } from '../utils/generateToken.js';
import { findUserById } from '../model/user.model.js';

/**
 * Pulls JWT from either the httpOnly cookie or the Authorization header,
 * verifies it, then attaches the user row to req.user. Returns 401 otherwise.
 *
 * The dual-read (cookie + Bearer) is intentional — the frontend's axios
 * interceptor falls back to Authorization when the browser blocks
 * third-party cookies.
 */
export async function isAuth(req, res, next) {
  try {
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    const token = req.cookies?.token || headerToken;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    const user = await findUserById(payload.id);
    if (!user || !user.is_active) {
      return res.status(401).json({ message: 'User no longer active' });
    }

    // Strip sensitive fields before exposing on req.
    delete user.password_hash;
    req.user = user;
    next();
  } catch (err) {
    console.error('[auth]', err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
}
