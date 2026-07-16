import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProviders } from '@/providers/AppProviders';
import { ToastProvider } from '@/components/common/Toast';
import { ProtectedRoute, PublicOnlyRoute } from '@/routes/guards';
import { AppLayout } from '@/components/layout/AppLayout';

// Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import GitHubCallback from '@/pages/GitHubCallback';
import Dashboard from '@/pages/Dashboard';
import Repositories from '@/pages/Repositories';
import Jobs from '@/pages/Jobs';
import JobDetail from '@/pages/JobDetail';
import SettingsPage from '@/pages/Settings';
import { NotFound, Forbidden, ServerError } from '@/pages/errors/ErrorPages';

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/github/callback" element={<GitHubCallback />} />
            <Route path="/403" element={<Forbidden />} />
            <Route path="/500" element={<ServerError />} />

            {/* Public-only (redirect authenticated to dashboard) */}
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            {/* Protected app routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<Navigate to="/app/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="repositories" element={<Repositories />} />
                <Route path="jobs" element={<Jobs />} />
                <Route path="jobs/:id" element={<JobDetail />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ToastProvider>
      </AppProviders>
    </BrowserRouter>
  );
}
