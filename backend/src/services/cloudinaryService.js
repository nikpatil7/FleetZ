// backend/src/services/cloudinaryService.js
import { v2 as cloudinary } from 'cloudinary';
import env from '../config/env.js';

cloudinary.config({
  cloud_name: env.cloudinaryName,
  api_key: env.cloudinaryKey,
  api_secret: env.cloudinarySecret,
  secure: true,
});

export async function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(buffer);
  });
}

export default { uploadBuffer };
