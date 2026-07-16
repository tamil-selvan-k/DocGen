import React from 'react';
import type { JobStatus } from '@/types/job.types';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default' | JobStatus;

const variantStyles: Record<string, string> = {
  success:    'bg-green-500/15 text-green-400 border-green-500/20',
  SUCCEEDED:  'bg-green-500/15 text-green-400 border-green-500/20',
  warning:    'bg-amber-500/15 text-amber-400 border-amber-500/20',
  QUEUED:     'bg-amber-500/15 text-amber-400 border-amber-500/20',
  error:      'bg-red-500/15 text-red-400 border-red-500/20',
  FAILED:     'bg-red-500/15 text-red-400 border-red-500/20',
  info:       'bg-blue-500/15 text-blue-400 border-blue-500/20',
  PROCESSING: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  default:    'bg-slate-500/15 text-slate-400 border-slate-500/20',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'default', children, className = '', dot = false }: BadgeProps) {
  const style = variantStyles[variant] ?? variantStyles.default;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
