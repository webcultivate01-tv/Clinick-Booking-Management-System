import { pool } from '../config/db.js';

export async function findEnquiryById(id) {
  const [rows] = await pool.query('SELECT * FROM enquiries WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

export async function createEnquiry(data) {
  const [result] = await pool.query(
    `INSERT INTO enquiries (name, email, mobile, subject, message)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.email, data.mobile || null, data.subject || null, data.message]
  );
  return findEnquiryById(result.insertId);
}

/**
 * Enterprise list endpoint — supports search, status, priority, date range,
 * sort, and pagination. All filters optional, all server-side so the index
 * on (status, priority, created_at) does the work for large tables.
 *
 *   filters:
 *     status:    'new' | 'contacted' | 'closed'
 *     priority:  'low' | 'normal' | 'high' | 'urgent'
 *     search:    matches name, email, mobile, subject, message
 *     from / to: ISO date strings (inclusive)
 *     sort:      'newest' (default) | 'oldest' | 'priority'
 *     limit / offset
 */
export async function listEnquiries({
  status = null,
  priority = null,
  search = '',
  from = null,
  to = null,
  sort = 'newest',
  limit = 100,
  offset = 0,
} = {}) {
  const where = [];
  const values = [];

  if (status)   { where.push('status = ?');   values.push(status); }
  if (priority) { where.push('priority = ?'); values.push(priority); }
  if (from)     { where.push('created_at >= ?'); values.push(`${from} 00:00:00`); }
  if (to)       { where.push('created_at <= ?'); values.push(`${to} 23:59:59`); }
  if (search) {
    where.push('(name LIKE ? OR email LIKE ? OR mobile LIKE ? OR subject LIKE ? OR message LIKE ?)');
    const like = `%${search}%`;
    values.push(like, like, like, like, like);
  }

  // Priority sort puts urgent on top, then high, then normal, then low; within
  // each priority bucket we still tie-break by newest-first.
  const orderBy = sort === 'oldest'
    ? 'created_at ASC'
    : sort === 'priority'
      ? `FIELD(priority, 'urgent', 'high', 'normal', 'low'), created_at DESC`
      : 'created_at DESC';

  values.push(Number(limit), Number(offset));
  const [rows] = await pool.query(
    `SELECT * FROM enquiries ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    values
  );
  return rows;
}

/**
 * Partial update — accepts any subset of { status, priority, internal_note }.
 * When `status` transitions out of 'new' (to 'contacted' or 'closed') for the
 * first time we also stamp `responded_at`, so we can report response-time SLA
 * on the admin dashboard later without a separate audit table.
 */
export async function updateEnquiry(id, { status, priority, internal_note } = {}) {
  const current = await findEnquiryById(id);
  if (!current) return null;

  const fields = [];
  const values = [];

  if (status   !== undefined) { fields.push('status = ?');   values.push(status); }
  if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
  if (internal_note !== undefined) {
    fields.push('internal_note = ?');
    values.push(internal_note || null);
  }
  if (
    status && status !== 'new'
    && current.status === 'new'
    && !current.responded_at
  ) {
    fields.push('responded_at = CURRENT_TIMESTAMP');
  }

  if (!fields.length) return current;

  values.push(id);
  await pool.query(`UPDATE enquiries SET ${fields.join(', ')} WHERE id = ?`, values);
  return findEnquiryById(id);
}

/** Back-compat wrapper for the original /status endpoint. */
export async function updateEnquiryStatus(id, status) {
  return updateEnquiry(id, { status });
}

export async function deleteEnquiry(id) {
  const [result] = await pool.query('DELETE FROM enquiries WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

/**
 * Bulk operations for the admin triage UI.
 *   ids: array of integers (validated upstream)
 */
export async function bulkUpdateStatus(ids, status) {
  if (!ids.length) return 0;
  // Stamp responded_at on items moving out of 'new' for the first time.
  const stamp = status !== 'new' ? ', responded_at = COALESCE(responded_at, CURRENT_TIMESTAMP)' : '';
  const [result] = await pool.query(
    `UPDATE enquiries SET status = ?${stamp} WHERE id IN (?)`,
    [status, ids]
  );
  return result.affectedRows;
}

export async function bulkDelete(ids) {
  if (!ids.length) return 0;
  const [result] = await pool.query('DELETE FROM enquiries WHERE id IN (?)', [ids]);
  return result.affectedRows;
}

/**
 * Dashboard-style aggregates for the Enquiries page header. Returns counts
 * grouped by status + priority plus simple SLA stats (overdue = a 'new'
 * enquiry older than 24h, avg response time for items that have a
 * responded_at stamp).
 */
export async function getEnquiryStats() {
  const [[overall]] = await pool.query(`
    SELECT
      COUNT(*)                                 AS total,
      SUM(status = 'new')                      AS new_count,
      SUM(status = 'contacted')                AS contacted_count,
      SUM(status = 'closed')                   AS closed_count,
      SUM(priority = 'urgent')                 AS urgent_count,
      SUM(priority = 'high')                   AS high_count,
      SUM(status = 'new' AND created_at < (NOW() - INTERVAL 24 HOUR)) AS overdue_count,
      SUM(created_at >= (NOW() - INTERVAL 24 HOUR)) AS last_24h_count,
      AVG(CASE
            WHEN responded_at IS NOT NULL
            THEN TIMESTAMPDIFF(MINUTE, created_at, responded_at)
            ELSE NULL
          END)                                 AS avg_response_minutes
      FROM enquiries
  `);
  return {
    total:                Number(overall.total)            || 0,
    new_count:            Number(overall.new_count)        || 0,
    contacted_count:      Number(overall.contacted_count)  || 0,
    closed_count:         Number(overall.closed_count)     || 0,
    urgent_count:         Number(overall.urgent_count)     || 0,
    high_count:           Number(overall.high_count)       || 0,
    overdue_count:        Number(overall.overdue_count)    || 0,
    last_24h_count:       Number(overall.last_24h_count)   || 0,
    avg_response_minutes: overall.avg_response_minutes != null
      ? Math.round(Number(overall.avg_response_minutes))
      : null,
  };
}
