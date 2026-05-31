import {
  createEnquiry,
  listEnquiries,
  updateEnquiry,
  updateEnquiryStatus,
  deleteEnquiry,
  bulkUpdateStatus,
  bulkDelete,
  getEnquiryStats,
  findEnquiryById,
} from '../model/enquiry.model.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const STATUSES = ['new', 'contacted', 'closed'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export const create = async (req, res) => {
  try {
    const { name, email, mobile, subject, message } = req.body || {};

    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ message: 'name is required' });
    }
    if (!email || !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    if (mobile && !MOBILE_RE.test(String(mobile).trim())) {
      return res.status(400).json({ message: 'Mobile must be a 10-digit Indian number starting with 6-9' });
    }
    if (!message || String(message).trim().length < 5) {
      return res.status(400).json({ message: 'message must be at least 5 characters' });
    }

    const e = await createEnquiry({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      mobile: mobile ? String(mobile).trim() : null,
      subject: subject ? String(subject).trim() : null,
      message: String(message).trim(),
    });
    res.status(201).json({ data: e, message: 'Enquiry received' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const list = async (req, res) => {
  try {
    const { status, priority, search, from, to, sort, limit, offset } = req.query || {};
    if (status   && !STATUSES.includes(status))     return res.status(400).json({ message: 'Invalid status' });
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ message: 'Invalid priority' });

    const rows = await listEnquiries({
      status:   status   || null,
      priority: priority || null,
      search:   search   || '',
      from:     from     || null,
      to:       to       || null,
      sort:     sort     || 'newest',
      limit:    Math.min(Math.max(parseInt(limit,  10) || 100, 1), 500),
      offset:   Math.max(parseInt(offset, 10) || 0, 0),
    });
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const detail = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const e = await findEnquiryById(id);
    if (!e) return res.status(404).json({ message: 'Enquiry not found' });
    res.status(200).json({ data: e, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const stats = async (_req, res) => {
  try {
    res.status(200).json({ data: await getEnquiryStats(), message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/** Back-compat — accepts only { status }. The frontend now prefers PATCH /:id. */
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updated = await updateEnquiryStatus(Number(req.params.id), status);
    if (!updated) return res.status(404).json({ message: 'Enquiry not found' });
    res.status(200).json({ data: updated, message: 'Enquiry updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/** Full partial update for the new admin drawer. */
export const update = async (req, res) => {
  try {
    const { status, priority, internal_note } = req.body || {};
    if (status   !== undefined && !STATUSES.includes(status))     return res.status(400).json({ message: 'Invalid status' });
    if (priority !== undefined && !PRIORITIES.includes(priority)) return res.status(400).json({ message: 'Invalid priority' });
    if (internal_note !== undefined && internal_note !== null && typeof internal_note !== 'string') {
      return res.status(400).json({ message: 'internal_note must be a string' });
    }

    const updated = await updateEnquiry(Number(req.params.id), { status, priority, internal_note });
    if (!updated) return res.status(404).json({ message: 'Enquiry not found' });
    res.status(200).json({ data: updated, message: 'Enquiry updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const remove = async (req, res) => {
  try {
    const ok = await deleteEnquiry(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Enquiry not found' });
    res.status(200).json({ data: null, message: 'Enquiry deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

/* -------------------------------- bulk -------------------------------- */

function parseIds(raw) {
  if (!Array.isArray(raw)) return null;
  const ids = raw.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0);
  return ids.length ? ids : null;
}

export const bulkStatus = async (req, res) => {
  try {
    const { ids, status } = req.body || {};
    if (!STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const parsed = parseIds(ids);
    if (!parsed) return res.status(400).json({ message: 'ids must be a non-empty array of integers' });

    const affected = await bulkUpdateStatus(parsed, status);
    res.status(200).json({ data: { affected }, message: `${affected} enquir${affected === 1 ? 'y' : 'ies'} updated` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const bulkRemove = async (req, res) => {
  try {
    const { ids } = req.body || {};
    const parsed = parseIds(ids);
    if (!parsed) return res.status(400).json({ message: 'ids must be a non-empty array of integers' });

    const affected = await bulkDelete(parsed);
    res.status(200).json({ data: { affected }, message: `${affected} enquir${affected === 1 ? 'y' : 'ies'} deleted` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
