import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';

/**
 * GET /api/v1/jobs
 * Returns paginated documentation jobs, optionally filtered by repositoryId or status.
 */
export const listJobs = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const repositoryId = Array.isArray(req.query.repositoryId)
    ? String(req.query.repositoryId[0])
    : (req.query.repositoryId as string | undefined);

  const status = Array.isArray(req.query.status)
    ? String(req.query.status[0])
    : (req.query.status as string | undefined);

  const pageNum = Math.max(1, parseInt(String(req.query.page || '1'), 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
  const skip = (pageNum - 1) * limitNum;

  const where: Record<string, unknown> = {};
  if (repositoryId) where.repositoryId = repositoryId;
  if (status) where.status = status;

  const [jobs, total] = await Promise.all([
    prisma.documentationJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      include: {
        repository: { select: { fullName: true, htmlUrl: true } },
        pullRequests: { select: { htmlUrl: true, status: true, pullRequestNumber: true } },
      },
    }),
    prisma.documentationJob.count({ where }),
  ]);

  return new ApiResponse(
    200,
    jobs.map(j => ({
      id: j.id,
      status: j.status,
      commitSha: j.commitSha,
      attempts: j.attempts,
      errorReason: j.errorReason,
      repository: j.repository,
      pullRequests: j.pullRequests,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt,
    })),
    'Jobs fetched successfully',
    {
      message: 'Jobs fetched successfully',
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    }
  );
});

/**
 * GET /api/v1/jobs/:id
 * Returns full details for a specific documentation job including version snapshots.
 */
export const getJob = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const id = String(req.params.id);

  const job = await prisma.documentationJob.findUnique({
    where: { id },
    include: {
      repository: true,
      pullRequests: true,
      versions: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });

  if (!job) throw new ApiError('Job not found', 404);

  type JobWithRelations = typeof job & {
    repository: NonNullable<typeof job>['repository'];
    pullRequests: NonNullable<typeof job>['pullRequests'];
    versions: NonNullable<typeof job>['versions'];
  };

  const j = job as JobWithRelations;

  return new ApiResponse(200, {
    id: j.id,
    status: j.status,
    commitSha: j.commitSha,
    eventId: j.eventId,
    attempts: j.attempts,
    maxAttempts: j.maxAttempts,
    errorReason: j.errorReason,
    repository: j.repository,
    pullRequests: j.pullRequests,
    versions: j.versions.map((v: { id: string; filePath: string; content: string; createdAt: Date }) => ({
      id: v.id,
      filePath: v.filePath,
      contentPreview: v.content.slice(0, 500) + (v.content.length > 500 ? '...' : ''),
      createdAt: v.createdAt,
    })),
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  });
});
