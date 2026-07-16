import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, GitPullRequest, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { jobsApi } from '@/api/jobs.api';
import { Card, CardHeader } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Skeleton, SkeletonText } from '@/components/common/Skeleton';
import { Spinner } from '@/components/common/Spinner';
import { formatDate, shortSha } from '@/utils/format';
import type { JobStatus, DocumentationVersion } from '@/types/job.types';

function VersionModal({ jobId, version, open, onClose }: {
  jobId: string;
  version: DocumentationVersion | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['version', version?.id],
    queryFn: () => jobsApi.getVersionContent(jobId, version!.id),
    select: r => r.data.data,
    enabled: !!version,
  });

  return (
    <Modal open={open} onClose={onClose} title={version?.filePath} maxWidth="max-w-4xl">
      {isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="prose prose-invert prose-sm max-w-none max-h-[70vh] overflow-auto bg-[#0d1017] rounded-lg p-4">
          <ReactMarkdown>{data?.content ?? ''}</ReactMarkdown>
        </div>
      )}
    </Modal>
  );
}

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const [selectedVersion, setSelectedVersion] = useState<DocumentationVersion | null>(null);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id!),
    select: r => r.data.data,
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4"><SkeletonText lines={4} /></div>
      </div>
    );
  }

  if (!job) return (
    <div className="text-center py-16">
      <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-3" />
      <p className="text-slate-300 font-medium">Job not found</p>
      <Link to="/app/jobs" className="text-indigo-400 text-sm hover:text-indigo-300 mt-2 inline-block">← Back to jobs</Link>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/app/jobs" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-100">{job.repository?.fullName}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-xs text-slate-500">{shortSha(job.commitSha)}</span>
            <Badge variant={job.status as JobStatus} dot>{job.status}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Job Details" />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Job ID', job.id],
                ['Commit', job.commitSha],
                ['Status', job.status],
                ['Attempts', `${job.attempts} / ${job.maxAttempts}`],
                ['Created', formatDate(job.createdAt)],
                ['Updated', formatDate(job.updatedAt)],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-slate-500 text-xs mb-0.5">{k}</dt>
                  <dd className="text-slate-200 font-mono text-xs break-all">{String(v)}</dd>
                </div>
              ))}
            </dl>
            {job.errorReason && (
              <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-400 font-medium mb-1">Error</p>
                <p className="text-xs text-red-300">{job.errorReason}</p>
              </div>
            )}
          </Card>

          {/* Documentation Versions */}
          {job.versions.length > 0 && (
            <Card>
              <CardHeader title="Documentation Versions" description="Click to view full content" />
              <div className="space-y-2">
                {job.versions.map(v => (
                  <div key={v.id} className="p-3 rounded-lg bg-[#0d1017] border border-[#1e2640]">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-xs font-mono text-slate-300">{v.filePath}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedVersion(v)}>
                        View
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 font-mono whitespace-pre-wrap line-clamp-3">
                      {v.contentPreview}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Pull Requests */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Pull Requests" />
            {job.pullRequests.length === 0 ? (
              <p className="text-sm text-slate-500">No PRs generated yet</p>
            ) : (
              <div className="space-y-2">
                {job.pullRequests.map(pr => (
                  <a
                    key={pr.id}
                    href={pr.htmlUrl}
                    target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 rounded-lg hover:bg-[#1a1f35] transition-colors group"
                  >
                    <GitPullRequest className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-200">PR #{pr.pullRequestNumber}</p>
                      <p className="text-xs text-slate-500 truncate">{pr.branchName}</p>
                    </div>
                    <Badge variant={pr.status === 'OPEN' ? 'info' : pr.status === 'MERGED' ? 'success' : 'default'}>
                      {pr.status}
                    </Badge>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <VersionModal
        jobId={id!}
        version={selectedVersion}
        open={!!selectedVersion}
        onClose={() => setSelectedVersion(null)}
      />
    </div>
  );
}
