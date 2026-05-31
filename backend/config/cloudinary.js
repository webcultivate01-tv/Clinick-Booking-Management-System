import cloudinaryPkg from 'cloudinary';
import streamifier from 'streamifier';

const cloudinary = cloudinaryPkg.v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };

/**
 * Streams a multer in-memory Buffer to Cloudinary and resolves with the
 * full upload response. Use `result.secure_url` and `result.public_id`.
 */
export function uploadToCloudinary(buffer, { folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'lumiere-clinic', publicId } = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: publicId, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}

export async function deleteFromCloudinary(publicId) {
  if (!publicId) return null;
  return cloudinary.uploader.destroy(publicId);
}
