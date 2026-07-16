import client from './client';
import { ENDPOINTS } from '@/constants/api.constants';
import type { ApiResponse } from '@/types/api.types';
import type { Repository, SyncRequest, SyncResponse } from '@/types/repository.types';

export const repositoriesApi = {
  list: () =>
    client.get<ApiResponse<Repository[]>>(ENDPOINTS.REPOSITORIES),

  get: (id: string) =>
    client.get<ApiResponse<Repository>>(ENDPOINTS.REPOSITORY(id)),

  sync: (id: string, body: SyncRequest = {}) =>
    client.post<ApiResponse<SyncResponse>>(ENDPOINTS.SYNC_REPOSITORY(id), body),
};
