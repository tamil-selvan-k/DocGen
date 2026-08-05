import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { User as UserIcon, GitBranch, Github, Calendar, Activity, CheckCircle, ShieldAlert, KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth.api';
import { Card, CardHeader } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { SkeletonCard } from '@/components/common/Skeleton';
import { formatRelative } from '@/utils/format';

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  createdAt: string;
}

function LogActionIcon({ action }: { action: string }) {
  switch (action) {
    case 'LOGIN':
    case 'OAUTH_LOGIN':
      return <KeyRound className="w-4 h-4 text-emerald-400" />;
    case 'CONNECT_GITHUB':
      return <Github className="w-4 h-4 text-indigo-400" />;
    case 'CHANGE_PASSWORD':
      return <ShieldAlert className="w-4 h-4 text-amber-400" />;
    default:
      return <Activity className="w-4 h-4 text-slate-400" />;
  }
}

function getLogActionLabel(action: string): string {
  switch (action) {
    case 'LOGIN':
      return 'Signed in with password';
    case 'OAUTH_LOGIN':
      return 'Signed in with GitHub OAuth';
    case 'CONNECT_GITHUB':
      return 'Connected GitHub account';
    case 'CHANGE_PASSWORD':
      return 'Updated account password';
    default:
      return action.replace(/_/g, ' ').toLowerCase();
  }
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => authApi.getAuditLogs(),
    select: r => r.data.data,
  });

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-400 transition-colors mb-3 focus:outline-none"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-indigo-400" />
            My Profile
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account information and review login activity</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="text-center p-6 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 flex items-center justify-center font-bold text-3xl uppercase mb-4 shadow-lg shadow-indigo-900/10">
              {user?.email ? user.email.charAt(0) : 'U'}
            </div>
            <h2 className="text-lg font-bold text-slate-200 truncate max-w-full">
              {user?.email?.split('@')[0]}
            </h2>
            <p className="text-xs text-slate-500 truncate max-w-full mb-4">{user?.email}</p>
            
            <div className="w-full border-t border-[#1e2640] pt-4 mt-2 space-y-3 text-left">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                <span>Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Github className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                {user?.github ? (
                  <a
                    href={`https://github.com/${user.github.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 font-semibold truncate underline decoration-indigo-500/20 hover:decoration-indigo-300/40"
                  >
                    Linked @{user.github.username}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">GitHub not connected</span>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Audit Logs / Activity Timeline */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader
              title="Recent Activity Logs"
              description="Audit records of account changes and authentication attempts"
              icon={<Activity className="w-4 h-4 text-slate-400" />}
            />

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : isError ? (
              <div className="flex items-center gap-2 text-sm text-red-400 py-6 justify-center">
                <AlertTriangle className="w-4 h-4" />
                Failed to load activity logs.
              </div>
            ) : !logs?.length ? (
              <div className="text-center py-8 text-xs text-slate-500">No recent activity logged</div>
            ) : (
              <div className="relative border-l border-[#1e2640] ml-3 pl-6 space-y-6 pt-2">
                {logs.map((log: AuditLog) => (
                  <div key={log.id} className="relative">
                    {/* Timeline Node Icon Circle */}
                    <span className="absolute -left-[35px] top-0 bg-[#0d1017] border border-[#1e2640] w-6 h-6 rounded-full flex items-center justify-center shadow-sm">
                      <LogActionIcon action={log.action} />
                    </span>
                    
                    {/* Log Details */}
                    <div>
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-semibold text-slate-200 capitalize">
                          {getLogActionLabel(log.action)}
                        </p>
                        <span className="text-xs text-slate-500 font-mono">
                          {formatRelative(log.createdAt)}
                        </span>
                      </div>
                      {log.details && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                          {log.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
