import { Router } from 'express';
import { signup, login, me, refresh, logout, changePassword } from '../controllers/auth';
import authenticate from '../middleware/auth';

const router = Router();

// POST /api/v1/auth/signup
router.post('/signup', signup);

// POST /api/v1/auth/login
router.post('/login', login);

// POST /api/v1/auth/refresh  — uses HTTP-only refreshToken cookie
router.post('/refresh', refresh);

// POST /api/v1/auth/logout  (protected)
router.post('/logout', authenticate, logout);

// GET /api/v1/auth/me  (protected)
router.get('/me', authenticate, me);

// PATCH /api/v1/auth/password  (protected)
router.patch('/password', authenticate, changePassword);

export default router;
