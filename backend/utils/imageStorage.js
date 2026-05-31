/**
 * Local-disk image storage with on-the-fly WebP compression.
 *
 * Pipeline (file upload):
 *   1. Read the multer in-memory buffer.
 *   2. If size > COMPRESS_THRESHOLD (default 1 MB) — re-encode with sharp:
 *      - convert to WebP (quality 80)
 *      - clamp longest edge to MAX_DIMENSION (default 1920 px)
 *      so the stored file is small and the DB only holds a short path.
 *   3. Write to backend/public/uploads/<folder>/<hash><ext>.
 *   4. Return the public URL (eg `/uploads/gallery/abc123.webp`) and the
 *      relative disk path (so we can delete later).
 *
 * Pipeline (URL import):
 *   1. Fetch the remote URL (10 MB ceiling, image/* content-type required).
 *   2. Feed the buffer through the same compress+write path.
 *
 * Filenames are content-hashed (sha1 of the bytes) so re-uploading the same
 * image overwrites itself rather than piling up duplicates.
 */
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.resolve(__dirname, '..', 'public', 'uploads');

export const COMPRESS_THRESHOLD = 1024 * 1024;        // 1 MB
const MAX_DIMENSION              = 1920;              // px (longest side)
const URL_FETCH_LIMIT            = 10 * 1024 * 1024;  // 10 MB hard cap
const URL_FETCH_TIMEOUT_MS       = 15_000;            // 15 s

function ensureSafeFolder(folder) {
  // Whitelist: alnum + dash + underscore. Anything else means a caller is
  // trying to escape the uploads dir via "../" — refuse.
  if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
    const err = new Error('Invalid storage folder name');
    err.statusCode = 400;
    throw err;
  }
}

async function compressIfNeeded(buffer, originalMime) {
  // Skip compression for already-small files unless they're huge dimensions.
  // sharp's metadata() is cheap so we always run it.
  const meta = await sharp(buffer, { failOn: 'none' }).metadata().catch(() => null);
  const tooBigBytes = buffer.length > COMPRESS_THRESHOLD;
  const tooBigDims = meta && (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION);
  const isGif = originalMime === 'image/gif'; // preserve GIFs as-is (animation)

  if (isGif || (!tooBigBytes && !tooBigDims)) {
    return { buffer, mime: originalMime, ext: extFromMime(originalMime), compressed: false };
  }

  const out = await sharp(buffer, { failOn: 'none' })
    .rotate() // honour EXIF orientation
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  return { buffer: out, mime: 'image/webp', ext: '.webp', compressed: true };
}

function extFromMime(mime) {
  switch (mime) {
    case 'image/jpeg': return '.jpg';
    case 'image/png':  return '.png';
    case 'image/webp': return '.webp';
    case 'image/gif':  return '.gif';
    case 'image/avif': return '.avif';
    case 'image/bmp':  return '.bmp';
    case 'image/tiff': return '.tiff';
    default: return '.bin';
  }
}

/**
 * Save an image buffer to disk under <folder>/<sha1><ext>.
 * Returns { url, disk_path, bytes, compressed, mime }.
 */
export async function storeImageBuffer({ folder, buffer, mime }) {
  ensureSafeFolder(folder);
  const processed = await compressIfNeeded(buffer, mime);
  const hash = crypto.createHash('sha1').update(processed.buffer).digest('hex').slice(0, 24);
  const filename = `${hash}${processed.ext}`;
  const folderPath = path.join(UPLOADS_ROOT, folder);
  await fs.mkdir(folderPath, { recursive: true });
  const fullPath = path.join(folderPath, filename);
  await fs.writeFile(fullPath, processed.buffer);

  // Path used to serve the file + the path used to delete it later.
  const url = `/uploads/${folder}/${filename}`;
  const disk_rel = path.posix.join(folder, filename);
  return {
    url,
    disk_path: disk_rel,
    bytes: processed.buffer.length,
    compressed: processed.compressed,
    mime: processed.mime,
    width: null,
    height: null,
  };
}

/**
 * Download a remote image URL into a buffer, then store it through the same
 * compress+write pipeline. Throws 4xx/5xx with helpful messages.
 */
export async function storeImageFromUrl({ folder, sourceUrl }) {
  ensureSafeFolder(folder);

  let parsed;
  try { parsed = new URL(sourceUrl); }
  catch {
    const err = new Error('image_url is not a valid URL');
    err.statusCode = 400;
    throw err;
  }
  if (!/^https?:$/.test(parsed.protocol)) {
    const err = new Error('image_url must use http or https');
    err.statusCode = 400;
    throw err;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), URL_FETCH_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(sourceUrl, { signal: ctrl.signal, redirect: 'follow' });
  } catch (e) {
    const err = new Error(`Could not fetch image: ${e.message}`);
    err.statusCode = 502;
    throw err;
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) {
    const err = new Error(`Image fetch returned HTTP ${resp.status}`);
    err.statusCode = 502;
    throw err;
  }

  const ctype = resp.headers.get('content-type') || '';
  if (!/^image\//i.test(ctype)) {
    const err = new Error(`URL does not point at an image (got ${ctype || 'unknown content-type'})`);
    err.statusCode = 415;
    throw err;
  }

  const ab = await resp.arrayBuffer();
  const buffer = Buffer.from(ab);
  if (buffer.length > URL_FETCH_LIMIT) {
    const err = new Error(`Image is too large (>${Math.round(URL_FETCH_LIMIT / 1024 / 1024)}MB)`);
    err.statusCode = 413;
    throw err;
  }

  return storeImageBuffer({ folder, buffer, mime: ctype.split(';')[0].trim() });
}

/**
 * Delete a previously-stored image. `disk_path` is the value we returned
 * from storeImageBuffer (relative, eg "gallery/abc.webp"). Best-effort — we
 * swallow ENOENT so re-running deletes doesn't 500.
 */
export async function removeStoredImage(disk_path) {
  if (!disk_path) return;
  // Defensive: refuse anything that would escape UPLOADS_ROOT.
  const resolved = path.resolve(UPLOADS_ROOT, disk_path);
  if (!resolved.startsWith(UPLOADS_ROOT + path.sep)) return;
  try { await fs.unlink(resolved); }
  catch (e) { if (e.code !== 'ENOENT') console.error('[image] delete failed:', e.message); }
}
