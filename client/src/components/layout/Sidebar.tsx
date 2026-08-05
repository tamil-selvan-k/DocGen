import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GitBranch, Briefcase, Settings, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const NAV = [
  { to: '/app/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/repositories', icon: GitBranch,       label: 'Repositories' },
  { to: '/app/jobs',         icon: Briefcase,       label: 'Jobs' },
  { to: '/app/settings',     icon: Settings,        label: 'Settings' },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  isCollapsed: boolean;
  onLogoutClick: () => void;
}

export function Sidebar({ isMobileOpen, onMobileClose, isCollapsed, onLogoutClick }: SidebarProps) {
  const { user } = useAuth();

  return (
    <>
      {/* Mobile Overlay Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Sidebar aside */}
      <aside
        className={`flex flex-col min-h-screen border-r border-[var(--color-border)] bg-[var(--color-surface)] flex-shrink-0 transition-all duration-200 z-50
          fixed md:sticky top-0 bottom-0 left-0 h-screen
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isCollapsed ? 'md:w-16 w-60' : 'w-60'}
        `}
      >
        {/* Logo & Mobile Close */}
        <div className={`flex items-center px-4 py-5 border-b border-[var(--color-border)] ${isCollapsed ? 'md:justify-center justify-between' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/logo.webp" alt="Logo" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
            {/* Show label if sidebar is not collapsed OR if in mobile drawer */}
            {(!isCollapsed || isMobileOpen) ? (
              <span className="font-semibold text-slate-100 truncate">DocGen AI</span>
            ) : (
              <span className="font-semibold text-slate-100 truncate md:hidden">DocGen AI</span>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to} to={to}
              onClick={() => onMobileClose()}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isCollapsed ? 'md:justify-center' : ''
                } ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#1e2640]'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {(!isCollapsed || isMobileOpen) ? (
                <span className="truncate">{label}</span>
              ) : (
                <span className="truncate md:hidden">{label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User profile & Logout footer */}
        <div className="border-t border-[var(--color-border)] p-3 flex flex-col gap-2 bg-[var(--color-surface)]">
          {/* User profile NavLink */}
          <NavLink
            to="/app/profile"
            onClick={() => onMobileClose()}
            title={isCollapsed ? 'View Profile' : undefined}
            className={`flex items-center gap-3 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[var(--color-border)] transition-all duration-150 ${
              isCollapsed ? 'md:justify-center' : ''
            }`}
          >
            {/* User Avatar Circle */}
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 flex items-center justify-center font-bold text-sm uppercase flex-shrink-0">
              {user?.email ? user.email.charAt(0) : 'U'}
            </div>

            {/* User email & username */}
            {(!isCollapsed || isMobileOpen) ? (
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.email}</p>
                {user?.github && (
                  <p className="text-[10px] text-indigo-400 truncate">@{user.github.username}</p>
                )}
              </div>
            ) : (
              <div className="md:hidden min-w-0 flex-1 text-left">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.email}</p>
                {user?.github && (
                  <p className="text-[10px] text-indigo-400 truncate">@{user.github.username}</p>
                )}
              </div>
            )}
          </NavLink>

          {/* Logout Button */}
          <button
            onClick={onLogoutClick}
            title={isCollapsed ? 'Logout' : undefined}
            className={`flex items-center gap-3 p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-red-950/20 hover:text-red-400 transition-all duration-150 w-full ${
              isCollapsed ? 'md:justify-center' : ''
            }`}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {(!isCollapsed || isMobileOpen) ? (
              <span className="text-xs font-medium">Logout</span>
            ) : (
              <span className="text-xs font-medium md:hidden">Logout</span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
