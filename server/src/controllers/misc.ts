import { Request, Response } from 'express';
import { ApiError } from '../utils/ApiError';
import { ApiResponse } from '../utils/ApiResponse';
import asyncHandler from '../utils/asyncHandler';
import prisma from '../utils/prisma';

/**
 * GET /api/v1/organizations
 */
export const listOrganizations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const orgs = await prisma.organization.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { repositories: true } } },
  });

  return new ApiResponse(200, orgs.map(o => ({
    id: o.id,
    name: o.name,
    avatarUrl: o.avatarUrl,
    repositoryCount: o._count.repositories,
    createdAt: o.createdAt,
  })), 'Organizations fetched');
});

/**
 * GET /api/v1/installations
 */
export const listInstallations = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const installations = await prisma.gitHubInstallation.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return new ApiResponse(200, installations, 'Installations fetched');
});

/**
 * GET /api/v1/jobs/:jobId/versions/:versionId
 */
export const getVersionContent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError('Unauthorized', 401);

  const versionId = String(req.params.versionId);

  const version = await prisma.documentationVersion.findUnique({
    where: { id: versionId },
  });

  if (!version) throw new ApiError('Documentation version not found', 404);

  return new ApiResponse(200, {
    id: version.id,
    repositoryId: version.repositoryId,
    commitSha: version.commitSha,
    filePath: version.filePath,
    content: version.content,
    createdAt: version.createdAt,
  });
});
