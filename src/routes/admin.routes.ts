import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth.middleware';
import { approveExpert, getPendingExperts, getReports, rejectExpert, resolveReport, createForum, updateForum, deleteForumPost, deleteForum, deleteForumComment } from '../controllers/admin.controller';

const router = Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.post('/forums', createForum);
router.patch('/forums/:forumId', updateForum);
router.delete('/forums/:forumId', deleteForum);
router.delete('/forums/posts/:postId', deleteForumPost);
router.delete('/forums/comments/:commentId', deleteForumComment);

router.get('/experts/pending', getPendingExperts);
router.post('/experts/:id/approve', approveExpert);
router.post('/experts/:id/reject', rejectExpert);

router.get('/reports', getReports);
router.post('/reports/:id/resolve', resolveReport);

export default router;
