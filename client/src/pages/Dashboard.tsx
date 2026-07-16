import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LayoutDashboard, GitBranch, Clock, CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jobsApi } from '@/api/jobs.api';
import { repositoriesApi } from '@/api/repositories.api';
import { Card, CardHeader } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { SkeletonCard } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { useAuth } from '@/contexts/AuthContext';
import { formatRelative, shortSha } from '@/utils/format';
import type { JobStatus } from '@/types/job.types';

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-100">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const { data: reposData, isLoading: reposLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => repositoriesApi.list(),
    select: r => r.data.data,
  });

  const { data: recentJobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs', { limit: 10 }],
    queryFn: () => jobsApi.list({ limit: 10 }),
    select: r => r.data.data,
  });

  const counts = {
    repos: reposData?.length ?? 0,
    queued: recentJobs?.filter(j => j.status === 'QUEUED').length ?? 0,
    processing: recentJobs?.filter(j => j.status === 'PROCESSING').length ?? 0,
    succeeded: recentJobs?.filter(j => j.status === 'SUCCEEDED').length ?? 0,
    failed: recentJobs?.filter(j => j.status === 'FAILED').length ?? 0,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <LayoutDashboard className="w-6 h-6 text-indigo-400" />
          Dashboard
        </h1>
        <p className="text-slate-500 text-sm mt-1">Welcome back, {user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={GitBranch} label="Repositories" value={counts.repos} color="bg-indigo-500/15 text-indigo-400" />
        <StatCard icon={Clock} label="Queued" value={counts.queued} color="bg-amber-500/15 text-amber-400" />
        <StatCard icon={Loader2} label="Processing" value={counts.processing} color="bg-blue-500/15 text-blue-400" />
        <StatCard icon={CheckCircle} label="Succeeded" value={counts.succeeded} color="bg-green-500/15 text-green-400" />
        <StatCard icon={XCircle} label="Failed" value={counts.failed} color="bg-red-500/15 text-red-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <Card>
          <CardHeader
            title="Recent Jobs"
            action={<Link to="/app/jobs" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>}
          />
          {jobsLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : !recentJobs?.length ? (
            <EmptyState icon={Clock} title="No jobs yet" description="Jobs appear after a push event or manual sync" />
          ) : (
            <div className="space-y-2">
              {recentJobs.slice(0, 6).map(job => (
                <Link key={job.id} to={`/app/jobs/${job.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1a1f35] transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate font-mono">{job.repository?.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">{shortSha(job.commitSha)} · {formatRelative(job.createdAt)}</p>
                  </div>
                  <Badge variant={job.status as JobStatus} dot>{job.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Repositories */}
        <Card>
          <CardHeader
            title="Repositories"
            action={<Link to="/app/repositories" className="text-xs text-indigo-400 hover:text-indigo-300">View all →</Link>}
          />
          {reposLoading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}</div>
          ) : !reposData?.length ? (
            <EmptyState icon={GitBranch} title="No repositories" description="Connect your GitHub account to see repositories" />
          ) : (
            <div className="space-y-2">
              {reposData.slice(0, 6).map(repo => (
                <div key={repo.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[#1a1f35] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 truncate">{repo.fullName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{repo.private ? 'Private' : 'Public'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {repo.isTracked && <Badge variant="success">Tracked</Badge>}
                    <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="text-slate-600 hover:text-slate-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
