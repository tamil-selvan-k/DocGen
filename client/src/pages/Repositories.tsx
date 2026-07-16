import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch, RefreshCw, ExternalLink, Search } from 'lucide-react';
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

  const mutation = useMutation({
    mutationFn: () => repositoriesApi.sync(repo!.id, commitSha ? { commitSha } : {}),
    onSuccess: (res) => {
      success(`Job queued: ${res.data.data.jobId}`);
      qc.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
      setCommitSha('');
    },
    onError: (err: unknown) => {
      const e = err as { message?: string };
      error(e.message || 'Sync failed');
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={`Sync ${repo?.fullName}`}>
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Trigger documentation generation. Leave commit SHA blank to use the latest commit.
        </p>
        <Input
          label="Commit SHA (optional)"
          placeholder="40-char hex, e.g. abc1234..."
          value={commitSha}
          onChange={e => setCommitSha(e.target.value)}
          hint="Leave empty to auto-resolve the latest commit"
        />
        <div className="flex gap-3 justify-end pt-1">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
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
  const [syncTarget, setSyncTarget] = useState<Repository | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['repositories'],
    queryFn: () => repositoriesApi.list(),
    select: r => r.data.data,
  });

  const filtered = (data ?? []).filter(r =>
    r.fullName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-indigo-400" />
          Repositories
        </h1>
        <p className="text-slate-500 text-sm mt-1">Repositories from your connected GitHub account</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            className="input-field pl-9"
            placeholder="Search repositories…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-slate-500">{filtered.length} repos</span>
      </div>

      {isLoading ? (
        <div className="grid gap-4">{[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}</div>
      ) : !filtered.length ? (
        <EmptyState icon={GitBranch} title="No repositories found" description="Connect your GitHub account in Settings to see your repositories" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(repo => (
            <Card key={repo.id} className="hover:border-indigo-600/30 transition-colors">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-200">{repo.fullName}</p>
                    {repo.isTracked && <Badge variant="success">Tracked</Badge>}
                    <Badge variant={repo.private ? 'default' : 'info'}>{repo.private ? 'Private' : 'Public'}</Badge>
                  </div>
                  {repo.description && (
                    <p className="text-sm text-slate-500 mt-1 truncate">{repo.description}</p>
                  )}
                  <p className="text-xs text-slate-600 mt-1">Updated {formatRelative(repo.updatedAt)}</p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="btn-ghost p-2">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Button variant="secondary" size="sm" onClick={() => setSyncTarget(repo)}>
                    <RefreshCw className="w-3.5 h-3.5" /> Sync
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SyncModal repo={syncTarget} open={!!syncTarget} onClose={() => setSyncTarget(null)} />
    </div>
  );
}
