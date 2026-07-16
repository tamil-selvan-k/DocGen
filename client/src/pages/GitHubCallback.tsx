import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/common/Toast';
import { Spinner } from '@/components/common/Spinner';

export default function GitHubCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { success, error } = useToast();

  const githubUsername = params.get('github_username');
  const errorParam = params.get('error');

  useEffect(() => {
    const handle = async () => {
      if (githubUsername) {
        await refreshUser();
        success(`GitHub account @${githubUsername} connected!`);
        setTimeout(() => navigate('/app/settings'), 1500);
      } else if (errorParam) {
        error(`GitHub connection failed: ${errorParam.replace(/_/g, ' ')}`);
        setTimeout(() => navigate('/app/settings'), 2000);
      } else {
        // No params — might be a stale load
        navigate('/app/settings');
      }
    };
    handle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="card p-10 text-center max-w-sm w-full"
      >
        {!errorParam ? (
          <>
            {githubUsername ? (
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            ) : (
              <Spinner size="lg" className="mx-auto mb-4" />
            )}
            <h2 className="text-base font-semibold text-slate-100">
              {githubUsername ? `Connected @${githubUsername}` : 'Connecting GitHub…'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">Redirecting to settings…</p>
          </>
        ) : (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-base font-semibold text-slate-100">Connection Failed</h2>
            <p className="text-sm text-slate-500 mt-1">{errorParam.replace(/_/g, ' ')}</p>
          </>
        )}
      </motion.div>
    </div>
  );
}
