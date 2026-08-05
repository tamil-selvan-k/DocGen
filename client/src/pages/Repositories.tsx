import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, RefreshCw, ExternalLink, Search, AlertTriangle, GitFork, Shield, ShieldAlert, BookOpen, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { repositoriesApi } from '@/api/repositories.api';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { SkeletonCard } from '@/components/common/Skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { useToast } from '@/components/common/Toast';
import { formatRelative } from '@/utils/format';
import type { Repository } from '@/types/repository.types';

function SyncModal({ repo, open, onClose }: { repo: Repository | null; open: boolean; onClose: () => void }) {
  const [commitSha, setCommitSha] = useState('');
  const qc = useQueryClient();
  const { success, error } = useToast();

  const handleClose = () => { setCommitSha(''); onClose(); };

  const mutation = useMutation({
    mutationFn: () => repositoriesApi.sync(repo!.id, commitSha ? { commitSha } : {}),
    onSuccess: (res) => {
      success(`Documentation generation queued for ${repo?.name}`);
      qc.invalidateQueries({ queryKey: ['jobs'] });
      handleClose();
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      error(e.message || 'Sync failed');
    },
  });

  return (
    <Modal open={open} onClose={handleClose} title={`Sync ${repo?.name}`}>
      <div className="space-y-4 pt-2">
        <p className="text-sm text-slate-400 leading-relaxed">
          Trigger manual documentation generation. If you leave the commit SHA blank, we will automatically resolve the latest commit on the default branch.
        </p>
        <Input
          label="Commit SHA (optional)"
          placeholder="40-char hex, e.g. abc1234..."
          value={commitSha}
          onChange={e => setCommitSha(e.target.value)}
          hint="Leave empty to auto-resolve the latest commit"
        />
        <div className="flex gap-3 justify-end pt-3 border-t border-[#1e2640]">
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button loading={mutation.isPending} onClick={() => mutation.mutate()}>
            <RefreshCw className="w-4 h-4" /> Sync Now
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Repositories() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'tracked' | 'untracked'>('all');
  const [syncTarget, setSyncTarget] = useState<Repository | null>(null);
  const [page, setPage] = useState(1);
  const limit = 10;
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => repositoriesApi.list(),
    select: r => r.data.data,
  });

  const filtered = (data ?? []).filter(r => {
    const matchesSearch = r.fullName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'tracked') return r.isTracked;
    if (filter === 'untracked') return !r.isTracked;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-indigo-400" />
              Repositories
            </h1>
            <p className="text-slate-500 text-sm mt-1">Select and trigger documentation generation for your repositories</p>
          </div>
        </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between pt-2">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search repositories…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          {(['all', 'tracked', 'untracked'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
                filter === f
                  ? 'bg-indigo-600/20 text-indigo-300 border-indigo-600/40'
                  : 'bg-transparent text-slate-400 border-[#1e2640] hover:border-slate-600'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="text-xs text-slate-500 ml-2 font-mono">({filtered.length} found)</span>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-[#1e2640] rounded-xl gap-2">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <p className="text-sm">Failed to load repositories.</p>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      ) : !filtered.length ? (
        <EmptyState
          icon={GitBranch}
          title="No repositories found"
          description={
            search || filter !== 'all'
              ? 'Try modifying your search query or filters'
              : 'Configure repository access in your GitHub App installation'
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {paginated.map(repo => (
              <Card key={repo.id} className="hover:border-indigo-600/30 hover:shadow-lg hover:shadow-indigo-900/5 transition-all duration-200 flex flex-col justify-between h-full bg-[#111520] p-5">
                <div className="space-y-3">
                  {/* Repo Info Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#161b2e] border border-[#1e2640] flex items-center justify-center flex-shrink-0">
                        <GitFork className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate group-hover:text-slate-100" title={repo.fullName}>
                          {repo.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">@{repo.fullName.split('/')[0]}</p>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {repo.isTracked && <Badge variant="success">Tracked</Badge>}
                      {repo.private ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Shield className="w-3 h-3 text-slate-400" /> Private
                        </Badge>
                      ) : (
                        <Badge variant="info">Public</Badge>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed min-h-[40px]">
                    {repo.description || (
                      <span className="italic text-slate-600">No description provided</span>
                    )}
                  </p>
                </div>

                {/* Bottom Metadata & Actions */}
                <div className="pt-4 mt-4 border-t border-[#1e2640] flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-mono">
                    Updated {formatRelative(repo.updatedAt)}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost p-2 rounded-lg hover:bg-[#1e2640]"
                      title="View on GitHub"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 py-0 px-3 flex items-center gap-1.5"
                      onClick={() => setSyncTarget(repo)}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Sync
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Pagination Toolbar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-[#1e2640] mt-6">
              <p className="text-xs text-slate-500">
                Page <span className="text-slate-300 font-medium">{page}</span> of <span className="text-slate-300 font-medium">{totalPages}</span> · {filtered.length} repositories
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

      <SyncModal repo={syncTarget} open={!!syncTarget} onClose={() => setSyncTarget(null)} />
    </div>
  </div>
  );
}
