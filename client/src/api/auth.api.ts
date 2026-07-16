import client from './client';
import { ENDPOINTS } from '@/constants/api.constants';
import type { ApiResponse } from '@/types/api.types';
import type { LoginResponse, SignupResponse, User } from '@/types/auth.types';

export const authApi = {
  signup: (email: string, password: string) =>
    client.post<ApiResponse<SignupResponse>>(ENDPOINTS.SIGNUP, { email, password }),

  login: (email: string, password: string) =>
    client.post<ApiResponse<LoginResponse>>(ENDPOINTS.LOGIN, { email, password }),

  logout: () =>
    client.post<ApiResponse<null>>(ENDPOINTS.LOGOUT),

  refresh: () =>
    client.post<ApiResponse<LoginResponse>>(ENDPOINTS.REFRESH),

  me: () =>
    client.get<ApiResponse<User>>(ENDPOINTS.ME),

  changePassword: (currentPassword: string, newPassword: string) =>
    client.patch<ApiResponse<null>>(ENDPOINTS.CHANGE_PASSWORD, { currentPassword, newPassword }),
};
