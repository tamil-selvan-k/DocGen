import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Settings, Github, Trash2, CheckCircle, User as UserIcon, KeyRound, AlertTriangle, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/api/auth.api';
import { githubApi } from '@/api/github.api';
import { Card, CardHeader } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { PasswordInput } from '@/components/common/PasswordInput';
import { Badge } from '@/components/common/Badge';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
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
    } catch (err: any) {
      error(err.message || 'Failed to change password');
    }
  };

  return (
    <Card>
      <CardHeader title="Change Password" description="Update your login credentials" />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PasswordInput
          label="Current Password"
          placeholder="Enter current password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordInput
          label="New Password"
          placeholder="Min 8 characters"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordInput
          label="Confirm New Password"
          id="confirmNewPassword"
          placeholder="Repeat new password"
          error={errors.confirmNewPassword?.message}
          {...register('confirmNewPassword')}
        />
        <div className="pt-2">
          <Button type="submit" loading={isSubmitting}>
            Save Changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'integrations' | 'danger'>('profile');
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({
    profile: true,
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'midnight');

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleTabChange = (tabId: 'profile' | 'security' | 'integrations' | 'danger') => {
    setActiveTab(tabId);
    setVisitedTabs(prev => ({ ...prev, [tabId]: true }));
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  const deleteAccountMutation = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: () => {
      success('Your account has been deleted.');
      logout();
      navigate('/login');
    },
    onError: (err: any) => {
      error(err.message || 'Failed to delete account');
      setShowDeleteModal(false);
      setDeleteConfirmationText('');
    },
  });

  const githubConnectUrl = githubApi.getConnectUrl();
  const githubInstallUrl = githubApi.getInstallUrl();

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: UserIcon },
    { id: 'security', label: 'Security & Password', icon: KeyRound },
    { id: 'integrations', label: 'GitHub Integration', icon: Github },
    { id: 'danger', label: 'Danger Zone', icon: Trash2 },
  ] as const;

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
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-400" />
            Settings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage your account preferences, configurations, and integrations</p>
        </div>

      {/* Main Grid Wrapper */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Settings Tab Sidebar */}
        <div className="md:col-span-1 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 border-b md:border-b-0 border-[var(--color-border)]">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/20 md:w-full text-left'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[var(--color-surface-2)] md:w-full text-left'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Settings Tab Content */}
        <div className="md:col-span-3 space-y-6">
          {/* Profile Tab */}
          <div className={activeTab === 'profile' ? 'block' : 'hidden'}>
            {visitedTabs.profile && (
              <>
                <Card>
                  <CardHeader title="Account Details" description="Your basic profile metadata" />
                  <dl className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                    <div className="border-b border-[var(--color-border)] sm:border-0 pb-3 sm:pb-0">
                      <dt className="text-xs text-slate-500 mb-0.5">Email address</dt>
                      <dd className="text-sm font-medium text-slate-200">{user?.email}</dd>
                    </div>
                    <div className="border-b border-[var(--color-border)] sm:border-0 pb-3 sm:pb-0">
                      <dt className="text-xs text-slate-500 mb-0.5">Account created</dt>
                      <dd className="text-sm font-medium text-slate-200">
                        {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-slate-500 mb-0.5">Integration status</dt>
                      <dd className="text-sm mt-1">
                        {user?.github ? (
                          <Badge variant="success">Connected to @{user.github.username}</Badge>
                        ) : (
                          <Badge variant="default">No github connected</Badge>
                        )}
                      </dd>
                    </div>
                  </dl>
                </Card>

                <Card className="mt-6">
                  <CardHeader title="Appearance Settings" description="Customize the application visual theme" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { id: 'midnight', label: 'Midnight (Default)', desc: 'Sleek dark indigo workspace', color: 'bg-[#6366f1]' },
                      { id: 'slate-emerald', label: 'Slate Emerald', desc: 'Deep slate with forest greens', color: 'bg-[#10b981]' },
                      { id: 'cyberpunk', label: 'Cyberpunk', desc: 'Neon pink and pitch backdrops', color: 'bg-[#d946ef]' },
                      { id: 'light', label: 'Light Theme', desc: 'Clean high-contrast slate interface', color: 'bg-[#4f46e5]' },
                    ].map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`p-4 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-32 focus:outline-none ${
                          theme === t.id
                            ? 'border-indigo-500 bg-indigo-500/5 ring-1 ring-indigo-500'
                            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]'
                        }`}
                      >
                        <div>
                          <span className="text-xs font-semibold text-slate-200 block">{t.label}</span>
                          <span className="text-[10px] text-slate-500 mt-1.5 block leading-normal">{t.desc}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-4">
                          <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{t.id}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>

          {/* Security Tab */}
          <div className={activeTab === 'security' ? 'block' : 'hidden'}>
            {visitedTabs.security && <PasswordSection />}
          </div>

          {/* Integrations Tab */}
          <div className={activeTab === 'integrations' ? 'block' : 'hidden'}>
            {visitedTabs.integrations && (
              <Card>
                <CardHeader title="GitHub Integration" description="Configure permissions and synchronize repository settings" icon={<Github className="w-4 h-4 text-slate-400" />} />
                {user?.github ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-sm text-slate-200 font-medium">Connected as @{user.github.username}</p>
                        <p className="text-xs text-slate-500">Auto-sync for documentation PR generation is active</p>
                      </div>
                      <Badge variant="success" className="ml-auto">Connected</Badge>
                    </div>
                    <div className="pt-4 border-t border-[var(--color-border)] flex flex-col gap-2 items-start">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        To synchronize repository updates and deploy automatic docs generation workflows, configure the DocGen App on your target repositories.
                      </p>
                      <a href={githubInstallUrl} className="btn-secondary inline-flex items-center gap-2 mt-2">
                        <Github className="w-4 h-4" />
                        Configure Repositories (Install App)
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400">Connect your GitHub account to import repositories and enable automated PR generation.</p>
                    <a href={githubConnectUrl} className="btn-primary inline-flex items-center gap-2">
                      <Github className="w-4 h-4" />
                      Connect GitHub Account
                    </a>
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Danger Zone Tab */}
          <div className={activeTab === 'danger' ? 'block' : 'hidden'}>
            {visitedTabs.danger && (
              <Card className="border-red-500/20 bg-red-950/5">
                <CardHeader title="Danger Zone" description="Irreversible actions for your user account" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-200 font-semibold">Delete Account</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Permanently delete your profile and all associated repository configurations, execution jobs, and pull requests.
                    </p>
                  </div>
                  <Button variant="danger" className="flex-shrink-0 self-start sm:self-auto" onClick={() => setShowDeleteModal(true)}>
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal open={showDeleteModal} onClose={() => { setShowDeleteModal(false); setDeleteConfirmationText(''); }} title="Delete Account">
        <div className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-xs text-red-300 leading-relaxed">
            ⚠️ <strong>Warning:</strong> Deleting your account will immediately wipe all configured repository references, sync logs, and GitHub integration mappings. This action cannot be undone.
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              To verify deletion, please type <span className="font-mono text-slate-200 font-semibold bg-[var(--color-surface-2)] px-1.5 py-0.5 rounded border border-[var(--color-border)]">delete my account</span> below:
            </p>
            <Input
              placeholder="delete my account"
              value={deleteConfirmationText}
              onChange={e => setDeleteConfirmationText(e.target.value)}
            />
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t border-[var(--color-border)]">
            <Button variant="secondary" onClick={() => { setShowDeleteModal(false); setDeleteConfirmationText(''); }}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={deleteConfirmationText !== 'delete my account'}
              loading={deleteAccountMutation.isPending}
              onClick={() => deleteAccountMutation.mutate()}
            >
              <Trash2 className="w-4 h-4" /> Permanently Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  </div>
  );
}
