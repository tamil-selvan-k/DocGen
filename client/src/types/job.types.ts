export type JobStatus = 'QUEUED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED';

export interface JobRepository {
  fullName: string;
  htmlUrl: string;
}

export interface JobPullRequest {
  htmlUrl: string;
  status: string;
  pullRequestNumber: number;
}

export interface JobListItem {
  id: string;
  status: JobStatus;
  commitSha: string;
  attempts: number;
  errorReason: string | null;
  repository: JobRepository;
  pullRequests: JobPullRequest[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentationVersion {
  id: string;
  filePath: string;
  contentPreview: string;
  createdAt: string;
}

export interface DocumentationVersionFull {
  id: string;
  repositoryId: string;
  commitSha: string;
  filePath: string;
  content: string;
  createdAt: string;
}

export interface FullPullRequest {
  id: string;
  repositoryId: string;
  jobId: string;
  pullRequestNumber: number;
  htmlUrl: string;
  branchName: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FullRepository {
  id: string;
  organizationId: string;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobDetail {
  id: string;
  status: JobStatus;
  commitSha: string;
  eventId: string;
  attempts: number;
  maxAttempts: number;
  errorReason: string | null;
  repository: FullRepository;
  pullRequests: FullPullRequest[];
  versions: DocumentationVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface JobsListParams {
  repositoryId?: string;
  status?: JobStatus;
  page?: number;
  limit?: number;
}
