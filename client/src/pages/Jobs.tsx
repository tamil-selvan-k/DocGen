import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, AlertCircle, Loader2, Clock, GitPullRequest, ChevronRight as ChevronRightIcon, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '@/api/jobs.api';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { SkeletonCard } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelative, shortSha } from '@/utils/format';
import type { JobStatus } from '@/types/job.types';

const STATUS_OPTIONS: Array<{ value: JobStatus | ''; label: string }> = [
  { value: '', label: 'All Jobs' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SUCCEEDED', label: 'Succeeded' },
  { value: 'FAILED', label: 'Failed' },
];

function JobStatusIcon({ status }: { status: JobStatus }) {
  switch (status) {
    case 'SUCCEEDED':
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
    case 'FAILED':
      return <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />;
    case 'PROCESSING':
      return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />;
    case 'QUEUED':
    default:
      return <Clock className="w-5 h-5 text-slate-500 flex-shrink-0" />;
  }
}

export default function Jobs() {
  const [status, setStatus] = useState<JobStatus | ''>('');
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['jobs', { status, page }],
    queryFn: () => jobsApi.list({ status: status || undefined, page, limit: 15 }),
    select: r => r.data,
  });

  const jobs = data?.data ?? [];
  const meta = data?.meta;
  const totalPages = meta?.totalPages ?? 1;

  const handleRowClick = (jobId: string) => {
    navigate(`/app/jobs/${jobId}`);
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-400 transition-colors mb-3 focus:outline-none"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back</span>
      </button>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-400" />
            Documentation Jobs
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track and audit the execution history of documentation generation runs</p>
        </div>

      {/* Filters Toolbar */}
      <div className="flex gap-2 flex-wrap items-center justify-between pt-2">
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setStatus(opt.value); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                status === opt.value
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40'
                  : 'bg-transparent text-slate-400 border-[var(--color-border)] hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {meta && (
          <span className="text-xs text-slate-500 font-mono">
            Showing {jobs.length} of {meta.total} jobs
          </span>
        )}
      </div>

      {/* Jobs List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-[var(--color-border)] rounded-xl gap-2">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
          <p className="text-sm">Failed to load execution history.</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : !jobs.length ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description={
            status
              ? `No jobs match the selected filter "${status.toLowerCase()}"`
              : "No documentation sync jobs have been queued yet"
          }
        />
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Card
              key={job.id}
              onClick={() => handleRowClick(job.id)}
              className="hover:border-indigo-600/30 transition-all duration-200 cursor-pointer p-4 bg-[var(--color-surface)] hover:shadow-md hover:shadow-indigo-950/10 flex flex-col gap-3 group"
            >
              {/* Top Row: Status, Repo Info, PR Link */}
              <div className="flex items-center justify-between gap-4 flex-wrap md:flex-nowrap">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Status Indicator Icon */}
                  <JobStatusIcon status={job.status as JobStatus} />
                  
                  {/* Repository Name */}
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition-colors text-sm md:text-base">
                      {job.repository?.fullName || 'Unknown Repository'}
                    </p>
                    {/* Commit metadata line */}
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                      <span className="font-mono bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded border border-[var(--color-border)] text-slate-400">
                        {shortSha(job.commitSha)}
                      </span>
                      <span>•</span>
                      <span>Triggered {formatRelative(job.createdAt)}</span>
                      {job.attempts > 1 && (
                        <>
                          <span>•</span>
                          <span className="text-amber-500">Attempt {job.attempts}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Side: PR Badge / Navigation */}
                <div className="flex items-center gap-3 ml-auto md:ml-0 flex-shrink-0">
                  {job.pullRequests.length > 0 && (
                    <a
                      href={job.pullRequests[0].htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-900/40 text-indigo-300 border border-indigo-700/30 hover:bg-indigo-900/60 hover:text-indigo-200 transition-colors"
                      title="View Pull Request on GitHub"
                    >
                      <GitPullRequest className="w-3.5 h-3.5" />
                      <span>PR #{job.pullRequests[0].pullRequestNumber}</span>
                    </a>
                  )}
                  <ChevronRightIcon className="w-4 h-4 text-slate-500 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              {/* Bottom Error Section (if FAILED) */}
              {job.status === 'FAILED' && job.errorReason && (
                <div className="px-3.5 py-2.5 rounded-lg bg-rose-950/20 border border-rose-900/25 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-300/90 leading-relaxed font-mono">
                    {job.errorReason}
                  </p>
                </div>
              )}
            </Card>
          ))}

          {/* Pagination Toolbar */}
          {totalPages > 1 && (
             <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)]">
              <p className="text-xs text-slate-500">
                Page <span className="text-slate-300 font-medium">{page}</span> of <span className="text-slate-300 font-medium">{totalPages}</span> · {meta?.total} executions
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="h-8 w-8 p-0 flex items-center justify-center" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="secondary" size="sm" className="h-8 w-8 p-0 flex items-center justify-center" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
  );
}
