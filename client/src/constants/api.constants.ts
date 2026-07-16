export const API_BASE_URL = '/api/v1';

export const ENDPOINTS = {
  // Auth
  SIGNUP: '/auth/signup',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  REFRESH: '/auth/refresh',
  ME: '/auth/me',
  CHANGE_PASSWORD: '/auth/password',

  // GitHub
  GITHUB_CONNECT: '/github/connect',

  // Repositories
  REPOSITORIES: '/repositories',
  REPOSITORY: (id: string) => `/repositories/${id}`,
  SYNC_REPOSITORY: (id: string) => `/repositories/${id}/sync`,

  // Jobs
  JOBS: '/jobs',
  JOB: (id: string) => `/jobs/${id}`,
  VERSION_CONTENT: (jobId: string, versionId: string) => `/jobs/${jobId}/versions/${versionId}`,

  // Organizations & Installations
  ORGANIZATIONS: '/organizations',
  INSTALLATIONS: '/installations',

  // Health
  HEALTH: '/health',
} as const;
