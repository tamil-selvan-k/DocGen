import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14]">
      <div className="text-center">
        <p className="text-7xl font-black text-indigo-500/20 mb-4">404</p>
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-slate-100 mb-2">Page not found</h1>
        <p className="text-slate-500 text-sm mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/app/dashboard" className="btn-primary inline-flex">Go to Dashboard</Link>
      </div>
    </div>
  );
}

export function Forbidden() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14]">
      <div className="text-center">
        <p className="text-7xl font-black text-red-500/20 mb-4">403</p>
        <h1 className="text-xl font-semibold text-slate-100 mb-2">Access Denied</h1>
        <p className="text-slate-500 text-sm mb-6">You don't have permission to access this resource.</p>
        <Link to="/app/dashboard" className="btn-primary inline-flex">Go to Dashboard</Link>
      </div>
    </div>
  );
}

export function ServerError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0d14]">
      <div className="text-center">
        <p className="text-7xl font-black text-red-500/20 mb-4">500</p>
        <h1 className="text-xl font-semibold text-slate-100 mb-2">Server Error</h1>
        <p className="text-slate-500 text-sm mb-6">Something went wrong on our end. Please try again.</p>
        <button onClick={() => window.location.reload()} className="btn-primary inline-flex">Retry</button>
      </div>
    </div>
  );
}
