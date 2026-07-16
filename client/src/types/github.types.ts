export interface Organization {
  id: string;
  name: string;
  avatarUrl: string | null;
  repositoryCount: number;
  createdAt: string;
}

export interface GitHubInstallation {
  id: string;
  targetType: string;
  targetId: string;
  repositorySelection: string;
  createdAt: string;
  updatedAt: string;
}
