'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { COMMON_TIMEZONES } from '@/lib/utils/timezone';
import {
  Zap,
  User,
  CreditCard,
  Building2,
  Bell,
  Sliders,
  RefreshCw,
  CheckCircle2,
  Upload,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from "@/lib/utils";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Firm {
  id: string;
  name: string;
  brand_color: string;
  xero_connection_status: string;
  xero_org_name: string | null;
  xero_last_sync_at: string | null;
  xero_refresh_token_expires_at: string | null;
  reply_to_email: string | null;
  default_reminder_days: number[] | null;
  auto_reminders_enabled: boolean;
  default_client_language: string | null;
  timezone: string | null;
}

interface Subscription {
  plan: string;
  client_limit: number;
  status: string;
  current_period_end?: string | null;
  stripe_customer_id?: string | null;
}

interface SettingsClientProps {
  firm: Firm | null;
  subscription?: Subscription;
  clientCount?: number;
}

export function SettingsClient({ firm, subscription, clientCount = 0 }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const section = searchParams.get('section') || 'xero';
  const [firmData, setFirmData] = useState(firm);

  // Sync firm state when firm prop changes
  useEffect(() => {
    setFirmData(firm);
  }, [firm]);

  return (
    <div className="flex-1 space-y-6">
      {section === 'xero' && <XeroSettings firm={firmData} setFirm={setFirmData} />}
      {section === 'profile' && <ProfileSettings firm={firmData} />}
      {section === 'notifications' && <NotificationsSettings />}
      {section === 'branding' && <BrandingSettings firm={firmData} plan={subscription?.plan || 'Professional'} />}
      {section === 'billing' && <BillingSettings subscription={subscription} clientCount={clientCount} />}
      {section === 'defaults' && <GlobalDefaultsSettings firm={firmData} />}
    </div>
  );
}

function XeroSettings({ firm, setFirm }: { firm: Firm | null; setFirm?: (f: Firm | null) => void }) {
  // Derive connected directly from firm prop (not useState) so it updates when firm changes
  const connected = firm?.xero_connection_status === 'connected';
  const [apiMode, setApiMode] = useState<'attachments' | 'files'>('attachments');
  const [syncing, setSyncing] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  // formatRelativeTime is imported from utils

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/xero/auth-url');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast.error('Failed to get Xero authorization URL');
      }
    } catch (error) {
      toast.error('Failed to connect to Xero');
    }
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    toast.success('Syncing with Xero...');
    try {
      const response = await fetch('/api/xero/sync', { method: 'POST' });
      if (response.ok) {
        toast.success('Sync completed');
        // Update local state instead of reloading page
        if (setFirm) {
          setFirm(firm ? {
            ...firm,
            xero_last_sync_at: new Date().toISOString(),
          } : firm);
        }
      } else {
        toast.error('Sync failed');
      }
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    setShowDisconnectDialog(true);
  };

  const confirmDisconnect = async () => {
    setShowDisconnectDialog(false);
    try {
      const response = await fetch('/api/xero/disconnect', { method: 'POST' });
      if (response.ok) {
        toast.success('Disconnected from Xero');
        // Update local state instead of reloading page
        if (setFirm) {
          setFirm(firm ? {
            ...firm,
            xero_connection_status: 'disconnected',
            xero_org_name: null,
            xero_last_sync_at: null,
          } : firm);
        }
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <CardTitle>Xero Connection</CardTitle>
            </div>
            <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${connected ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? '#059669' : '#DC2626', boxShadow: connected ? '0 0 4px #059669' : 'none' }} />
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <CardDescription>Manage your Xero integration and sync settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected && firm && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Organisation</p>
                  <p className="text-sm font-semibold">{firm.xero_org_name || 'Not connected'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Sync</p>
                  <p className="text-sm font-semibold">{firm.xero_last_sync_at ? formatRelativeTime(firm.xero_last_sync_at) : 'Never'}</p>
                </div>
              </div>
              {firm.xero_refresh_token_expires_at && (() => {
                const expiresAt = new Date(firm.xero_refresh_token_expires_at)
                const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                if (daysLeft <= 7) {
                  return (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700 font-medium">
                        Refresh token expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong> — reconnect soon to avoid interruption.
                      </p>
                    </div>
                  )
                }
                return (
                  <p className="text-[11px] text-muted-foreground">
                    Refresh token valid for <strong>{daysLeft} days</strong>
                  </p>
                )
              })()}
            </>
          )}

          <div className="flex gap-3">
            {connected ? (
              <>
                <Button onClick={handleSync} disabled={syncing}>
                  {syncing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" /> Sync Now
                    </>
                  )}
                </Button>
                <Button variant="destructive" onClick={handleDisconnect}>
                  Disconnect Xero
                </Button>
              </>
            ) : (
              <Button className="bg-[#13B8A4] hover:bg-[#0F9A8A]" onClick={handleConnect}>
                <Zap className="h-4 w-4 mr-2" /> Connect with Xero
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Upload API Mode</CardTitle>
          <CardDescription>Choose how files are uploaded to Xero. You can switch anytime for testing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setApiMode('attachments')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${apiMode === 'attachments' ? 'border-emerald-500 bg-emerald-50' : 'border-border bg-background'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${apiMode === 'attachments' ? 'border-emerald-500' : 'border-muted-foreground'}`}>
                  {apiMode === 'attachments' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
                <p className="text-sm font-semibold">Attachments API</p>
              </div>
              <p className="text-xs text-muted-foreground">Files attached directly to Contact records. Recommended.</p>
            </button>
            <button
              onClick={() => setApiMode('files')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${apiMode === 'files' ? 'border-emerald-500 bg-emerald-50' : 'border-border bg-background'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${apiMode === 'files' ? 'border-emerald-500' : 'border-muted-foreground'}`}>
                  {apiMode === 'files' && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                </div>
                <p className="text-sm font-semibold">Files API</p>
              </div>
              <p className="text-xs text-muted-foreground">Files uploaded to Xero Files Inbox, then associated.</p>
            </button>
          </div>
          <Button 
            onClick={async () => {
              if (!firm) return;
              try {
                const { createClient } = await import('@/lib/supabase/client');
                const supabase = createClient();
                const { error } = await supabase.from('firms').update({ xero_upload_mode: apiMode }).eq('id', firm.id);
                if (error) throw error;
                toast.success(`Upload mode saved as ${apiMode}`);
              } catch(e: any) {
                toast.error(`Failed to save: ${e.message}`);
              }
            }} 
            className="shrink-0"
          >
            Save Mode
          </Button>
        </CardContent>
      </Card>

      {/* OAuth Scopes */}
      <Card>
        <CardHeader>
          <CardTitle>OAuth Permissions</CardTitle>
          <CardDescription>Permissions granted to Filio for Xero access</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { scope: 'openid profile email', desc: 'Basic identity', granted: true },
              { scope: 'accounting.contacts', desc: 'Read/write client contacts', granted: true },
              { scope: 'accounting.attachments', desc: 'Upload file attachments', granted: true },
              { scope: 'files', desc: 'Manage Xero Files', granted: true },
              { scope: 'offline_access', desc: 'Refresh token (auto-renew)', granted: true },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <div className="flex-1">
                  <p className="text-xs font-mono font-semibold text-foreground">{s.scope}</p>
                  <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-600">Granted</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      {showDisconnectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Disconnect from Xero?
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Disconnecting will suspend all client portals. Clients will no longer be able to upload documents via Magic Email or the Client Portal. This action can be reversed by reconnecting.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDisconnectDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-red-500 hover:bg-red-600"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSettings({ firm }: { firm: Firm | null }) {
  const [showPwd, setShowPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    position: '',
    language: 'en',
    avatarUrl: '',
  });
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile({
          fullName: data.full_name || '',
          email: data.email || '',
          position: data.position || '',
          language: data.language || 'en',
          avatarUrl: data.avatar_url || '',
        });
      })
      .catch(() => toast.error('Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profile.fullName,
          position: profile.position,
          language: profile.language,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP files allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File must be under 2 MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setProfile(prev => ({ ...prev, avatarUrl: data.avatarUrl }));
      toast.success('Avatar updated');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (pwdForm.next !== pwdForm.confirm) { toast.error('Passwords do not match'); return; }
    setChangingPwd(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwdForm.current, newPassword: pwdForm.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      toast.success('Password updated');
      setPwdForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChangingPwd(false);
    }
  };

  const initials = profile.fullName.trim()
    ? profile.fullName.trim().split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : profile.email.slice(0, 2).toUpperCase();

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="skeleton h-48 rounded-xl w-full mb-4" />
        <div className="skeleton h-40 rounded-xl w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative group w-16 h-16 shrink-0">
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl bg-emerald-600">
                  {initials}
                </div>
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                </div>
              )}
            </div>
            <div>
              <label className="cursor-pointer">
                <Button variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                />
              </label>
              <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG or WebP · max 2 MB</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                readOnly
                className="bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="text-[10px] text-muted-foreground">Email is managed by your authentication provider and cannot be changed here.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Job Title / Position</Label>
              <Input
                id="position"
                value={profile.position}
                onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                placeholder="e.g. Senior Accountant"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language Preference</Label>
              <Select value={profile.language} onValueChange={val => setProfile({ ...profile, language: val })}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">简体中文</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving} className="shrink-0">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPwd">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPwd"
                type={showPwd ? 'text' : 'password'}
                value={pwdForm.current}
                onChange={e => setPwdForm({ ...pwdForm, current: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPwd">New Password</Label>
            <div className="relative">
              <Input
                id="newPwd"
                type={showNewPwd ? 'text' : 'password'}
                value={pwdForm.next}
                onChange={e => setPwdForm({ ...pwdForm, next: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPwd(!showNewPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">Min 8 characters · 1 uppercase · 1 lowercase · 1 number</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPwd">Confirm New Password</Label>
            <Input
              id="confirmPwd"
              type="password"
              value={pwdForm.confirm}
              onChange={e => setPwdForm({ ...pwdForm, confirm: e.target.value })}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPwd || !pwdForm.current || !pwdForm.next} className="shrink-0">
            {changingPwd ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : 'Update Password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const PLAN_MONTHLY_COST: Record<string, string> = {
  starter: '£29.00',
  professional: '£69.00',
  firm: '£149.00',
};

const PLAN_SLUGS: Record<string, string> = {
  starter: 'starter',
  professional: 'professional',
  firm: 'firm',
};

interface Invoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  pdfUrl: string | null;
  hostedUrl: string | null;
}

function BillingSettings({ subscription, clientCount = 0 }: { subscription?: Subscription; clientCount?: number }) {
  const currentPlan = (subscription?.plan || 'trial').toLowerCase();
  const capitalizedPlan = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  const isTrial = currentPlan === 'trial';
  const isCanceled = subscription?.status === 'canceled';
  const hasStripeCustomer = !!subscription?.stripe_customer_id;

  let limit = subscription?.client_limit || 100;
  if (currentPlan === 'firm') limit = 9999;
  const percentage = Math.min(100, Math.round((clientCount / limit) * 100)) || 0;

  const nextBilling = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : isTrial ? 'Trial period' : '—';

  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  useEffect(() => {
    if (!hasStripeCustomer) return;
    setLoadingInvoices(true);
    fetch('/api/stripe/invoices')
      .then((r) => r.json())
      .then((d) => setInvoices(d.data || []))
      .catch(() => {})
      .finally(() => setLoadingInvoices(false));
  }, [hasStripeCustomer]);

  const handleUpgrade = async (planSlug: string) => {
    setCheckingOut(planSlug);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planSlug }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to start checkout');
      }
    } catch {
      toast.error('Failed to start checkout');
    } finally {
      setCheckingOut(null);
    }
  };

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || 'Failed to open billing portal');
      }
    } catch {
      toast.error('Failed to open billing portal');
    } finally {
      setOpeningPortal(false);
    }
  };

  const plans = [
    {
      name: 'Starter',
      slug: 'starter',
      price: '£29',
      clients: 20,
      features: ['Client Portal', 'Xero Direct Sync', 'Automated Email Reminders'],
    },
    {
      name: 'Professional',
      slug: 'professional',
      price: '£69',
      clients: 100,
      features: ['All Starter features', 'Magic Email', 'Document Checklist', 'Client Activity', 'Brand Customization'],
    },
    {
      name: 'Firm',
      slug: 'firm',
      price: '£149',
      clients: 'Unlimited',
      features: ['All Professional features', 'Custom Domain (coming)', 'Team Members (coming)', 'API Access (coming)'],
    },
  ];

  const planRank: Record<string, number> = { starter: 0, professional: 1, firm: 2 };
  const currentRank = planRank[currentPlan] ?? 1;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isCanceled ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {isTrial ? 'Trial (Pro Features)' : capitalizedPlan} · {isCanceled ? 'Canceled' : 'Active'}
              </span>
              {hasStripeCustomer && (
                <Button variant="outline" size="sm" onClick={handleManageBilling} disabled={openingPortal}>
                  {openingPortal ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Manage Billing'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Clients Used</p>
              <p className="text-xl font-bold tabular-nums">
                {clientCount} / {currentPlan === 'firm' ? '∞' : limit}
              </p>
              {currentPlan !== 'firm' && (
                <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-amber-500' : 'bg-emerald-600'}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Next Billing</p>
              <p className="text-xl font-bold">{nextBilling}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Cost</p>
              <p className="text-xl font-bold tabular-nums">
                {isTrial ? '£0.00' : (PLAN_MONTHLY_COST[currentPlan] ?? '—')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.slug === currentPlan || (isTrial && p.slug === 'professional');
          const targetRank = planRank[p.slug] ?? 1;
          const isDowngrade = targetRank < currentRank;
          const isLoading = checkingOut === p.slug;

          return (
            <Card key={p.name} className={isCurrent ? 'ring-2 ring-emerald-500' : ''}>
              <CardHeader className="pb-3">
                {isCurrent && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-2 w-fit">
                    Current Plan
                  </span>
                )}
                <CardTitle className="text-base">{p.name}</CardTitle>
                <p className="text-2xl font-bold">
                  {p.price}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs text-muted-foreground">Up to {p.clients} clients</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5 mb-4">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" /> {f}
                    </div>
                  ))}
                </div>
                {!isCurrent && (
                  <Button
                    variant={isDowngrade ? 'outline' : 'default'}
                    className="w-full"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleUpgrade(PLAN_SLUGS[p.slug])}
                  >
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : isDowngrade ? 'Downgrade' : 'Upgrade'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invoice History */}
      {hasStripeCustomer && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading invoices…
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="divide-y">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(inv.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="font-medium tabular-nums">
                      {inv.currency} {inv.amount.toFixed(2)}
                    </span>
                    {inv.pdfUrl && (
                      <a
                        href={inv.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-700 hover:underline"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GDPR Data Deletion */}
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Need to delete your account and data?{' '}
          <a href="mailto:privacy@filio.uk?subject=Data Deletion Request" className="text-red-600 hover:underline">
            Request data deletion
          </a>
          {' '}— we will process your request within 30 days in accordance with GDPR.
        </p>
      </div>
    </div>
  );
}

function BrandingSettings({ firm, plan = 'Professional' }: { firm: Firm | null; plan?: string }) {
  const [brandColor, setBrandColor] = useState(firm?.brand_color || '#064E3B');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isStarter = plan.toLowerCase() === 'starter';
  const isFirm = plan.toLowerCase() === 'firm';

  useEffect(() => {
    if (isStarter) { setLoading(false); return; }
    fetch('/api/firm/branding')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setBrandColor(data.brand_color || '#064E3B');
          setLogoUrl(data.logo_url || null);
          setWelcomeMessage(data.portal_welcome_message || 'Welcome! Please upload your documents using the button below.');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isStarter]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/firm/logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setLogoUrl(data.url);
      toast.success('Logo uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/firm/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_color: brandColor,
          portal_welcome_message: welcomeMessage,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success('Branding saved');
    } catch {
      toast.error('Failed to save branding');
    } finally {
      setSaving(false);
    }
  };

  if (isStarter) {
    return (
      <div className="max-w-2xl text-center py-16 bg-white rounded-xl border border-dashed border-border flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Available on Professional</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Upgrade your plan to customize the portal with your firm&apos;s brand colors and welcome message.</p>
        <Button>Upgrade to Professional</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="skeleton h-64 rounded-xl w-full" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 items-start">
      <div className="flex-1 space-y-5 min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Firm Branding</CardTitle>
            <CardDescription>Customise the client portal with your firm&apos;s identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Firm Logo</Label>
              {logoUrl ? (
                <div className="flex items-center gap-3">
                  <img src={logoUrl} alt="Firm logo" className="h-10 object-contain rounded border border-gray-100 px-2" />
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span><Upload className="h-3.5 w-3.5 mr-1.5" /> Replace</span>
                    </Button>
                    <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="sr-only" onChange={handleLogoUpload} disabled={uploadingLogo} />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 text-center hover:border-emerald-300 transition-all">
                    {uploadingLogo ? (
                      <Loader2 className="h-6 w-6 mx-auto mb-2 text-emerald-500 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                    )}
                    <p className="text-sm text-muted-foreground">Drop logo here or <span className="text-emerald-600">browse</span></p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, SVG, or JPG · Max 2MB · Recommended 200×60px</p>
                  </div>
                  <input type="file" accept="image/png,image/svg+xml,image/jpeg,image/webp" className="sr-only" onChange={handleLogoUpload} disabled={uploadingLogo} />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="brandColor">Portal Header Colour</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="brandColor"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-input cursor-pointer"
                />
                <Input
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="font-mono max-w-[140px]"
                  placeholder="#064E3B"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="welcomeMsg">Portal Welcome Message</Label>
              <textarea
                id="welcomeMsg"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                maxLength={500}
                rows={3}
                className="w-full text-sm px-3 py-2 rounded-lg border border-input focus:outline-none focus:border-emerald-400 transition-all resize-none"
              />
              <p className="text-[10px] text-muted-foreground">{welcomeMessage.length}/500 characters</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="shrink-0">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Branding'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom Domain</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Use your own domain for the client portal, e.g. <span className="font-mono">portal.yourfirm.co.uk</span>
            </p>
            {isFirm ? (
              <Button variant="outline" size="sm">Configure Domain</Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => toast.info('Upgrade to Firm plan to unlock custom domain')}>
                Upgrade to Enable
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Preview Panel */}
      <div className="w-72 shrink-0 sticky top-6">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Portal Preview</p>
        <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm text-xs">
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: brandColor }}>
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="h-6 object-contain" />
            ) : (
              <div className="w-6 h-6 rounded bg-white/20 flex items-center justify-center text-white font-bold text-[10px]">F</div>
            )}
            <span className="text-white font-semibold text-[11px]">{firm?.name || 'Your Firm'}</span>
          </div>
          <div className="p-4 bg-gray-50">
            <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm space-y-2">
              <p className="font-semibold text-gray-800 text-[11px]">Document Portal</p>
              <p className="text-gray-500 text-[10px] leading-relaxed line-clamp-3">{welcomeMessage || 'Welcome message will appear here.'}</p>
              <div className="mt-2 h-7 rounded-md flex items-center justify-center text-white text-[10px] font-semibold" style={{ background: brandColor }}>
                Upload Documents
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type NotifPrefs = {
  notify_daily_digest: boolean
  notify_sync_failure: boolean
  notify_client_overdue: boolean
  notify_quota_warning: boolean
  notify_auto_dormant: boolean
  notify_dormant_reminder: boolean
  notify_upload_attempt: boolean
  notify_weekly_report: boolean
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  notify_daily_digest: true,
  notify_sync_failure: true,
  notify_client_overdue: true,
  notify_quota_warning: true,
  notify_auto_dormant: true,
  notify_dormant_reminder: true,
  notify_upload_attempt: false,
  notify_weekly_report: false,
}

function NotificationsSettings() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/firm/notification-prefs')
      .then(r => r.json())
      .then(data => {
        if (!data.error) setPrefs({ ...DEFAULT_NOTIF_PREFS, ...data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: keyof NotifPrefs) =>
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/firm/notification-prefs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error();
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const items: { key: keyof NotifPrefs; label: string; desc: string; tag?: string }[] = [
    { key: 'notify_daily_digest', label: 'Daily digest', desc: 'Daily summary of client activity, uploads, and pending actions' },
    { key: 'notify_sync_failure', label: 'Xero sync failed', desc: 'Alert when a file fails to sync to Xero' },
    { key: 'notify_client_overdue', label: 'Client overdue', desc: 'Notify when a client becomes overdue on their filing deadline' },
    { key: 'notify_quota_warning', label: 'Storage quota at 80%', desc: 'Warn when your account reaches 80% of its client or storage limit' },
    { key: 'notify_auto_dormant', label: 'Client set to Dormant', desc: 'Notify when a client is automatically moved to Dormant status' },
    { key: 'notify_dormant_reminder', label: 'Dormant client reminder', desc: 'Remind when a dormant client has had no activity for 90+ days' },
    { key: 'notify_upload_attempt', label: 'Upload attempt from client', desc: 'Notify on every file upload attempt including failed ones' },
    { key: 'notify_weekly_report', label: 'Weekly summary report', desc: 'Weekly overview of uploads, deadlines, and Xero sync status', tag: 'V3' },
  ];

  if (loading) {
    return (
      <div className="max-w-2xl">
        <div className="skeleton h-64 rounded-xl w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
          <CardDescription>Choose which events trigger email alerts to your inbox.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  {item.label}
                  {item.tag && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.tag}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggle(item.key)}
                className="shrink-0"
                aria-label={`Toggle ${item.label}`}
              >
                {prefs[item.key] ? (
                  <ToggleRight className="h-6 w-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving} className="shrink-0">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GlobalDefaultsSettings({ firm }: { firm: Firm | null }) {
  const [reminderDays, setReminderDays] = useState<number[]>(firm?.default_reminder_days || [30, 14, 7, 1]);
  const [autoReminders, setAutoReminders] = useState(firm?.auto_reminders_enabled ?? true);
  const [replyToEmail, setReplyToEmail] = useState(firm?.reply_to_email || '');
  const [language, setLanguage] = useState(firm?.default_client_language || 'en');
  const [timezone, setTimezone] = useState(firm?.timezone || 'Europe/London');

  const toggleReminderDay = (day: number) => {
    if (reminderDays.includes(day)) {
      if (reminderDays.length > 1) {
        setReminderDays(reminderDays.filter(d => d !== day));
      }
    } else {
      setReminderDays([...reminderDays, day].sort((a, b) => b - a));
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings/defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_reminder_days: reminderDays,
          auto_reminders_enabled: autoReminders,
          reply_to_email: replyToEmail,
          default_client_language: language,
          timezone: timezone,
        }),
      });
      if (response.ok) {
        toast.success('Global defaults saved');
      } else {
        toast.error('Failed to save defaults');
      }
    } catch {
      toast.error('Failed to save defaults');
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Reminder Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Auto-send reminders at (days before deadline)</Label>
            <div className="flex gap-2 flex-wrap">
              {[30, 14, 7, 1].map((d) => (
                <button
                  key={d}
                  onClick={() => toggleReminderDay(d)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    reminderDays.includes(d)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <CheckCircle2 className={`h-3.5 w-3.5 ${reminderDays.includes(d) ? 'text-emerald-600' : 'text-gray-300'}`} />
                  <span className={`text-xs font-semibold ${reminderDays.includes(d) ? 'text-emerald-700' : 'text-gray-500'}`}>{d} days</span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="replyTo">Reply-To Email Address</Label>
            <Input
              id="replyTo"
              type="email"
              value={replyToEmail}
              onChange={(e) => setReplyToEmail(e.target.value)}
              placeholder="auto@yourfirm.co.uk"
            />
            <p className="text-[10px] text-muted-foreground">Clients who reply to reminder emails will reach this address.</p>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Auto reminders</p>
              <p className="text-xs text-muted-foreground">Automatically send reminders before deadlines</p>
            </div>
            <button onClick={() => setAutoReminders(!autoReminders)}>
              {autoReminders
                ? <ToggleRight size={22} style={{ color: '#059669' }} />
                : <ToggleLeft size={22} className="text-gray-300" />
              }
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Language</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                language === 'en' ? 'border-emerald-500 bg-emerald-50' : 'border-border bg-background hover:border-muted-foreground/50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-lg">🇬🇧</div>
              <div>
                <p className="text-sm font-semibold">English</p>
                <p className="text-xs text-muted-foreground">Default</p>
              </div>
              {language === 'en' && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />}
            </button>
            <button
              onClick={() => setLanguage('zh')}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                language === 'zh' ? 'border-emerald-500 bg-emerald-50' : 'border-border bg-background hover:border-muted-foreground/50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-lg">🇨🇳</div>
              <div>
                <p className="text-sm font-semibold">简体中文</p>
                <p className="text-xs text-muted-foreground">Chinese</p>
              </div>
              {language === 'zh' && <CheckCircle2 className="h-4 w-4 text-emerald-600 ml-auto" />}
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>System Timezone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Used for calculating deadlines and sorting chronologically across the system.
          </p>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {COMMON_TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>
                  {tz.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Auto-convert HEIC to JPG</p>
              <p className="text-xs text-muted-foreground">iPhone photos uploaded as HEIC will be automatically converted</p>
            </div>
            <ToggleRight className="h-6 w-6 text-emerald-600" />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium">Duplicate file detection</p>
              <p className="text-xs text-muted-foreground">Warn if the same file (by hash) has already been uploaded</p>
            </div>
            <ToggleRight className="h-6 w-6 text-emerald-600" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="shrink-0">Save All Defaults</Button>
    </div>
  );
}
