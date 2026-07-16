import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/query.config';
import { AuthProvider } from '@/contexts/AuthContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );
}
