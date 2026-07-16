import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-indigo-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-500 max-w-xs">{description}</p>}
      {action && (
        <Button className="mt-5" onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
