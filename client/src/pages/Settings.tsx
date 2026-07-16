import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Github, Trash2, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth.api';
import { githubApi } from '@/api/github.api';
import { Card, CardHeader } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Badge } from '@/components/common/Badge';
import { useToast } from '@/components/common/Toast';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/validators/auth.validators';

function PasswordSection() {
  const { success, error } = useToast();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      success('Password changed successfully');
      reset();
    } catch (err: unknown) {
      const e = err as { message?: string };
      error(e.message || 'Failed to change password');
    }
  };

  return (
    <Card>
      <CardHeader title="Change Password" description="Update your account password" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <PasswordInput label="Current Password" error={errors.currentPassword?.message} {...register('currentPassword')} />
        <PasswordInput label="New Password" id="newPassword" error={errors.newPassword?.message} {...register('newPassword')} />
        <PasswordInput label="Confirm New Password" id="confirmNewPassword" error={errors.confirmNewPassword?.message} {...register('confirmNewPassword')} />
        <Button type="submit" loading={isSubmitting}>Update Password</Button>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [confirmLogout, setConfirmLogout] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => logout(),
    onSuccess: () => { success('Logged out'); navigate('/login'); },
    onError: () => error('Logout failed'),
  });

  const githubConnectUrl = githubApi.getConnectUrl();

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">Manage your account and integrations</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader title="Profile" description="Your account information" />
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-slate-500 mb-0.5">Email</dt>
            <dd className="text-sm text-slate-200">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 mb-0.5">Member since</dt>
            <dd className="text-sm text-slate-200">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</dd>
          </div>
        </dl>
      </Card>

      {/* Password */}
      <PasswordSection />

      {/* GitHub */}
      <Card>
        <CardHeader title="GitHub Integration" icon={<Github className="w-4 h-4 text-slate-400" />} />
        {user?.github ? (
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-sm text-slate-200 font-medium">Connected as @{user.github.username}</p>
              <p className="text-xs text-slate-500">Your GitHub account is linked</p>
            </div>
            <Badge variant="success" className="ml-auto">Connected</Badge>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">Connect your GitHub account to enable repository sync and documentation generation.</p>
            <a href={githubConnectUrl} className="btn-primary inline-flex">
              <Github className="w-4 h-4" />
              Connect GitHub
            </a>
          </div>
        )}
      </Card>

      {/* Coming Soon */}
      <Card>
        <CardHeader title="Notifications" />
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">Email and webhook notifications</p>
          <Badge variant="default">Coming Soon</Badge>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20">
        <CardHeader title="Danger Zone" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300 font-medium">Sign out</p>
            <p className="text-xs text-slate-500">End your current session</p>
          </div>
          <Button variant="danger" loading={logoutMutation.isPending} onClick={() => {
            if (confirmLogout) {
              logoutMutation.mutate();
            } else {
              setConfirmLogout(true);
            }
          }}>
            <Trash2 className="w-4 h-4" />
            {confirmLogout ? 'Confirm Logout' : 'Logout'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
