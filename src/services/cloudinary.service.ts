import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (fileBuffer: Buffer, folder: string): Promise<string> => {
  try {
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!apiSecret) {
      const base64Data = fileBuffer.toString('base64');
      return `data:image/jpeg;base64,${base64Data}`;
    }

    return new Promise((resolve) => {
      cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) {
            console.error('Lỗi khi upload Cloudinary, chuyển hướng sang base64:', error);
            const base64Data = fileBuffer.toString('base64');
            return resolve(`data:image/jpeg;base64,${base64Data}`);
          }
          resolve(result?.secure_url || '');
        }
      ).end(fileBuffer);
    });
  } catch (err) {
    console.error('Lỗi Cloudinary Service, sử dụng fallback base64:', err);
    const base64Data = fileBuffer.toString('base64');
    return `data:image/jpeg;base64,${base64Data}`;
  }
};
