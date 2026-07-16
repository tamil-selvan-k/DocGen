import { Router } from 'express';
import authRoutes from './auth';
import githubRoutes from './github';
import webhookRoutes from './webhooks';
import repositoryRoutes from './repositories';
import jobRoutes from './jobs';
import authenticate from '../middleware/auth';
import { listOrganizations, listInstallations, getVersionContent } from '../controllers/misc';

const apiRouter = Router();

// Health Check
apiRouter.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: { status: 'OK', uptime: process.uptime(), timestamp: new Date().toISOString() },
    error: null,
    meta: { message: 'AutoDocs AI API is healthy' },
  });
});

// Auth: /api/v1/auth/...
apiRouter.use('/auth', authRoutes);

// GitHub OAuth: /api/v1/github/...
apiRouter.use('/github', githubRoutes);

// Webhooks: /api/v1/webhooks/...
apiRouter.use('/webhooks', webhookRoutes);

// Repositories: /api/v1/repositories/...
apiRouter.use('/repositories', repositoryRoutes);

// Jobs: /api/v1/jobs/...
apiRouter.use('/jobs', jobRoutes);

// Organizations: /api/v1/organizations
apiRouter.get('/organizations', authenticate, listOrganizations);

// GitHub App Installations: /api/v1/installations
apiRouter.get('/installations', authenticate, listInstallations);

// Full doc version content: /api/v1/jobs/:jobId/versions/:versionId
apiRouter.get('/jobs/:jobId/versions/:versionId', authenticate, getVersionContent);

export default apiRouter;
