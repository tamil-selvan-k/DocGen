export interface ApiMeta {
  message: string;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  [key: string]: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  error: { message: string; errors?: unknown[] } | null;
  meta: ApiMeta | null;
}

export interface PaginatedMeta extends ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  statusCode: number;
  errors?: unknown[];
}
