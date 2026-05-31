/**
 * Usage:
 *   router.post('/admins', isAuth, authorizeRoles('admin'), ...)
 * Trust ONLY the role on req.user (set by isAuth after a DB lookup) —
 * never anything the client sends.
 */
export const authorizeRoles = (...allowed) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (!allowed.includes(req.user.role)) {
    return res.status(403).json({ message: 'You do not have permission to perform this action' });
  }
  next();
};
