import {
  listServices,
  findServiceById,
  findServiceBySlug,
  createService,
  updateService,
  deleteService,
} from '../model/service.model.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

const SLUG_RE = /^[a-z0-9-]+$/;

export const list = async (req, res) => {
  try {
    const rows = await listServices({ activeOnly: req.query.active === 'true' });
    res.status(200).json({ data: rows, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const getBySlug = async (req, res) => {
  try {
    const svc = await findServiceBySlug(req.params.slug);
    if (!svc) return res.status(404).json({ message: 'Service not found' });
    res.status(200).json({ data: svc, message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const create = async (req, res) => {
  try {
    const { title, slug, description, short_description, price, duration_minutes, is_active } = req.body || {};

    if (!title || String(title).trim().length < 2) {
      return res.status(400).json({ message: 'title is required' });
    }
    if (!slug || !SLUG_RE.test(String(slug))) {
      return res.status(400).json({ message: 'slug must be lowercase, hyphenated' });
    }
    if (price === undefined || price === '' || !Number.isFinite(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ message: 'price must be a non-negative number' });
    }

    const payload = {
      title: String(title).trim(),
      slug: String(slug).trim(),
      description: description || null,
      short_description: short_description || null,
      price: Number(price),
      duration_minutes: duration_minutes ? Number(duration_minutes) : 30,
      is_active: is_active === undefined ? true : Boolean(is_active),
    };

    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer);
      payload.image_url = result.secure_url;
      payload.image_public_id = result.public_id;
    }

    const svc = await createService(payload);
    res.status(201).json({ data: svc, message: 'Service created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await findServiceById(id);
    if (!existing) return res.status(404).json({ message: 'Service not found' });

    const payload = { ...req.body };
    if (payload.slug && !SLUG_RE.test(String(payload.slug))) {
      return res.status(400).json({ message: 'slug must be lowercase, hyphenated' });
    }
    if (payload.price !== undefined && (!Number.isFinite(Number(payload.price)) || Number(payload.price) < 0)) {
      return res.status(400).json({ message: 'price must be a non-negative number' });
    }
    if (payload.price !== undefined) payload.price = Number(payload.price);
    if (payload.duration_minutes !== undefined) payload.duration_minutes = Number(payload.duration_minutes);

    if (req.file) {
      if (existing.image_public_id) {
        deleteFromCloudinary(existing.image_public_id).catch(() => {});
      }
      const result = await uploadToCloudinary(req.file.buffer);
      payload.image_url = result.secure_url;
      payload.image_public_id = result.public_id;
    }

    const svc = await updateService(id, payload);
    res.status(200).json({ data: svc, message: 'Service updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await findServiceById(id);
    if (!existing) return res.status(404).json({ message: 'Service not found' });

    if (existing.image_public_id) {
      deleteFromCloudinary(existing.image_public_id).catch(() => {});
    }
    await deleteService(id);
    res.status(200).json({ data: null, message: 'Service deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
