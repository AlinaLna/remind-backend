import { beforeAll, afterAll, afterEach } from '@jest/globals';
import { clearTestDb, connectTestDb, disconnectTestDb } from './testDb';

let initialized = false;

const setupTestEnv = async (): Promise<void> => {
  if (initialized) return;
  await connectTestDb();
  initialized = true;
};

const teardownTestEnv = async (): Promise<void> => {
  if (!initialized) return;
  await disconnectTestDb();
  initialized = false;
};

beforeAll(async () => {
  await setupTestEnv();
});

afterEach(async () => {
  if (initialized) await clearTestDb();
});

afterAll(async () => {
  await teardownTestEnv();
});
