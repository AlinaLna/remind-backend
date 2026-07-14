import { Router } from 'express';
<<<<<<< HEAD
import { chatWithAI } from '../controllers/ai.controller';
// import { requireAuth } from '../middlewares/auth'; // Optional: if we want to protect this route

const router = Router();

router.post('/chat', chatWithAI);
=======
import { aiChat } from '../controllers/ai.controller';
import { requireAuth, requireActiveUser } from '../middlewares/auth.middleware';

const router = Router();

// Yêu cầu xác thực người dùng hoạt động để có thể sử dụng AI Chat
router.use(requireAuth, requireActiveUser);

router.post('/chat', aiChat);
>>>>>>> e0c2c457c166cc7aecb7e645d009dce52f469f70

export default router;
