/**
 * 404 for unmatched routes — kept JSON-shaped so the frontend never has to
 * parse HTML.
 */
export function notFound(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Last-resort error handler. Most controllers catch their own errors and
 * return 4xx/500 directly; this fires only when something escapes the
 * try/catch (e.g. an unhandled rejection in middleware) or when a middleware
 * calls next(err) explicitly.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const isProd = process.env.NODE_ENV === 'production';

  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'Duplicate value violates a unique constraint' });
  }

  const status = Number(err?.statusCode) || 500;
  console.error('[unhandled]', err);

  res.status(status).json({
    message: err?.message || 'Internal server error',
    stack: isProd ? undefined : err?.stack,
  });
}
