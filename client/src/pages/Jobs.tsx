import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { jobsApi } from '@/api/jobs.api';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { SkeletonCard } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelative, shortSha } from '@/utils/format';
import type { JobStatus } from '@/types/job.types';

const STATUS_OPTIONS: Array<{ value: JobStatus | ''; label: string }> = [
  { value: '', label: 'All' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'FAILED', label: 'Failed' },
];

export default function Jobs() {
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { status, page }],
    queryFn: () => jobsApi.list({ status: status || undefined, page, limit: 20 }),
    select: r => r.data,
  });

  const jobs = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-indigo-400" />
          Documentation Jobs
        </h1>
        <p className="text-slate-500 text-sm mt-1">Monitor the status of all documentation generation jobs</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => { setStatus(opt.value); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              status === opt.value
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40'
                : 'bg-transparent text-slate-400 border-[#1e2640] hover:border-slate-600'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : !jobs.length ? (
        <EmptyState icon={Briefcase} title="No jobs found" description="Jobs appear after webhook push events or manual syncs" />
      ) : (
        <>
          <div className="space-y-2">
            {jobs.map(job => (
              <Link key={job.id} to={`/app/jobs/${job.id}`}>
                <Card className="hover:border-indigo-600/30 transition-colors cursor-pointer">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-slate-200">{job.repository?.fullName}</p>
                        <Badge variant={job.status as JobStatus} dot>{job.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-mono text-slate-500">
                          {shortSha(job.commitSha)}
                        </span>
                        <span className="text-xs text-slate-600">{formatRelative(job.createdAt)}</span>
                        {job.attempts > 0 && (
                          <span className="text-xs text-slate-600">Attempt {job.attempts}</span>
                        )}
                      </div>
                      {job.errorReason && (
                        <p className="text-xs text-red-400 mt-1 truncate">{job.errorReason}</p>
                      )}
                    </div>
                    {job.pullRequests.length > 0 && (
                      <a
                        href={job.pullRequests[0].htmlUrl}
                        target="_blank" rel="noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap"
                      >
                        View PR #{job.pullRequests[0].pullRequestNumber}
                      </a>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages} · {meta?.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
