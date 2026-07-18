import mongoose from 'mongoose';

// ponytail: GridFS bucket for credential/attachment files, same MongoDB connection as mongoose
export const getGridFS = (): mongoose.mongo.GridFSBucket => {
  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB not connected');
  return new mongoose.mongo.GridFSBucket(db, { bucketName: 'credentials' });
};

export const uploadToGridFS = (buffer: Buffer, filename: string): Promise<mongoose.Types.ObjectId> => {
  return new Promise((resolve, reject) => {
    const bucket = getGridFS();
    const uploadStream = bucket.openUploadStream(filename);
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(uploadStream.id as mongoose.Types.ObjectId));
    uploadStream.end(buffer);
  });
};

export const downloadFromGridFS = (id: mongoose.Types.ObjectId): mongoose.mongo.GridFSBucketReadStream => {
  return getGridFS().openDownloadStream(id);
};
