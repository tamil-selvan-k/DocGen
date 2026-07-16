import { Router } from 'express';
import { listRepositories, getRepository, syncRepository } from '../controllers/repositories';
import authenticate from '../middleware/auth';

const router = Router();

router.use(authenticate);

// GET /api/v1/repositories
router.get('/', listRepositories);

// GET /api/v1/repositories/:id
router.get('/:id', getRepository);

// POST /api/v1/repositories/:id/sync
router.post('/:id/sync', syncRepository);

export default router;
