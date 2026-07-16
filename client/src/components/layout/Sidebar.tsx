import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GitBranch, Briefcase, Settings, LogOut, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/common/Toast';

const NAV = [
  { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/repositories', icon: GitBranch,       label: 'Repositories' },
  { to: '/app/jobs',         icon: Briefcase,       label: 'Jobs' },
  { to: '/app/settings',     icon: Settings,        label: 'Settings' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      success('Logged out successfully');
      navigate('/login');
    } catch {
      error('Logout failed');
    }
  };

  return (
    <aside className="flex flex-col w-60 min-h-screen border-r border-[#1e2640] bg-[#0d1017] flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1e2640]">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-slate-100">AutoDocs AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2640]'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-[#1e2640] space-y-1">
        <div className="px-3 py-2">
          <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          {user?.github && (
            <p className="text-xs text-indigo-400 truncate">@{user.github.username}</p>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="btn-ghost w-full justify-start text-slate-400"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
