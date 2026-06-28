import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import type { Express } from 'express';
import adminRoutes from '../routes/admin.routes';
import { signToken } from './helpers';
import User from '../models/user.model';
import Report from '../models/report.model';
import Log from '../models/log.model';
import Forum from '../models/forum.model';
import ForumPost from '../models/forumPost.model';
import ForumComment from '../models/forumComment.model';

const buildApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/admin', adminRoutes);
  return app;
};

describe('Admin API security & behavior', () => {
  const app = buildApp();
  const adminId = new mongoose.Types.ObjectId().toString();
  const adminToken = signToken(adminId, 'admin');
  const studentToken = signToken(new mongoose.Types.ObjectId().toString(), 'student');

  describe('Authentication & Authorization', () => {
    it('GET /api/admin/experts/pending returns 401 without token', async () => {
      const res = await request(app).get('/api/admin/experts/pending');
      expect(res.status).toBe(401);
    });

    it('GET /api/admin/experts/pending returns 403 for non-admin role', async () => {
      const res = await request(app)
        .get('/api/admin/experts/pending')
        .set('Authorization', `Bearer ${studentToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /api/admin/experts/pending returns 200 for admin', async () => {
      const res = await request(app)
        .get('/api/admin/experts/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.experts)).toBe(true);
    });

    it('returns 401 for invalid token', async () => {
      const res = await request(app)
        .get('/api/admin/experts/pending')
        .set('Authorization', 'Bearer not-a-real-jwt');
      expect(res.status).toBe(401);
    });
  });

  describe('Expert approval flow', () => {
    const token = signToken(adminId, 'admin');

    it('returns 400 for invalid ObjectId', async () => {
      const res = await request(app)
        .post('/api/admin/experts/not-an-id/approve')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('returns 404 when expert does not exist', async () => {
      const id = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/admin/experts/${id}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });

    it('returns 400 when target is not an expert', async () => {
      const student = await User.create({
        email: 'student@example.com',
        role: 'student',
        status: 'active',
      });
      const res = await request(app)
        .post(`/api/admin/experts/${student._id.toString()}/approve`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });

    it('approves a pending expert, writes a log, and flips status to active', async () => {
      const expert = await User.create({
        email: 'expert@example.com',
        role: 'expert',
        status: 'pending',
        expert: { profile: { bio: 'bio' } },
      });

      const res = await request(app)
        .post(`/api/admin/experts/${expert._id.toString()}/approve`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const updated = await User.findById(expert._id);
      expect(updated).not.toBeNull();
      const updatedUser = updated!;
      expect(updatedUser.status).toBe('active');
      expect(updatedUser.expert!.approval!.reviewedBy!.toString()).toBe(adminId);
      expect(updatedUser.expert!.approval!.reviewedAt).toBeInstanceOf(Date);

      const logs = await Log.find({ action: 'expert.approve' });
      expect(logs).toHaveLength(1);
    });
  });

  describe('Expert rejection flow', () => {
    const token = signToken(adminId, 'admin');

    it('returns 400 when reason is missing', async () => {
      const expert = await User.create({
        email: 'r1@example.com',
        role: 'expert',
        status: 'pending',
      });
      const res = await request(app)
        .post(`/api/admin/experts/${expert._id.toString()}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('rejects expert and records reason in approval metadata + log', async () => {
      const expert = await User.create({
        email: 'r2@example.com',
        role: 'expert',
        status: 'pending',
      });

      const res = await request(app)
        .post(`/api/admin/experts/${expert._id.toString()}/reject`)
        .set('Authorization', `Bearer ${token}`)
        .send({ reason: 'Missing license file' });

      expect(res.status).toBe(200);
      const updated = await User.findById(expert._id);
      expect(updated).not.toBeNull();
      const updatedUser = updated!;
      expect(updatedUser.status).toBe('rejected');
      expect(updatedUser.expert!.approval!.rejectionReason).toBe('Missing license file');

      const logs = await Log.find({ action: 'expert.reject' });
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata).toMatchObject({ reason: 'Missing license file' });
    });
  });

  describe('Forum Management', () => {
    const token = signToken(adminId, 'admin');

    it('creates a new forum section', async () => {
      const res = await request(app)
        .post('/api/admin/forums')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Test Admin Forum', description: 'Test', category: 'admin-cat' });

      expect(res.status).toBe(201);
      expect(res.body.forum).toBeDefined();
      expect(res.body.forum.title).toBe('Test Admin Forum');

      const logs = await Log.find({ action: 'forum.create' });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('updates an existing forum section', async () => {
      const forum = await Forum.create({
        title: 'Old Title',
        description: 'Old',
        category: 'old',
        createdByAdminId: adminId,
      });

      const res = await request(app)
        .patch(`/api/admin/forums/${forum._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(res.status).toBe(200);
      expect(res.body.forum.title).toBe('New Title');

      const logs = await Log.find({ action: 'forum.update' });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('soft deletes a forum section', async () => {
      const forum = await Forum.create({
        title: 'T1', description: 'D1', category: 'C1', createdByAdminId: adminId
      });

      const res = await request(app)
        .delete(`/api/admin/forums/${forum._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.forum.isActive).toBe(false);

      const logs = await Log.find({ action: 'forum.delete' });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('soft deletes a forum post', async () => {
      const forum = await Forum.create({
        title: 'T', description: 'D', category: 'C', createdByAdminId: adminId
      });
      const post = await ForumPost.create({
        forumId: forum._id,
        authorId: new mongoose.Types.ObjectId(),
        authorDisplayMode: 1,
        publicAuthorName: 'Anonymous',
        title: 'To Delete',
        content: 'Bad post',
      });

      const res = await request(app)
        .delete(`/api/admin/forums/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.post.status).toBe('deleted');

      const updatedPost = await ForumPost.findById(post._id);
      expect(updatedPost?.status).toBe('deleted');

      const logs = await Log.find({ action: 'post.delete' });
      expect(logs.length).toBeGreaterThan(0);
    });

    it('soft deletes a forum comment', async () => {
      const forum = await Forum.create({ title: 'T', description: 'D', category: 'C', createdByAdminId: adminId });
      const post = await ForumPost.create({ forumId: forum._id, authorId: new mongoose.Types.ObjectId(), authorDisplayMode: 1, publicAuthorName: 'A', title: 'T', content: 'C', commentCount: 1 });
      const comment = await ForumComment.create({ postId: post._id, authorId: new mongoose.Types.ObjectId(), authorDisplayMode: 1, publicAuthorName: 'A', content: 'C' });

      const res = await request(app)
        .delete(`/api/admin/forums/comments/${comment._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.comment.status).toBe('deleted');

      const updatedPost = await ForumPost.findById(post._id);
      expect(updatedPost?.commentCount).toBe(0);

      const logs = await Log.find({ action: 'comment.delete' });
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('Admin post management', () => {
    const token = signToken(adminId, 'admin');

    it('GET /api/admin/forums/posts returns 200 with pagination', async () => {
      const forum = await Forum.create({ title: 'T', description: 'D', category: 'C', createdByAdminId: adminId });
      await ForumPost.create({ forumId: forum._id, authorId: new mongoose.Types.ObjectId(), authorDisplayMode: 1, publicAuthorName: 'A', title: 'Post 1', content: 'C1', status: 'active' });
      await ForumPost.create({ forumId: forum._id, authorId: new mongoose.Types.ObjectId(), authorDisplayMode: 1, publicAuthorName: 'A', title: 'Post 2', content: 'C2', status: 'deleted' });

      const res = await request(app)
        .get('/api/admin/forums/posts')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.posts)).toBe(true);
      expect(res.body.posts.length).toBeGreaterThanOrEqual(2);
    });

    it('GET /api/admin/forums/posts filters by status', async () => {
      const forum = await Forum.create({ title: 'T', description: 'D', category: 'C', createdByAdminId: adminId });
      await ForumPost.create({ forumId: forum._id, authorId: new mongoose.Types.ObjectId(), authorDisplayMode: 1, publicAuthorName: 'A', title: 'To Filter', content: 'C', status: 'deleted' });

      const res = await request(app)
        .get('/api/admin/forums/posts')
        .query({ status: 'deleted' })
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.posts.length).toBeGreaterThan(0);
      expect(res.body.posts.every((p: any) => p.status === 'deleted')).toBe(true);
    });

    it('GET /api/admin/forums/posts/:postId returns 200', async () => {
      const forum = await Forum.create({ title: 'T', description: 'D', category: 'C', createdByAdminId: adminId });
      const post = await ForumPost.create({ forumId: forum._id, authorId: new mongoose.Types.ObjectId(), authorDisplayMode: 1, publicAuthorName: 'A', title: 'Detail post', content: 'Detail body' });

      const res = await request(app)
        .get(`/api/admin/forums/posts/${post._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.post._id).toBe(post._id.toString());
      expect(Array.isArray(res.body.comments)).toBe(true);
    });

    it('GET /api/admin/forums/posts/:postId returns 404 for missing post', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/admin/forums/posts/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Reports queue', () => {
    const token = signToken(adminId, 'admin');

    it('lists reports, newest first', async () => {
      const reporter = new mongoose.Types.ObjectId();
      const target = new mongoose.Types.ObjectId();
      const older = await Report.create({
        reporterId: reporter,
        targetType: 'post',
        targetId: target,
        reason: 'spam',
        createdAt: new Date(Date.now() - 60_000),
      });
      const newer = await Report.create({
        reporterId: reporter,
        targetType: 'comment',
        targetId: target,
        reason: 'harassment',
        createdAt: new Date(),
      });

      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.reports).toHaveLength(2);
      expect(res.body.reports[0]._id).toBe(newer._id.toString());
      expect(res.body.reports[1]._id).toBe(older._id.toString());
    });

    it('resolves a report, records action and writes a log', async () => {
      const report = await Report.create({
        reporterId: new mongoose.Types.ObjectId(),
        targetType: 'post',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam',
        status: 'open',
      });

      const res = await request(app)
        .post(`/api/admin/reports/${report._id.toString()}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'content-removed' });

      expect(res.status).toBe(200);
      const updated = await Report.findById(report._id);
      expect(updated).not.toBeNull();
      const updatedReport = updated!;
      expect(updatedReport.status).toBe('resolved');
      expect(updatedReport.resolutionAction).toBe('content-removed');
      expect(updatedReport.resolvedBy!.toString()).toBe(adminId);

      const logs = await Log.find({ action: 'report.resolve' });
      expect(logs).toHaveLength(1);
    });

    it('returns 409 when resolving an already-resolved report', async () => {
      const report = await Report.create({
        reporterId: new mongoose.Types.ObjectId(),
        targetType: 'post',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam',
        status: 'resolved',
      });

      const res = await request(app)
        .post(`/api/admin/reports/${report._id.toString()}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send({ action: 'noop' });

      expect(res.status).toBe(409);
    });

    it('returns 400 when action is missing on resolve', async () => {
      const report = await Report.create({
        reporterId: new mongoose.Types.ObjectId(),
        targetType: 'post',
        targetId: new mongoose.Types.ObjectId(),
        reason: 'spam',
      });
      const res = await request(app)
        .post(`/api/admin/reports/${report._id.toString()}/resolve`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
