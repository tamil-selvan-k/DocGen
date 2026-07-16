import client from './client';
import { ENDPOINTS } from '@/constants/api.constants';
import type { ApiResponse } from '@/types/api.types';
import type { Organization, GitHubInstallation } from '@/types/github.types';

export const githubApi = {
  /** Returns full connect URL — browser navigates to this to start OAuth */
  getConnectUrl: (): string => `/api/v1${ENDPOINTS.GITHUB_CONNECT}`,

  listOrganizations: () =>
    client.get<ApiResponse<Organization[]>>(ENDPOINTS.ORGANIZATIONS),

  listInstallations: () =>
    client.get<ApiResponse<GitHubInstallation[]>>(ENDPOINTS.INSTALLATIONS),
};
