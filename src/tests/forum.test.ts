import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import type { Express } from 'express';
import forumRoutes from '../routes/forum.routes';
import Forum, { type ForumDoc } from '../models/forum.model';
import ForumPost from '../models/forumPost.model';
import ForumComment from '../models/forumComment.model';
import User from '../models/user.model';
import { signToken } from './helpers';

const buildApp = (): Express => {
  const app = express();
  app.use(express.json());
  app.use('/api/forums', forumRoutes);
  return app;
};

describe('Forum guest browse & search', () => {
  const app = buildApp();

  it('lists only active forums', async () => {
    await Forum.create([
      {
        title: 'Active Forum',
        description: 'visible',
        category: 'general',
        createdByAdminId: new mongoose.Types.ObjectId(),
        isActive: true,
      },
      {
        title: 'Inactive Forum',
        description: 'hidden',
        category: 'general',
        createdByAdminId: new mongoose.Types.ObjectId(),
        isActive: false,
      },
    ]);

    const res = await request(app).get('/api/forums');

    expect(res.status).toBe(200);
    expect(res.body.forums).toHaveLength(1);
    expect(res.body.forums[0].title).toBe('Active Forum');
  });

  it('lists only active posts for a forum and omits authorId', async () => {
    const forum = await Forum.create({
      title: 'Forum',
      description: 'desc',
      category: 'general',
      createdByAdminId: new mongoose.Types.ObjectId(),
      isActive: true,
    });

    const activePost = await ForumPost.create({
      forumId: forum._id,
      authorId: new mongoose.Types.ObjectId(),
      authorDisplayMode: 1,
      publicAuthorName: 'Anonymous',
      title: 'Help me study',
      content: 'Need tips',
      tags: ['study'],
      status: 'active',
    });

    await ForumPost.create({
      forumId: forum._id,
      authorId: new mongoose.Types.ObjectId(),
      authorDisplayMode: 0,
      publicAuthorName: 'Private Name',
      title: 'Hidden post',
      content: 'Nope',
      tags: ['x'],
      status: 'hidden',
    });

    const res = await request(app)
      .get('/api/forums/posts')
      .query({ forumId: forum._id.toString() });

    expect(res.status).toBe(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0]._id).toBe(activePost._id.toString());
    expect(res.body.posts[0].authorId).toBeUndefined();
    expect(JSON.stringify(res.body.posts[0])).not.toContain('authorId');
  });

  it('returns post detail with active comments only and omits authorId', async () => {
    const forum = await Forum.create({
      title: 'Forum',
      description: 'desc',
      category: 'general',
      createdByAdminId: new mongoose.Types.ObjectId(),
      isActive: true,
    });
    const post = await ForumPost.create({
      forumId: forum._id,
      authorId: new mongoose.Types.ObjectId(),
      authorDisplayMode: 1,
      publicAuthorName: 'Anonymous',
      title: 'Need advice',
      content: 'Body',
      tags: ['advice'],
      status: 'active',
    });

    await ForumComment.create([
      {
        postId: post._id,
        authorId: new mongoose.Types.ObjectId(),
        authorDisplayMode: 0,
        publicAuthorName: 'Helper',
        content: 'Try resting',
        status: 'active',
      },
      {
        postId: post._id,
        authorId: new mongoose.Types.ObjectId(),
        authorDisplayMode: 1,
        publicAuthorName: 'Anon',
        content: 'Hidden comment',
        status: 'hidden',
      },
    ]);

    const res = await request(app).get(`/api/forums/posts/${post._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body.post.authorId).toBeUndefined();
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments[0].authorId).toBeUndefined();
  });

  it('searches active posts by text query and omits authorId', async () => {
    const forum = await Forum.create({
      title: 'Forum',
      description: 'desc',
      category: 'general',
      createdByAdminId: new mongoose.Types.ObjectId(),
      isActive: true,
    });

    const match = await ForumPost.create({
      forumId: forum._id,
      authorId: new mongoose.Types.ObjectId(),
      authorDisplayMode: 1,
      publicAuthorName: 'Anonymous',
      title: 'Study plan tips',
      content: 'How to make a study plan',
      tags: ['study', 'plan'],
      status: 'active',
    });

    await ForumPost.create({
      forumId: forum._id,
      authorId: new mongoose.Types.ObjectId(),
      authorDisplayMode: 1,
      publicAuthorName: 'Anonymous',
      title: 'Study plan tips hidden',
      content: 'Should not appear',
      tags: ['study'],
      status: 'hidden',
    });

    const res = await request(app).get('/api/forums/search').query({ q: 'study' });

    expect(res.status).toBe(200);
    const posts = res.body.posts as Array<{ _id: string; authorId?: unknown }>;
    expect(posts.some((post) => post._id === match._id.toString())).toBe(true);
    expect(posts.every((post) => post.authorId === undefined)).toBe(true);
  });
});

describe('Forum signed-in posting', () => {
  const app = buildApp();

  it('returns 401 when creating a post without authentication', async () => {
    const forum = await Forum.create({
      title: 'Forum',
      description: 'desc',
      category: 'general',
      createdByAdminId: new mongoose.Types.ObjectId(),
      isActive: true,
    });

    const res = await request(app)
      .post('/api/forums/posts')
      .send({ title: 'Hello', content: 'World', authorDisplayMode: 0, forumId: forum._id.toString() });

    expect(res.status).toBe(401);
  });

  it('allows an authenticated user to create a post', async () => {
    const forum = await Forum.create({
      title: 'Forum',
      description: 'desc',
      category: 'general',
      createdByAdminId: new mongoose.Types.ObjectId(),
      isActive: true,
    });
    const user = await User.create({
      email: 'student@example.com',
      fullName: 'Student One',
      role: 'student',
      status: 'active',
    });
    const token = signToken(user._id.toString(), user.role);

    const res = await request(app)
      .post('/api/forums/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Need advice',
        content: 'Any tips?',
        tags: ['study'],
        authorDisplayMode: 0,
        forumId: forum._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.post.title).toBe('Need advice');
    expect(res.body.post.publicAuthorName).toBe('Student One');
    expect(res.body.post.authorId).toBeUndefined();

    const saved = await ForumPost.findById(res.body.post._id);
    expect(saved).not.toBeNull();
    const savedPost = saved!;
    expect(savedPost.commentCount).toBe(0);
  });

  it('returns 401 when creating a comment without authentication', async () => {
    const post = await ForumPost.create({
      forumId: new mongoose.Types.ObjectId(),
      authorId: new mongoose.Types.ObjectId(),
      authorDisplayMode: 0,
      publicAuthorName: 'Writer',
      title: 'Need advice',
      content: 'Body',
      tags: [],
      status: 'active',
    });

    const res = await request(app)
      .post(`/api/forums/posts/${post._id.toString()}/comments`)
      .send({ content: 'Helpful', authorDisplayMode: 1 });

    expect(res.status).toBe(401);
  });

  it('allows an authenticated user to create a comment on an active post', async () => {
    const forum = await Forum.create({
      title: 'Forum',
      description: 'desc',
      category: 'general',
      createdByAdminId: new mongoose.Types.ObjectId(),
      isActive: true,
    });
    const author = await User.create({
      email: 'expert@example.com',
      fullName: 'Expert Helper',
      role: 'expert',
      status: 'active',
    });
    const commenter = await User.create({
      email: 'student2@example.com',
      fullName: 'Student Two',
      role: 'student',
      status: 'active',
    });
    const token = signToken(commenter._id.toString(), commenter.role);
    const post = await ForumPost.create({
      forumId: forum._id,
      authorId: author._id,
      authorDisplayMode: 0,
      publicAuthorName: author.fullName ?? 'Expert Helper',
      title: 'Need advice',
      content: 'Body',
      tags: [],
      status: 'active',
      commentCount: 0,
    });

    const res = await request(app)
      .post(`/api/forums/posts/${post._id.toString()}/comments`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Try a study schedule', authorDisplayMode: 1 });

    expect(res.status).toBe(201);
    expect(res.body.comment.content).toBe('Try a study schedule');
    expect(res.body.comment.publicAuthorName).toBe('Anonymous');
    expect(res.body.comment.authorId).toBeUndefined();

    const updatedPost = await ForumPost.findById(post._id);
    expect(updatedPost).not.toBeNull();
    expect(updatedPost!.commentCount).toBe(1);
  });

  it('allows an author to edit their own post and updates public name if mode changes', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const forum = await Forum.create({ title: 'General Support', description: 'Desc', category: 'General', createdByAdminId: adminId });
    const author = await User.create({ email: 'edit-author@test.com', role: 'student', status: 'active', fullName: 'Real Edit Name' });
    const token = signToken(author._id.toString(), 'student', 'active', 'Real Edit Name');

    const post = await ForumPost.create({
      forumId: forum._id,
      authorId: author._id,
      authorDisplayMode: 1,
      publicAuthorName: 'Anonymous',
      title: 'Original Title',
      content: 'Original content',
    });

    const res = await request(app)
      .patch(`/api/forums/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Edited Title', authorDisplayMode: 0 });

    expect(res.status).toBe(200);
    expect(res.body.post.title).toBe('Edited Title');
    expect(res.body.post.publicAuthorName).toBe('Real Edit Name');
  });

  it('prevents a user from editing someone else\'s post', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const forum = await Forum.create({ title: 'General Support', description: 'Desc', category: 'General', createdByAdminId: adminId });
    const author = await User.create({ email: 'author1@test.com', role: 'student', status: 'active' });
    const hacker = await User.create({ email: 'hacker@test.com', role: 'student', status: 'active' });
    const hackerToken = signToken(hacker._id.toString(), 'student');

    const post = await ForumPost.create({
      forumId: forum._id,
      authorId: author._id,
      authorDisplayMode: 1,
      publicAuthorName: 'Anonymous',
      title: 'My safe post',
      content: 'Safe content',
    });

    const res = await request(app)
      .patch(`/api/forums/posts/${post._id}`)
      .set('Authorization', `Bearer ${hackerToken}`)
      .send({ content: 'Hacked content' });

    expect(res.status).toBe(403);
  });

  it('allows an author to delete their own post', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const forum = await Forum.create({ title: 'T', description: 'D', category: 'C', createdByAdminId: adminId });
    const author = await User.create({ email: 'del-author@test.com', role: 'student', status: 'active' });
    const token = signToken(author._id.toString(), 'student');

    const post = await ForumPost.create({ forumId: forum._id, authorId: author._id, authorDisplayMode: 1, publicAuthorName: 'A', title: 'T', content: 'C' });

    const res = await request(app)
      .delete(`/api/forums/posts/${post._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.post.status).toBe('deleted');
  });

  it('allows an author to edit and delete their own comment', async () => {
    const adminId = new mongoose.Types.ObjectId();
    const forum = await Forum.create({ title: 'T', description: 'D', category: 'C', createdByAdminId: adminId });
    const author = await User.create({ email: 'com-author@test.com', role: 'student', status: 'active' });
    const token = signToken(author._id.toString(), 'student');

    const post = await ForumPost.create({ forumId: forum._id, authorId: adminId, authorDisplayMode: 1, publicAuthorName: 'A', title: 'T', content: 'C', commentCount: 1 });
    const comment = await ForumComment.create({ postId: post._id, authorId: author._id, authorDisplayMode: 1, publicAuthorName: 'Anonymous', content: 'Original' });

    const editRes = await request(app)
      .patch(`/api/forums/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: 'Edited', authorDisplayMode: 0 });

    expect(editRes.status).toBe(200);
    expect(editRes.body.comment.content).toBe('Edited');

    const delRes = await request(app)
      .delete(`/api/forums/comments/${comment._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(delRes.status).toBe(200);
    expect(delRes.body.comment.status).toBe('deleted');

    const updatedPost = await ForumPost.findById(post._id);
    expect(updatedPost?.commentCount).toBe(0);
  });
});
