import { Router } from 'express';
import { chatWithAI } from '../controllers/ai.controller';
// import { requireAuth } from '../middlewares/auth'; // Optional: if we want to protect this route

const router = Router();

router.post('/chat', chatWithAI);

export default router;
