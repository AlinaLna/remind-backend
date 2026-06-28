import { Router } from 'express';
import { createComment, createPost, updatePost, deletePost, updateComment, deleteComment, getPostDetail, listForumPosts, listForums, searchPosts, toggleLike } from '../controllers/forum.controller';
import { requireAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', listForums);
router.get('/search', searchPosts);
router.get('/posts/:postId', getPostDetail);
router.patch('/posts/:postId', requireAuth, updatePost);
router.delete('/posts/:postId', requireAuth, deletePost);
router.post('/posts', requireAuth, createPost);
router.post('/posts/:postId/like', requireAuth, toggleLike);
router.patch('/comments/:commentId', requireAuth, updateComment);
router.delete('/comments/:commentId', requireAuth, deleteComment);
router.post('/posts/:postId/comments', requireAuth, createComment);
router.get('/posts', listForumPosts);

export default router;
