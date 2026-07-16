export interface Repository {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  htmlUrl: string;
  description: string | null;
  updatedAt: string;
  defaultBranch: string;
  isTracked: boolean;
}

export interface SyncRequest {
  commitSha?: string;
}

export interface SyncResponse {
  jobId: string;
}
