import React from 'react';
import { Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/common/Badge';

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14] px-4">
      <div className="w-full max-w-sm card p-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
        </div>
        <Badge variant="warning" className="mb-4">Coming Soon</Badge>
        <h1 className="text-lg font-semibold text-slate-100 mb-2">Forgot Password</h1>
        <p className="text-sm text-slate-500 mb-6">
          Password reset via email is not yet available. Please contact support or use your current password.
        </p>
        <Link to="/login" className="btn-primary w-full justify-center">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
