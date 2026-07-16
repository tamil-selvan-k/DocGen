import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, ENDPOINTS } from '@/constants/api.constants';
import type { ApiResponse } from '@/types/api.types';

const client = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Always send HTTP-only cookies
  headers: { 'Content-Type': 'application/json' },
});

// ── Response interceptor — normalize errors + auto-refresh ─────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

function processQueue(error: AxiosError | null) {
  failedQueue.forEach(p => (error ? p.reject(error) : p.resolve(null)));
  failedQueue = [];
}

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Auto-refresh on 401, except for auth endpoints themselves
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/signup') &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/auth/me')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => client(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await client.post(ENDPOINTS.REFRESH);
        processQueue(null);
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as AxiosError);
        // Only redirect to login if we're on a protected route (not on landing, login, register, etc.)
        const path = window.location.pathname;
        if (path !== '/' && path !== '/login' && path !== '/register' && path !== '/forgot-password') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Normalize error shape
    const message =
      error.response?.data?.error?.message ||
      error.message ||
      'An unexpected error occurred';

    const normalizedError = {
      message,
      statusCode: error.response?.status ?? 0,
      errors: error.response?.data?.error?.errors,
    };

    return Promise.reject(normalizedError);
  }
);

// Retry GET requests on network error (up to 2 times)
client.interceptors.request.use((config: InternalAxiosRequestConfig) => config);

export default client;
