import { Request, Response } from 'express';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

/**
 * GET /api/v1/github/connect  (protected)
 * Redirects authenticated user to GitHub OAuth authorization page.
 */
export const connect = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const params = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: `${config.CLIENT_URL.replace(':5173', ':5000')}/api/v1/github/callback`,
    scope: 'read:user user:email repo',
    state: req.user.id,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

/**
 * GET /api/v1/github/callback?code=...&state=...
 * Exchanges OAuth code for access token, links GitHub account, redirects to frontend.
 */
export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state: userId } = req.query as { code: string; state: string };

  if (!code || !userId) {
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=missing_params`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=invalid_state`);
  }

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: config.GITHUB_CLIENT_ID,
      client_secret: config.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenResponse.ok) {
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=token_exchange_failed`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenData.access_token) {
    const errMsg = encodeURIComponent(tokenData.error || 'oauth_error');
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=${errMsg}`);
  }

  // Fetch GitHub user profile
  const ghUserResponse = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'AutoDocs-AI',
    },
  });

  if (!ghUserResponse.ok) {
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=github_profile_failed`);
  }

  const ghUser = (await ghUserResponse.json()) as { id: number; login: string };

  await prisma.gitHubAccount.upsert({
    where: { id: String(ghUser.id) },
    create: {
      id: String(ghUser.id),
      userId: user.id,
      username: ghUser.login,
      accessToken: tokenData.access_token,
    },
    update: {
      userId: user.id,
      username: ghUser.login,
      accessToken: tokenData.access_token,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'CONNECT_GITHUB',
      details: JSON.stringify({ githubUsername: ghUser.login }),
    },
  });

  logger.info(`GitHub account connected for user: ${user.email} → @${ghUser.login}`);

  // Redirect to frontend with GitHub username as success indicator
  res.redirect(`${config.CLIENT_URL}/github/callback?github_username=${encodeURIComponent(ghUser.login)}`);
});
