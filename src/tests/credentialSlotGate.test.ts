import express from 'express';
import request from 'supertest';
import type { Express } from 'express';
import mongoose from 'mongoose';
import expertRoutes from '../routes/expert.routes';
import adminRoutes from '../routes/admin.routes';
import User from '../models/user.model';
import ExpertSlot from '../models/expertSlot.model';
import { signToken } from './helpers';

const buildApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/experts', expertRoutes);
  app.use('/api/admin', adminRoutes);
  return app;
};

const app = buildApp();

const makeExpert = async (overrides: Record<string, unknown> = {}) => {
  const id = new mongoose.Types.ObjectId();
  await User.create({
    _id: id,
    email: `expert-${id}@test.com`,
    role: 'expert',
    status: 'pending',
    ...overrides,
  });
  return { id: id.toString(), token: signToken(id.toString(), 'expert', 'pending', 'Expert') };
};

const makeAdmin = () => {
  const id = new mongoose.Types.ObjectId().toString();
  return { id, token: signToken(id, 'admin', 'active', 'Admin') };
};

const slotPayload = () => ({
  slots: [
    {
      startAt: new Date(Date.now() + 86400000).toISOString(),
      endAt: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      price: 300000,
    },
  ],
});

describe('Expert credential verification + slot-gating', () => {
  describe('Slot creation gate (isValidatedExpert)', () => {
    it('(a) returns 403 when expert is NOT validated', async () => {
      const expert = await makeExpert(); // isValidatedExpert defaults to false

      const res = await request(app)
        .post(`/api/experts/${expert.id}/slots`)
        .set('Authorization', `Bearer ${expert.token}`)
        .send(slotPayload());

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/not validated/i);

      const slots = await ExpertSlot.find({ expertId: new mongoose.Types.ObjectId(expert.id) });
      expect(slots).toHaveLength(0);
    });

    it('(b) returns 201 when expert IS validated', async () => {
      const expert = await makeExpert({ status: 'active', isValidatedExpert: true });

      const res = await request(app)
        .post(`/api/experts/${expert.id}/slots`)
        .set('Authorization', `Bearer ${expert.token}`)
        .send(slotPayload());

      expect(res.status).toBe(201);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots).toHaveLength(1);

      const slots = await ExpertSlot.find({ expertId: new mongoose.Types.ObjectId(expert.id) });
      expect(slots).toHaveLength(1);
      expect(slots[0].status).toBe('available');
    });

    it('returns 403 for a different expert id (ownership check)', async () => {
      const expert = await makeExpert({ status: 'active', isValidatedExpert: true });
      const other = await makeExpert({ status: 'active', isValidatedExpert: true });

      const res = await request(app)
        .post(`/api/experts/${other.id}/slots`)
        .set('Authorization', `Bearer ${expert.token}`)
        .send(slotPayload());

      expect(res.status).toBe(403);
    });
  });

  describe('Admin approve / reject flips isValidatedExpert', () => {
    it('(c) approve sets status=active AND isValidatedExpert=true', async () => {
      const admin = makeAdmin();
      const expert = await makeExpert();

      const res = await request(app)
        .post(`/api/admin/experts/${expert.id}/approve`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);

      const updated = await User.findById(expert.id);
      expect(updated?.status).toBe('active');
      expect(updated?.isValidatedExpert).toBe(true);
    });

    it('(d) reject does NOT set isValidatedExpert and keeps it false', async () => {
      const admin = makeAdmin();
      const expert = await makeExpert();

      const res = await request(app)
        .post(`/api/admin/experts/${expert.id}/reject`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ reason: 'License number invalid' });

      expect(res.status).toBe(200);

      const updated = await User.findById(expert.id);
      expect(updated?.status).toBe('rejected');
      expect(updated?.isValidatedExpert).toBe(false);
      expect(updated?.expert?.approval?.rejectionReason).toBe('License number invalid');
    });

    it('reject requires a reason (400)', async () => {
      const admin = makeAdmin();
      const expert = await makeExpert();

      const res = await request(app)
        .post(`/api/admin/experts/${expert.id}/reject`)
        .set('Authorization', `Bearer ${admin.token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('Pending experts list includes credentials', () => {
    it('GET /api/admin/experts/pending returns pending experts with expert.credentials', async () => {
      const admin = makeAdmin();
      const expert = await makeExpert({ expert: { credentials: [{ fileName: 'license.pdf' }] } });

      const res = await request(app)
        .get('/api/admin/experts/pending')
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.experts)).toBe(true);
      const found = res.body.experts.find((e: any) => e._id === expert.id);
      expect(found).toBeDefined();
      expect(found.expert.credentials[0].fileName).toBe('license.pdf');
    });
  });

  describe('Credential upload + GridFS download', () => {
    it('(e) upload stores a GridFS fileId and admin can stream it back', async () => {
      const admin = makeAdmin();
      const expert = await makeExpert();

      const fileContent = Buffer.from('fake-license-content-12345');

      const uploadRes = await request(app)
        .post('/api/experts/me/credentials')
        .set('Authorization', `Bearer ${expert.token}`)
        .attach('file', fileContent, 'license.pdf');

      expect(uploadRes.status).toBe(200);
      expect(uploadRes.body.credentials).toBeDefined();
      const creds = uploadRes.body.credentials;
      expect(Array.isArray(creds)).toBe(true);
      expect(creds[0].fileName).toBe('license.pdf');
      expect(creds[0].fileId).toBeDefined();

      const fileId = creds[0].fileId;
      expect(mongoose.Types.ObjectId.isValid(fileId)).toBe(true);

      // Persisted on the user document
      const stored = await User.findById(expert.id).select('expert.credentials');
      expect(stored?.expert?.credentials?.[0]?.fileId?.toString()).toBe(fileId);

      // Admin downloads the credential file via GridFS stream
      const downloadRes = await request(app)
        .get(`/api/admin/experts/${expert.id}/credential/${fileId}`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-disposition']).toContain('license.pdf');
      // supertest parses a binary stream body as an object; read raw bytes from the response instead
      const raw = (downloadRes as any).text ?? Buffer.from(downloadRes.body as any).toString();
      expect(raw).toBe('fake-license-content-12345');
    });

    it('upload returns 400 when no file is attached', async () => {
      const expert = await makeExpert();

      const res = await request(app)
        .post('/api/experts/me/credentials')
        .set('Authorization', `Bearer ${expert.token}`);

      expect(res.status).toBe(400);
    });

    it('download returns 404 when expert has no credential file', async () => {
      const admin = makeAdmin();
      const expert = await makeExpert();

      const res = await request(app)
        .get(`/api/admin/experts/${expert.id}/credential`)
        .set('Authorization', `Bearer ${admin.token}`);

      expect(res.status).toBe(404);
    });

    it('download is admin-gated (403 for non-admin)', async () => {
      const expert = await makeExpert();
      const studentToken = signToken(new mongoose.Types.ObjectId().toString(), 'student', 'active', 'Student');

      const res = await request(app)
        .get(`/api/admin/experts/${expert.id}/credential`)
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });
  });
});
