import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';
import { addDocJob } from '../queue';
import { logger } from '../utils/logger';

const syncSchema = z.object({
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i, 'Invalid commit SHA format').optional(),
});

/**
 * GET /api/v1/repositories
 * Lists repositories visible to the authenticated user's linked GitHub account.
 */
export const listRepositories = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const githubAccount = await prisma.gitHubAccount.findUnique({
    where: { userId: req.user.id },
  });

  if (!githubAccount) {
    throw new ApiError('No GitHub account connected. Please connect your GitHub account first.', 400);
  }

  const ghResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
    headers: {
      Authorization: `Bearer ${githubAccount.accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AutoDocs-AI',
    },
  });

  if (!ghResponse.ok) throw new ApiError('Failed to fetch repositories from GitHub', 502);

  const ghRepos = (await ghResponse.json()) as Array<{
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    updated_at: string;
    default_branch: string;
  }>;

  const trackedRepoIds = new Set(
    (await prisma.repository.findMany({ select: { id: true } })).map(r => r.id)
  );

  const repos = ghRepos.map(r => ({
    id: String(r.id),
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    htmlUrl: r.html_url,
    description: r.description,
    updatedAt: r.updated_at,
    defaultBranch: r.default_branch,
    isTracked: trackedRepoIds.has(String(r.id)),
  }));

  return new ApiResponse(200, repos, 'Repositories fetched successfully', {
    message: 'Repositories fetched successfully',
    total: repos.length,
  });
});

/**
 * GET /api/v1/repositories/:id
 * Returns details for a single repository (tracked or not).
 */
export const getRepository = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const githubAccount = await prisma.gitHubAccount.findUnique({
    where: { userId: req.user.id },
  });
  if (!githubAccount) throw new ApiError('No GitHub account connected', 400);

  const id = String(req.params.id);

  const ghResponse = await fetch(`https://api.github.com/repositories/${id}`, {
    headers: {
      Authorization: `Bearer ${githubAccount.accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AutoDocs-AI',
    },
  });

  if (ghResponse.status === 404) throw new ApiError('Repository not found on GitHub', 404);
  if (!ghResponse.ok) throw new ApiError('Failed to fetch repository from GitHub', 502);

  const repo = (await ghResponse.json()) as {
    id: number; name: string; full_name: string; private: boolean;
    html_url: string; description: string | null; updated_at: string; default_branch: string;
  };

  const tracked = await prisma.repository.findUnique({ where: { id: String(repo.id) } });

  return new ApiResponse(200, {
    id: String(repo.id),
    name: repo.name,
    fullName: repo.full_name,
    private: repo.private,
    htmlUrl: repo.html_url,
    description: repo.description,
    updatedAt: repo.updated_at,
    defaultBranch: repo.default_branch,
    isTracked: !!tracked,
  });
});

/**
 * POST /api/v1/repositories/:id/sync
 * Triggers documentation generation for a repository.
 * Backend auto-resolves the GitHub App installation — installationId is NEVER required from client.
 * If commitSha is not provided, uses latest commit from the default branch.
 */
export const syncRepository = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const repositoryId = String(req.params.id);

  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError('Validation failed', 400, parsed.error.issues);

  // Resolve repository record
  const repository = await prisma.repository.findUnique({ where: { id: repositoryId } });
  if (!repository) throw new ApiError('Repository not found. Push a commit first to register it.', 404);

  const [owner, repoName] = repository.fullName.split('/');

  // Auto-resolve installation from DB — match by owner (targetId)
  const githubAccount = await prisma.gitHubAccount.findUnique({ where: { userId: req.user.id } });
  if (!githubAccount) throw new ApiError('No GitHub account connected', 400);

  // Find the installation that covers this repository's owner
  const installation = await prisma.gitHubInstallation.findFirst({
    where: { targetId: String(repository.organizationId) },
  });

  if (!installation) {
    throw new ApiError(
      'No GitHub App installation found for this repository. Please install the GitHub App on your organization/account first.',
      400
    );
  }

  const installationId = installation.id;

  // Resolve commit SHA — use provided or fetch latest from GitHub
  let commitSha = parsed.data.commitSha;

  if (!commitSha) {

    // Simplified: fetch default branch ref
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/main`,
      {
        headers: {
          Authorization: `Bearer ${githubAccount.accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'AutoDocs-AI',
        },
      }
    );

    if (!refRes.ok) throw new ApiError('Failed to resolve latest commit SHA from GitHub', 502);
    const refData = (await refRes.json()) as { object: { sha: string } };
    commitSha = refData.object.sha;
  }

  const eventId = `manual-${req.user.id}-${commitSha}`;

  // Idempotency check
  const existingJob = await prisma.documentationJob.findUnique({
    where: { repositoryId_commitSha_eventId: { repositoryId, commitSha, eventId } },
  });

  if (existingJob) {
    return new ApiResponse(200, { jobId: existingJob.id }, 'Job already exists for this commit');
  }

  const job = await prisma.documentationJob.create({
    data: { repositoryId, commitSha, eventId, status: 'QUEUED' },
  });

  await addDocJob({
    jobId: job.id,
    repositoryId,
    commitSha,
    installationId,
    owner,
    repo: repoName,
    defaultBranch: 'main',
  });

  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'MANUAL_SYNC',
      details: JSON.stringify({ repositoryId, commitSha, jobId: job.id }),
    },
  });

  logger.info(`Manual sync by user ${req.user.id} for ${repository.fullName}@${commitSha.slice(0, 7)}`);

  return new ApiResponse(201, { jobId: job.id }, 'Documentation sync job queued successfully');
});
