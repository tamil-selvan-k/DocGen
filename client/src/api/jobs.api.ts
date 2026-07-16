import client from './client';
import { ENDPOINTS } from '@/constants/api.constants';
import type { ApiResponse, PaginatedMeta } from '@/types/api.types';
import type { JobListItem, JobDetail, JobsListParams, DocumentationVersionFull } from '@/types/job.types';

export const jobsApi = {
  list: (params: JobsListParams = {}) =>
    client.get<ApiResponse<JobListItem[]> & { meta: PaginatedMeta }>(ENDPOINTS.JOBS, { params }),

  get: (id: string) =>
    client.get<ApiResponse<JobDetail>>(ENDPOINTS.JOB(id)),

  getVersionContent: (jobId: string, versionId: string) =>
    client.get<ApiResponse<DocumentationVersionFull>>(ENDPOINTS.VERSION_CONTENT(jobId, versionId)),
};
