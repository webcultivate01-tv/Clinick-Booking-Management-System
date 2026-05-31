import {
  createReview,
  listReviews,
  updateReviewStatus,
  deleteReview,
} from '../model/review.model.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const create = async (req, res) => {
  try {
    const { patient_name, email, rating, review_text } = req.body || {};

    if (!patient_name || String(patient_name).trim().length < 2) {
      return res.status(400).json({ message: 'patient_name is required' });
    }
    if (email && !EMAIL_RE.test(String(email).trim())) {
      return res.status(400).json({ message: 'Invalid email address' });
    }
    const r = Number(rating);
    if (!Number.isInteger(r) || r < 1 || r > 5) {
      return res.status(400).json({ message: 'rating must be an integer 1-5' });
    }
    if (!review_text || String(review_text).trim().length < 5) {
      return res.status(400).json({ message: 'review_text must be at least 5 characters' });
    }

    const created = await createReview({
      patient_name: String(patient_name).trim(),
      email: email ? String(email).trim().toLowerCase() : null,
      rating: r,
      review_text: String(review_text).trim(),
    });
    res.status(201).json({ data: created, message: 'Review submitted — awaiting approval' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const listPublic = async (_req, res) => {
  try {
    const rows = await listReviews({ status: 'approved', limit: 100 });
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const list = async (req, res) => {
  try {
    const rows = await listReviews(req.query);
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const updated = await updateReviewStatus(Number(req.params.id), status);
    if (!updated) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json({ data: updated, message: 'Review updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const remove = async (req, res) => {
  try {
    const ok = await deleteReview(Number(req.params.id));
    if (!ok) return res.status(404).json({ message: 'Review not found' });
    res.status(200).json({ data: null, message: 'Review deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
