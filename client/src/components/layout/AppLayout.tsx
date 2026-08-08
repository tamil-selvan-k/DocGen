import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Menu, PanelLeftClose, PanelLeft, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';

export function AppLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();

  const handleConfirmLogout = async () => {
    try {
      await logout();
      success('Logged out successfully');
      setShowLogoutModal(false);
      navigate('/login');
    } catch {
      error('Logout failed');
    }
  };

  return (
    <div className="flex h-full min-h-screen bg-[var(--color-bg)]">
      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:text-slate-200 focus:outline-none"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-100">DocGen</span>
        </div>
      </header>

      {/* Responsive Sidebar */}
      <Sidebar
        isMobileOpen={isSidebarOpen}
        onMobileClose={() => setIsSidebarOpen(false)}
        isCollapsed={isCollapsed}
        onLogoutClick={() => setShowLogoutModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex h-16 bg-[var(--color-surface)] border-b border-[var(--color-border)] items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Sidebar toggle button (matching GateZentry layout) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-[var(--color-border)] rounded-lg transition-colors focus:outline-none"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              {isCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>

            {/* User display */}
            <span className="text-sm font-semibold text-slate-200">
              {user?.github?.username || user?.email?.split('@')[0]}
            </span>
          </div>

        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-auto bg-[var(--color-bg)] pt-16 md:pt-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Confirm Logout"
      >
        <div className="space-y-4 pt-2">
          <p className="text-sm text-slate-400">
            Are you sure you want to log out of your session? You will need to sign in again to access your documentation projects.
          </p>
          <div className="flex gap-3 justify-end pt-3 border-t border-[var(--color-border)]">
            <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirmLogout}>
              <LogOut className="w-4 h-4" /> Log out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
