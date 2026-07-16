import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: (failureCount, error: unknown) => {
        const err = error as { statusCode?: number };
        // Don't retry on 401/403/404
        if (err?.statusCode && [401, 403, 404].includes(err.statusCode)) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
