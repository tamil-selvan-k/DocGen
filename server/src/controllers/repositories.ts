import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';
import { addDocJob } from '../queue';
import { logger } from '../utils/logger';
import { config } from '../config/env';
import { GitHubClient } from '../utils/github';

// Returns a valid access token for the user's linked GitHub account.
// Attempts a token refresh when the token is expired and a refresh_token is stored.
// Deletes the stale DB record and throws a 401 when the token cannot be recovered.
async function getValidGitHubToken(userId: string): Promise<{ account: NonNullable<Awaited<ReturnType<typeof prisma.gitHubAccount.findUnique>>>; token: string }> {
  const account = await prisma.gitHubAccount.findUnique({ where: { userId } });
  if (!account) throw new ApiError('No GitHub account connected. Please connect your GitHub account first.', 400);

  // If no expiry is stored the token is a classic OAuth token (no expiry), use as-is.
  if (!account.expiresAt || account.expiresAt > new Date()) {
    return { account, token: account.accessToken };
  }

  // Token is expired — attempt refresh if we have a refresh_token.
  if (account.refreshToken) {
    const refreshRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.GITHUB_CLIENT_ID,
        client_secret: config.GITHUB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: account.refreshToken,
      }),
    });

    if (refreshRes.ok) {
      const data = (await refreshRes.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
        error?: string;
      };

      if (data.access_token) {
        const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null;
        const updated = await prisma.gitHubAccount.update({
          where: { userId },
          data: {
            accessToken: data.access_token,
            refreshToken: data.refresh_token ?? account.refreshToken,
            expiresAt,
          },
        });
        logger.info(`Refreshed GitHub OAuth token for user ${userId}`);
        return { account: updated, token: updated.accessToken };
      }
    }
  }

  // Cannot recover — remove the dead record so the UI shows "not connected".
  await prisma.gitHubAccount.delete({ where: { userId } }).catch(() => {});
  throw new ApiError('GitHub authorization expired or revoked. Please reconnect your GitHub account in Settings.', 401);
}

const syncSchema = z.object({
  commitSha: z.string().regex(/^[0-9a-f]{40}$/i, 'Invalid commit SHA format').optional(),
});

/**
 * GET /api/v1/repositories
 * Lists repositories visible to the authenticated user's linked GitHub account.
 */
export const listRepositories = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const { account: githubAccount, token } = await getValidGitHubToken(req.user.id);

  const ghResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'DocGen',
    },
  });

  if (!ghResponse.ok) {
    const errBody = await ghResponse.text().catch(() => 'unknown error body');
    logger.error(`Failed to fetch repositories from GitHub: Status ${ghResponse.status}, Body: ${errBody}`);
    if (ghResponse.status === 401) {
      await prisma.gitHubAccount.delete({ where: { userId: req.user.id } }).catch(() => {});
      throw new ApiError('GitHub authorization expired or revoked. Please reconnect your GitHub account in Settings.', 401);
    }
    throw new ApiError(`Failed to fetch repositories from GitHub: status ${ghResponse.status}`, 502);
  }

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

  const { token } = await getValidGitHubToken(req.user.id);

  const id = String(req.params.id);

  const ghResponse = await fetch(`https://api.github.com/repositories/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'DocGen',
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

  const { token: githubToken } = await getValidGitHubToken(req.user.id);

  // Resolve repository record
  let repository = await prisma.repository.findUnique({ where: { id: repositoryId } });
  if (!repository) {
    const ghResponse = await fetch(`https://api.github.com/repositories/${repositoryId}`, {
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'DocGen',
      },
    });

    if (ghResponse.status === 404) throw new ApiError('Repository not found on GitHub', 404);
    if (!ghResponse.ok) throw new ApiError('Failed to fetch repository details from GitHub to register it', 502);

    const repoData = (await ghResponse.json()) as {
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
      owner: { id: number; login: string; avatar_url?: string };
    };

    // Ensure Organization exists
    let organization = await prisma.organization.findUnique({ where: { id: String(repoData.owner.id) } });
    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          id: String(repoData.owner.id),
          name: repoData.owner.login,
          avatarUrl: repoData.owner.avatar_url || null,
        },
      });
    }

    // Register repository reference on-the-fly
    repository = await prisma.repository.create({
      data: {
        id: String(repoData.id),
        organizationId: organization.id,
        name: repoData.name,
        fullName: repoData.full_name,
        private: repoData.private,
        htmlUrl: repoData.html_url,
      },
    });
  }

  const [owner, repoName] = repository.fullName.split('/');

  // Find the installation that covers this repository's owner
  let installation = await prisma.gitHubInstallation.findFirst({
    where: { targetId: String(repository.organizationId) },
  });

  let installationId: string;

  if (installation) {
    installationId = installation.id;
  } else {
    try {
      // Query GitHub API directly using GitHub App JWT
      installationId = await GitHubClient.getRepositoryInstallationId(owner, repoName);
      
      // Save it to DB for future requests
      await prisma.gitHubInstallation.create({
        data: {
          id: installationId,
          targetType: 'User',
          targetId: String(repository.organizationId),
          repositorySelection: 'selected',
        },
      });
      logger.info(`Resolved and saved GitHub App installation ${installationId} for owner ${repository.organizationId} on-the-fly`);
    } catch (err: any) {
      logger.error(`Failed to resolve installation for ${owner}/${repoName}:`, err);
      throw new ApiError(
        'No GitHub App installation found for this repository. Please install the GitHub App on your organization/account first.',
        400
      );
    }
  }

  // Resolve default branch and commit SHA from GitHub
  const repoInfoRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'DocGen',
    },
  });
  if (!repoInfoRes.ok) throw new ApiError('Failed to fetch repository info from GitHub', 502);
  const repoInfo = (await repoInfoRes.json()) as { default_branch: string };
  const defaultBranch = repoInfo.default_branch;

  let commitSha = parsed.data.commitSha;

  if (!commitSha) {
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'DocGen',
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
    defaultBranch,
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
