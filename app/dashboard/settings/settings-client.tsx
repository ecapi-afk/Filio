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
  reply_to_email: string | null;
  default_reminder_days: number[] | null;
  auto_reminders_enabled: boolean;
  default_client_language: string | null;
  timezone: string | null;
}

interface SettingsClientProps {
  firm: Firm | null;
  subscription?: { plan: string; client_limit: number; status: string };
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
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    firmName: firm?.name || '',
  });

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl bg-emerald-600">
              {profile.firstName[0]}{profile.lastName[0]}
            </div>
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" /> Change Photo
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="firmName">Firm Name</Label>
              <Input
                id="firmName"
                value={profile.firmName}
                onChange={(e) => setProfile({ ...profile, firmName: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground">Max 100 characters. Allowed: letters, numbers, spaces, & ' - .</p>
            </div>
          </div>
          <Button onClick={() => toast.success('Profile updated')} className="shrink-0">Save Changes</Button>
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
            <Input id="newPwd" type="password" />
            <p className="text-[10px] text-muted-foreground">Min 8 characters · 1 uppercase · 1 lowercase · 1 number</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPwd">Confirm New Password</Label>
            <Input id="confirmPwd" type="password" />
          </div>
          <Button onClick={() => toast.success('Password changed')} className="shrink-0">Update Password</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSettings({ subscription, clientCount = 0 }: { subscription?: any; clientCount?: number }) {
  const currentPlan = (subscription?.plan || 'Professional').toLowerCase();
  const capitalizedPlan = currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1);
  const isTrial = currentPlan === 'trial';
  
  // Use real limit if available, fallback to plan defaults
  let limit = subscription?.client_limit || 100;
  if (currentPlan === 'firm') limit = 9999;
  
  const percentage = Math.min(100, Math.round((clientCount / limit) * 100)) || 0;

  const plans = [
    { 
      name: 'Starter', 
      price: '£29', 
      clients: 20, 
      features: ['Client Portal', 'Xero Direct Sync', 'Automated Email Reminders'] 
    },
    { 
      name: 'Professional', 
      price: '£69', 
      clients: 100, 
      features: ['All Starter features', 'Magic Email (Pro)', 'Document Checklist (Pro)', 'Client Activity (Pro)', 'Brand Customization (Pro)'] 
    },
    { 
      name: 'Firm', 
      price: '£149', 
      clients: 'Unlimited', 
      features: ['All Professional features', 'Custom Domain (未来上线)', 'Team Members (未来上线)', 'API Access (未来上线)'] 
    },
  ];

  return (
    <div className="max-w-3xl space-y-5">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700">
              {isTrial ? 'Trial (Pro Features)' : capitalizedPlan} · {subscription?.status === 'canceled' ? 'Canceled' : 'Active'}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Clients Used</p>
              <p className="text-xl font-bold tabular-nums">
                {clientCount} / {currentPlan === 'firm' ? '∞' : limit}
              </p>
              {currentPlan !== 'firm' && (
                <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-600 transition-all duration-500" style={{ width: `${percentage}%` }} />
                </div>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Next Billing</p>
              <p className="text-xl font-bold">{isTrial ? 'Trial End' : '01 May 2026'}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Cost</p>
              <p className="text-xl font-bold tabular-nums">
                {isTrial ? '£0.00' : (currentPlan === 'starter' ? '£29.00' : currentPlan === 'firm' ? '£149.00' : '£69.00')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        {plans.map((p) => {
          const isCurrent = p.name.toLowerCase() === currentPlan || (isTrial && p.name === 'Professional');
          return (
          <Card key={p.name} className={isCurrent ? 'ring-2 ring-emerald-500' : ''}>
            <CardHeader>
              {isCurrent && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-2">Current Plan</span>
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
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {f}
                  </div>
                ))}
              </div>
              {!isCurrent && (
                <Button variant={p.name === 'Starter' ? 'outline' : 'default'} className="w-full" size="sm">
                  {currentPlan === 'firm' || (currentPlan === 'professional' && p.name === 'Starter') ? 'Downgrade' : 'Upgrade'}
                </Button>
              )}
            </CardContent>
          </Card>
        )})}
      </div>
    </div>
  );
}

function BrandingSettings({ firm, plan = 'Professional' }: { firm: Firm | null; plan?: string }) {
  const [brandColor, setBrandColor] = useState(firm?.brand_color || '#064E3B');
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Welcome! Please upload your documents using the button below. If you have any questions, don\'t hesitate to contact us.'
  );

  const isStarter = plan.toLowerCase() === 'starter';
  const isFirm = plan.toLowerCase() === 'firm';

  if (isStarter) {
    return (
      <div className="max-w-2xl text-center py-16 bg-white rounded-xl border border-dashed border-border flex flex-col items-center justify-center h-64">
        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
          <Building2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">Available on Professional</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Upgrade your plan to customize the portal with your firm's brand colors and custom welcome message.</p>
        <Button>Upgrade to Professional</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Firm Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Firm Logo</Label>
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-6 text-center hover:border-emerald-300 transition-all cursor-pointer">
              <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drop logo here or <span className="text-emerald-600">browse</span></p>
              <p className="text-xs text-muted-foreground mt-1">PNG or SVG · Max 2MB · Recommended 200×60px</p>
            </div>
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
                className="font-mono"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="welcomeMsg">Portal Welcome Message</Label>
            <textarea
              id="welcomeMsg"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              rows={3}
              className="w-full text-sm px-3 py-2 rounded-lg border border-input focus:outline-none focus:border-emerald-400 transition-all resize-none"
            />
            <p className="text-[10px] text-muted-foreground">Supports HTML rich text · Max 500 characters</p>
          </div>
          <Button onClick={() => toast.success('Branding saved')} className="shrink-0">Save Branding</Button>
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
  );
}

function NotificationsSettings() {
  const [settings, setSettings] = useState({
    newUpload: true,
    syncFailed: true,
    tokenExpiry: true,
    weeklyDigest: false,
    trialReminder: true,
  });

  const toggle = (key: keyof typeof settings) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const items = [
    { key: 'newUpload' as const, label: 'New file uploaded', desc: 'Notify when a client uploads a file via Portal or Magic Email' },
    { key: 'syncFailed' as const, label: 'Xero sync failed', desc: 'Alert when a file fails to sync to Xero' },
    { key: 'tokenExpiry' as const, label: 'Upload link expiring', desc: 'Warn when a client upload link is about to expire' },
    { key: 'weeklyDigest' as const, label: 'Weekly digest', desc: 'Summary of all activity from the past week' },
    { key: 'trialReminder' as const, label: 'Trial & billing alerts', desc: 'Reminders about trial expiry and billing events' },
  ];

  return (
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <button onClick={() => toggle(item.key)}>
                {settings[item.key] ? (
                  <ToggleRight className="h-6 w-6 text-emerald-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
            </div>
          ))}
          <Button onClick={() => toast.success('Notification preferences saved')} className="shrink-0">Save Preferences</Button>
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
