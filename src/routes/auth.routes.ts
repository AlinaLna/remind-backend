import { Router } from 'express';
import { googleLogin, login, logout, refresh, register } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/refresh', refresh);
router.post('/logout', logout);

export default router;
