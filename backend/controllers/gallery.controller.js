/**
 * Gallery controller.
 *
 * Two upload paths:
 *   - multipart `image` field   → local-disk save through sharp (compress to
 *                                 WebP if > 1 MB or > 1920 px).
 *   - JSON `image_url` field    → either:
 *       mirror=true  → fetch URL, run through same compress+save pipeline.
 *       mirror=false (default) → store URL directly (zero disk usage; we
 *                                trust the remote host to stay up).
 *
 * The DB row's `image_public_id` stores the local disk path (eg
 * "gallery/abc.webp") when we own the file, or NULL for direct URL imports —
 * the latter case means delete() won't try to remove anything from disk.
 */
import {
  listGallery,
  findGalleryItemById,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from '../model/gallery.model.js';
import { storeImageBuffer, storeImageFromUrl, removeStoredImage } from '../utils/imageStorage.js';

const URL_RE = /^https?:\/\/\S+$/i;

function publicBase(req) {
  // Build absolute URLs (eg http://localhost:5000/uploads/...) so the React
  // app on a different origin can <img> them. Falls back to APP_URL env when
  // behind a proxy.
  return process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

function absolutize(req, url) {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url; // direct URL imports are already absolute
  return `${publicBase(req)}${url}`;
}

function decorate(req, row) {
  return row ? { ...row, image_url: absolutize(req, row.image_url) } : row;
}

export const list = async (req, res) => {
  try {
    const rows = await listGallery({
      activeOnly: req.query.active === 'true',
      category: req.query.category || null,
    });
    res.status(200).json({ data: rows.map((r) => decorate(req, r)), message: 'OK' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const create = async (req, res) => {
  try {
    const title = req.body?.title || null;
    const category = req.body?.category || null;
    const sourceUrl = (req.body?.image_url || '').trim();
    const mirror = req.body?.mirror === true || req.body?.mirror === 'true';

    // Branch 1: multipart file upload
    if (req.file) {
      const stored = await storeImageBuffer({
        folder: 'gallery',
        buffer: req.file.buffer,
        mime: req.file.mimetype,
      });
      const item = await createGalleryItem({
        title, category,
        image_url: stored.url,            // relative path stored in DB
        image_public_id: stored.disk_path, // used for cleanup on delete
      });
      return res.status(201).json({
        data: decorate(req, item),
        message: stored.compressed
          ? `Uploaded — compressed to ${(stored.bytes / 1024).toFixed(0)} KB WebP`
          : 'Uploaded',
      });
    }

    // Branch 2: URL provided
    if (sourceUrl) {
      if (!URL_RE.test(sourceUrl)) {
        return res.status(400).json({ message: 'image_url must be a valid http(s) URL' });
      }
      if (mirror) {
        // Pull the bytes, run through compression, save locally.
        const stored = await storeImageFromUrl({ folder: 'gallery', sourceUrl });
        const item = await createGalleryItem({
          title, category,
          image_url: stored.url,
          image_public_id: stored.disk_path,
        });
        return res.status(201).json({
          data: decorate(req, item),
          message: stored.compressed
            ? `Imported — compressed to ${(stored.bytes / 1024).toFixed(0)} KB WebP`
            : 'Imported and stored locally',
        });
      }
      // Store the URL directly — no local copy.
      const item = await createGalleryItem({
        title, category,
        image_url: sourceUrl,
        image_public_id: null,
      });
      return res.status(201).json({ data: decorate(req, item), message: 'Linked to remote image' });
    }

    return res.status(400).json({ message: 'Provide either an image file or image_url' });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ message: err.message || 'Server error' });
  }
};

export const update = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const patch = {};
    if (req.body.title !== undefined) patch.title = req.body.title;
    if (req.body.category !== undefined) patch.category = req.body.category;
    if (req.body.is_active !== undefined) patch.is_active = Boolean(req.body.is_active);

    const updated = await updateGalleryItem(id, patch);
    if (!updated) return res.status(404).json({ message: 'Gallery item not found' });
    res.status(200).json({ data: decorate(req, updated), message: 'Gallery item updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};

export const remove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await findGalleryItemById(id);
    if (!existing) return res.status(404).json({ message: 'Gallery item not found' });

    // image_public_id is now the local disk path for owned files.
    // Direct URL imports have NULL — nothing to delete on disk.
    if (existing.image_public_id) {
      // Treat anything that doesn't look like a disk path as a legacy
      // Cloudinary id — silently leave it (we no longer have the SDK wired).
      if (existing.image_public_id.includes('/') && existing.image_public_id.split('/').length === 2) {
        removeStoredImage(existing.image_public_id).catch(() => {});
      }
    }
    await deleteGalleryItem(id);
    res.status(200).json({ data: null, message: 'Gallery item deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Server error' });
  }
};
