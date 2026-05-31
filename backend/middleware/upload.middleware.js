import multer from 'multer';

/**
 * In-memory storage so the controller can pipe the buffer into sharp
 * (compress + transcode to WebP) before writing to disk.
 */
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!/^image\/(jpe?g|png|webp|gif|avif|bmp|tiff)$/u.test(file.mimetype)) {
    const err = new Error('Only image uploads are allowed (JPG, PNG, WEBP, GIF, AVIF, BMP, TIFF)');
    err.statusCode = 415;
    return cb(err);
  }
  cb(null, true);
};

// 20 MB ceiling — anything bigger is almost certainly an accident. Files
// above the COMPRESS_THRESHOLD (see image.util.js) get re-encoded to WebP.
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 },
});
