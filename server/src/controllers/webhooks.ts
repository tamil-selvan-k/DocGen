import { Request, Response } from 'express';
import { GitHubClient } from '../utils/github';
import { ApiError } from '../utils/ApiError';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';
import { addDocJob } from '../queue';
import { logger } from '../utils/logger';

/**
 * POST /api/v1/webhooks/github
 *
 * Receives GitHub webhook events. This endpoint:
 *  1. Validates HMAC-SHA256 signature (rejects invalid requests)
 *  2. Identifies and parses supported events (push, pull_request, installation)
 *  3. Deduplicates based on (repositoryId + commitSha + eventId)
 *  4. Creates a DocumentationJob record in QUEUED state
 *  5. Enqueues the job in BullMQ
 *  6. Returns 202 immediately — heavy work happens in workers
 */
export const receiveWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const eventType = req.headers['x-github-event'] as string | undefined;
  const deliveryId = req.headers['x-github-delivery'] as string | undefined;
  const rawBody = (req as any).rawBody as string;

  // 1. Verify webhook signature
  if (!GitHubClient.verifyWebhookSignature(signature, rawBody)) {
    logger.warn(`Webhook signature verification failed for delivery: ${deliveryId}`);
    throw new ApiError('Invalid webhook signature', 401);
  }

  logger.info(`GitHub webhook received: event=${eventType}, delivery=${deliveryId}`);

  const payload = req.body;

  // 2. Handle GitHub App installation events (no doc job needed)
  if (eventType === 'installation' || eventType === 'installation_repositories') {
    await handleInstallationEvent(payload, eventType);
    return res.status(200).json({ success: true, data: null, error: null, meta: { message: 'Installation event recorded' } });
  }

  // 3. We only process push events on non-tag refs
  if (eventType !== 'push') {
    return res.status(200).json({ success: true, data: null, error: null, meta: { message: `Event type '${eventType}' not processed` } });
  }

  // Skip if this is a branch/tag deletion (after === zero sha)
  const zeroSha = '0000000000000000000000000000000000000000';
  if (payload.after === zeroSha) {
    return res.status(200).json({ success: true, data: null, error: null, meta: { message: 'Branch deletion event skipped' } });
  }

  const repo = payload.repository;
  const commitSha: string = payload.after;
  const eventId: string = deliveryId || `${repo.id}-${commitSha}`;
  const repositoryId: string = String(repo.id);
  const installationId: string = String(payload.installation?.id);

  // 4. Upsert repository reference
  let organization = await prisma.organization.findUnique({ where: { id: String(repo.owner.id) } });
  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        id: String(repo.owner.id),
        name: repo.owner.login,
        avatarUrl: repo.owner.avatar_url,
      },
    });
  }

  await prisma.repository.upsert({
    where: { id: repositoryId },
    create: {
      id: repositoryId,
      organizationId: organization.id,
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      htmlUrl: repo.html_url,
    },
    update: {
      name: repo.name,
      fullName: repo.full_name,
      private: repo.private,
      htmlUrl: repo.html_url,
    },
  });

  // 5. Idempotency check — skip if job already exists for this commit+event
  const existingJob = await prisma.documentationJob.findUnique({
    where: { repositoryId_commitSha_eventId: { repositoryId, commitSha, eventId } },
  });

  if (existingJob) {
    logger.info(`Duplicate webhook delivery skipped: ${eventId}`);
    return res.status(200).json({ success: true, data: null, error: null, meta: { message: 'Duplicate event — already queued' } });
  }

  // 6. Create job in QUEUED state
  const job = await prisma.documentationJob.create({
    data: { repositoryId, commitSha, eventId, status: 'QUEUED' },
  });

  // 7. Enqueue job in BullMQ
  await addDocJob({
    jobId: job.id,
    repositoryId,
    commitSha,
    installationId,
    owner: repo.owner.login,
    repo: repo.name,
    defaultBranch: repo.default_branch || 'main',
  });

  logger.info(`Documentation job queued: ${job.id} for ${repo.full_name}@${commitSha.slice(0, 7)}`);

  return res.status(202).json({
    success: true,
    data: { jobId: job.id },
    error: null,
    meta: { message: 'Webhook received and job queued' },
  });
});

/**
 * Handles GitHub App installation events by upserting GitHubInstallation records.
 */
async function handleInstallationEvent(payload: any, eventType: string): Promise<void> {
  const installationId = String(payload.installation?.id);
  if (!installationId) return;

  const action = payload.action;
  logger.info(`GitHub App installation event: ${eventType} action=${action} installation=${installationId}`);

  await prisma.gitHubInstallation.upsert({
    where: { id: installationId },
    create: {
      id: installationId,
      targetType: payload.installation.target_type,
      targetId: String(payload.installation.target_id),
      repositorySelection: payload.installation.repository_selection || 'all',
    },
    update: {
      targetType: payload.installation.target_type,
      targetId: String(payload.installation.target_id),
      repositorySelection: payload.installation.repository_selection || 'all',
    },
  });
}
