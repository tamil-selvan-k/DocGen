import { Router } from 'express';
import { connect, callback, installApp } from '../controllers/github';
import authenticate from '../middleware/auth';

const router = Router();

// GET /api/v1/github/connect  (protected — redirects to GitHub OAuth)
router.get('/connect', authenticate, connect);

// GET /api/v1/github/install  (protected — redirects to App installation)
router.get('/install', authenticate, installApp);

// GET /api/v1/github/callback  (public — GitHub redirects here with code)
router.get('/callback', callback);

export default router;
