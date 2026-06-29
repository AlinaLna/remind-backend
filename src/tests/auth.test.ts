import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import type { Express } from 'express';
import authRoutes from '../routes/auth.routes';
import User from '../models/user.model';

const buildApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  return app;
};

const createPasswordHash = async (password: string): Promise<string> => bcrypt.hash(password, 12);
const digestToken = (value: string): string => createHash('sha256').update(value).digest('hex');

describe('Auth API', () => {
  const app = buildApp();

  describe('POST /api/auth/register', () => {
    it('registers a student as active', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'student@example.com', password: 'Password123!', fullName: 'Student One' });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: 'student@example.com',
        fullName: 'Student One',
        role: 'student',
        status: 'active',
      });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));

      const stored = await User.findOne({ email: 'student@example.com' }).select('+refreshToken');
      expect(stored).not.toBeNull();
      expect(stored?.refreshToken).toEqual(expect.any(String));
    });

    it('registers an expert as pending', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'expert@example.com', password: 'Password123!', fullName: 'Expert One', role: 'expert' });

      expect(res.status).toBe(201);
      expect(res.body.user).toMatchObject({
        email: 'expert@example.com',
        role: 'expert',
        status: 'pending',
      });
    });

    it('rejects duplicate email registration', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@example.com', password: 'Password123!', fullName: 'Dup One' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'dup@example.com', password: 'Password123!', fullName: 'Dup Two' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in successfully and rotates refresh token', async () => {
      const hashedPassword = await createPasswordHash('Password123!');
      const user = await User.create({
        email: 'login@example.com',
        password: hashedPassword,
        fullName: 'Login User',
        role: 'student',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        id: user._id.toString(),
        email: 'login@example.com',
        role: 'student',
        status: 'active',
      });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));

      const stored = await User.findById(user._id).select('+refreshToken');
      expect(stored?.refreshToken).toEqual(expect.any(String));
      expect(await bcrypt.compare(digestToken(res.body.refreshToken), stored!.refreshToken!)).toBe(true);
    });

    it('rejects wrong password', async () => {
      await User.create({
        email: 'wrongpass@example.com',
        password: await createPasswordHash('Password123!'),
        fullName: 'Wrong Pass',
        role: 'student',
        status: 'active',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrongpass@example.com', password: 'nope' });

      expect(res.status).toBe(401);
    });

    it('blocks banned users', async () => {
      await User.create({
        email: 'banned@example.com',
        password: await createPasswordHash('Password123!'),
        fullName: 'Banned User',
        role: 'student',
        status: 'banned',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'banned@example.com', password: 'Password123!' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('rotates valid refresh tokens and rejects reused or invalid ones', async () => {
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ email: 'refresh@example.com', password: 'Password123!', fullName: 'Refresh User' });

      const originalRefreshToken = registerRes.body.refreshToken as string;

      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken });

      expect(firstRefresh.status).toBe(200);
      expect(firstRefresh.body.refreshToken).toEqual(expect.any(String));
      expect(firstRefresh.body.refreshToken).not.toBe(originalRefreshToken);

      const reused = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: originalRefreshToken });

      expect(reused.status).toBe(401);

      const invalid = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'not-a-real-token' });

      expect(invalid.status).toBe(401);
    });
  });

  describe('POST /api/auth/google', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    });

    afterEach(() => {
      delete (global as any).fetch;
    });

    it('creates a new user from Google token and returns tokens', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sub: 'google-sub-123',
          email: 'googleuser@example.com',
          name: 'Google User',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ googleToken: 'valid-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        email: 'googleuser@example.com',
        fullName: 'Google User',
        role: 'student',
        status: 'active',
      });
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));

      const stored = await User.findOne({ email: 'googleuser@example.com' });
      expect(stored).not.toBeNull();
      expect(stored?.googleId).toBe('google-sub-123');
    });

    it('logs in existing user by Google email and links googleId', async () => {
      const user = await User.create({
        email: 'existing@example.com',
        fullName: 'Existing User',
        role: 'student',
        status: 'active',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sub: 'google-sub-456',
          email: 'existing@example.com',
          name: 'Existing User',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ googleToken: 'valid-google-token' });

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({
        id: user._id.toString(),
        email: 'existing@example.com',
      });

      const stored = await User.findById(user._id);
      expect(stored?.googleId).toBe('google-sub-456');
    });

    it('rejects banned users', async () => {
      await User.create({
        email: 'bannedgoogle@example.com',
        fullName: 'Banned Google',
        role: 'student',
        status: 'banned',
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          sub: 'google-sub-789',
          email: 'bannedgoogle@example.com',
          name: 'Banned Google',
        }),
      });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ googleToken: 'valid-google-token' });

      expect(res.status).toBe(403);
    });

    it('rejects missing token', async () => {
      const res = await request(app)
        .post('/api/auth/google')
        .send({});

      expect(res.status).toBe(400);
    });

    it('rejects invalid Google token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const res = await request(app)
        .post('/api/auth/google')
        .send({ googleToken: 'bad-token' });

      expect(res.status).toBe(401);
    });
  });
});
