import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer | null = null;

const isInMemoryFallback = (): boolean => {
  const uri = process.env.MONGODB_URI || '';
  return uri.startsWith('mongodb://localhost:27017') && !process.env.MONGODB_ALLOW_LOCAL;
};

export const connectTestDb = async (): Promise<void> => {
  if (isInMemoryFallback()) {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();
  }
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/remind';
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
};

export const clearTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    const collections = await mongoose.connection.db.collections();
    await Promise.all(collections.map((c) => c.deleteMany({})));
  }
};

export const disconnectTestDb = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
  }
};
