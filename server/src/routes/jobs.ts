import { Router } from 'express';
import { listJobs, getJob } from '../controllers/jobs';
import authenticate from '../middleware/auth';

const router = Router();

// All job routes require authentication
router.use(authenticate);

// GET /api/v1/jobs
router.get('/', listJobs);

// GET /api/v1/jobs/:id
router.get('/:id', getJob);

export default router;
