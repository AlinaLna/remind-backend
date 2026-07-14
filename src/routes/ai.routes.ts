import { Router } from 'express';
import { aiChat } from '../controllers/ai.controller';
import { requireAuth, requireActiveUser } from '../middlewares/auth.middleware';

const router = Router();

// Yêu cầu xác thực người dùng hoạt động để có thể sử dụng AI Chat
router.use(requireAuth, requireActiveUser);

router.post('/chat', aiChat);

export default router;
