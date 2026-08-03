import crypto from 'crypto';
import { Request, Response } from 'express';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';
import { logger } from '../utils/logger';

import { GitHubClient } from '../utils/github';

/**
 * GET /api/v1/github/connect  (protected)
 * Redirects authenticated user to GitHub OAuth authorization page.
 */
export const connect = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  // state = csrf_token:userId — random token prevents CSRF / account-linking attacks
  const csrfToken = crypto.randomBytes(16).toString('hex');
  const state = `${csrfToken}:${req.user.id}`;

  const params = new URLSearchParams({
    client_id: config.GITHUB_CLIENT_ID,
    redirect_uri: `${config.SERVER_URL}/api/v1/github/callback`,
    scope: 'read:user user:email repo',
    state,
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

/**
 * GET /api/v1/github/callback?code=...&state=...
 * Exchanges OAuth code for access token, links GitHub account, redirects to frontend.
 */
export const callback = asyncHandler(async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state: string };

  if (!code || !state) {
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=missing_params`);
  }

  // state format: csrfToken:userId
  const colonIdx = state.indexOf(':');
  if (colonIdx === -1) {
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=invalid_state`);
  }
  const userId = state.slice(colonIdx + 1);

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
    refresh_token?: string;
    expires_in?: number;
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
      'User-Agent': 'DocGen-AI',
    },
  });

  if (!ghUserResponse.ok) {
    return res.redirect(`${config.CLIENT_URL}/github/callback?error=github_profile_failed`);
  }

  const ghUser = (await ghUserResponse.json()) as { id: number; login: string };

  const expiresAt = tokenData.expires_in
    ? new Date(Date.now() + tokenData.expires_in * 1000)
    : null;

  await prisma.gitHubAccount.upsert({
    where: { id: String(ghUser.id) },
    create: {
      id: String(ghUser.id),
      userId: user.id,
      username: ghUser.login,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
    },
    update: {
      userId: user.id,
      username: ghUser.login,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token ?? null,
      expiresAt,
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

/**
 * GET /api/v1/github/install  (protected)
 * Dynamically resolves the GitHub App HTML URL and redirects the user to the installations page.
 */
export const installApp = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const appJwt = GitHubClient.generateAppJwt();
  console.log(jwt.decode(appJwt, { complete: true }));
  const response = await fetch('https://api.github.com/app', {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'DocGen-AI',
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    console.log(response);
    logger.error(`Failed to fetch GitHub App details: Status ${response.status}, Body: ${errText}`);
    throw new ApiError('Failed to fetch GitHub App details from GitHub', 502);
  }

  const appData = (await response.json()) as { html_url: string };
  res.redirect(`${appData.html_url}/installations/new?state=${req.user.id}`);
});
