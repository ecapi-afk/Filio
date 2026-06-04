'use client';

import { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  RefreshCw,
  XCircle,
  AlertCircle,
  Loader2,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/utils';

interface Firm {
  id: string;
  name: string;
  brand_color: string;
  xero_connection_status: string;
  xero_org_name: string | null;
  xero_last_sync_at: string | null;
  xero_upload_mode?: string;
  xero_refresh_token_expires_at?: string | null;
}

// Current OAuth scopes requested by Filio
const XERO_SCOPES = [
  { scope: 'openid', desc: 'Basic identity & OpenID Connect', essential: true },
  { scope: 'profile', desc: 'Your Xero profile information', essential: true },
  { scope: 'email', desc: 'Email address for account identification', essential: true },
  { scope: 'accounting.settings.read', desc: 'Read accounting settings', essential: false },
  { scope: 'accounting.contacts', desc: 'Read & write client contacts', essential: true },
  { scope: 'accounting.attachments', desc: 'Upload attachments to contacts', essential: true },
  { scope: 'files', desc: 'Access Xero Files (Inbox upload mode)', essential: false },
  { scope: 'offline_access', desc: 'Maintain access when you close Xero', essential: true },
];

type PermissionStatus = 'granted' | 'missing' | 'untested';

interface ScopeStatus {
  scope: string;
  desc: string;
  essential: boolean;
  status: PermissionStatus;
}

interface XeroSettingsClientProps {
  firm: Firm | null;
}

export function XeroSettingsClient({ firm: initialFirm }: XeroSettingsClientProps) {
  const [firm, setFirm] = useState<Firm | null>(initialFirm);
  // Compute connected dynamically from firm state (not as separate state that only initializes once)
  const connected = firm?.xero_connection_status === 'connected';
  const [apiMode, setApiMode] = useState<'attachments' | 'files'>(
    (firm?.xero_upload_mode as 'attachments' | 'files') || 'attachments'
  );
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testingPermissions, setTestingPermissions] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [scopeStatuses, setScopeStatuses] = useState<ScopeStatus[]>(
    XERO_SCOPES.map(s => ({ ...s, status: 'untested' as PermissionStatus }))
  );

  // Sync firm state when initialFirm changes (e.g., after page reload)
  useEffect(() => {
    setFirm(initialFirm);
  }, [initialFirm]);

  useEffect(() => {
    if (firm?.xero_upload_mode) {
      setApiMode(firm.xero_upload_mode as 'attachments' | 'files');
    }
    // Initialize scope statuses (untested until we check)
    setScopeStatuses(XERO_SCOPES.map(s => ({ ...s, status: 'untested' as PermissionStatus })));
  }, [firm?.xero_upload_mode]);

  const testPermissions = async () => {
    setTestingPermissions(true);
    const newStatuses: ScopeStatus[] = [];

    for (const s of XERO_SCOPES) {
      try {
        // Test based on what each scope enables
        if (s.scope === 'accounting.contacts') {
          const res = await fetch('/api/xero/contacts');
          if (res.ok) {
            newStatuses.push({ ...s, status: 'granted' });
          } else {
            const err = await res.json();
            if (err.error?.includes('scope') || err.error?.includes('permission')) {
              newStatuses.push({ ...s, status: 'missing' });
            } else {
              newStatuses.push({ ...s, status: 'granted' }); // Other errors like no contacts is fine
            }
          }
        } else if (s.scope === 'accounting.attachments') {
          // Can't easily test attachment upload without actual file
          // Just mark as granted if connected (trust the auth)
          newStatuses.push({ ...s, status: connected ? 'granted' : 'missing' });
        } else if (s.scope === 'files') {
          // Test Files API access
          const res = await fetch('/api/xero/test-files');
          if (res.ok) {
            newStatuses.push({ ...s, status: 'granted' });
          } else {
            newStatuses.push({ ...s, status: 'missing' });
          }
        } else if (s.scope === 'accounting.settings.read') {
          // Xero doesn't have a general /Settings endpoint - the scope exists
          // but there's no simple HTTP endpoint to test it against.
          // Mark as granted if connected (trust the OAuth grant).
          newStatuses.push({ ...s, status: connected ? 'granted' : 'missing' });
        } else {
          // For essential identity scopes, if connected = granted
          newStatuses.push({ ...s, status: connected ? 'granted' : 'missing' });
        }
      } catch {
        newStatuses.push({ ...s, status: 'missing' });
      }
    }

    setScopeStatuses(newStatuses);
    setTestingPermissions(false);
  };

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
      console.error('Connect error:', error);
      toast.error('Failed to connect to Xero');
    }
  };

  useEffect(() => {
    const handleSyncStart = () => setSyncing(true)
    const handleSyncComplete = (e: any) => {
      setSyncing(false)
      if (e.detail?.lastSync) {
        setFirm(prev => prev ? {
          ...prev,
          xero_org_name: e.detail.organization || prev.xero_org_name,
          xero_last_sync_at: e.detail.lastSync,
        } : prev)
      }
    }

    window.addEventListener('xero-sync-started', handleSyncStart)
    window.addEventListener('xero-sync-completed', handleSyncComplete)
    
    return () => {
      window.removeEventListener('xero-sync-started', handleSyncStart)
      window.removeEventListener('xero-sync-completed', handleSyncComplete)
    }
  }, [])

  const handleSync = async () => {
    if (syncing) return; // Prevent double-click
    window.dispatchEvent(new CustomEvent('xero-sync-started'))
    try {
      const response = await fetch('/api/xero/sync', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Sync completed: ${data.sync?.added || 0} added, ${data.sync?.updated || 0} updated`);
        window.dispatchEvent(new CustomEvent('xero-sync-completed', { 
          detail: { 
            lastSync: new Date().toISOString(), 
            organization: data.organization 
          } 
        }))
      } else {
        toast.error(`Sync failed: ${data.error || 'Unknown error'}`);
        window.dispatchEvent(new CustomEvent('xero-sync-completed'))
      }
    } catch (error) {
      toast.error('Sync failed');
      window.dispatchEvent(new CustomEvent('xero-sync-completed'))
    }
  };

  const handleSaveApiMode = async () => {
    if (!firm?.id) return;
    setSaving(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.from('firms').update({ xero_upload_mode: apiMode }).eq('id', firm.id);
      if (error) throw error;
      toast.success(`Upload mode saved as ${apiMode}`);
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    setShowDisconnectDialog(true);
  };

  const confirmDisconnect = async () => {
    setShowDisconnectDialog(false);
    try {
      const response = await fetch('/api/xero/disconnect', { method: 'POST' });
      if (response.ok) {
        toast.success('Disconnected from Xero');
        // Update local state to reflect disconnection
        setFirm(prev => prev ? {
          ...prev,
          xero_connection_status: 'disconnected',
          xero_org_name: null,
          xero_last_sync_at: null,
        } : prev);
      } else {
        toast.error('Failed to disconnect');
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    }
  };

  // formatRelativeTime explicitly replaces formatLastSync

  const getStatusIcon = (status: PermissionStatus) => {
    switch (status) {
      case 'granted':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
      case 'missing':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'untested':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const missingEssential = scopeStatuses.filter(s => s.essential && s.status === 'missing').length;
  const hasTested = scopeStatuses.some(s => s.status !== 'untested');

  return (
    <div className="space-y-6">
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
          </CardHeader>
          <CardContent className="space-y-4">
            {connected && firm && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Organisation</p>
                  <p className="text-sm font-semibold">{firm.xero_org_name || 'Not synced yet'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Sync</p>
                  <p className="text-sm font-semibold">{formatRelativeTime(firm.xero_last_sync_at)}</p>
                </div>
                {firm.xero_refresh_token_expires_at && (() => {
                  const expiresAt = new Date(firm.xero_refresh_token_expires_at!)
                  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)
                  const isExpiringSoon = daysLeft <= 14
                  const isExpired = daysLeft <= 0
                  return (
                    <div className={`col-span-2 rounded-lg p-3 ${isExpired ? 'bg-red-50' : isExpiringSoon ? 'bg-amber-50' : 'bg-muted/50'}`}>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Token Expiry</p>
                      <p className={`text-sm font-semibold ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : ''}`}>
                        {isExpired
                          ? 'Expired — reconnect Xero'
                          : isExpiringSoon
                          ? `Expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'} — reconnect soon`
                          : `Valid for ${daysLeft} days (${expiresAt.toLocaleDateString('en-GB')})`
                        }
                      </p>
                    </div>
                  )
                })()}
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
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">POST /Contacts/{'{id}'}/Attachments</p>
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
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">POST /files.xro/1.0/Files</p>
              </button>
            </div>
            <Button onClick={handleSaveApiMode} disabled={saving}>
              {saving ? 'Saving...' : 'Save Mode'}
            </Button>
          </CardContent>
        </Card>

        {/* OAuth Scopes - Dynamic */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  OAuth Permissions
                </CardTitle>
                <CardDescription>Permissions granted to Filio for Xero access</CardDescription>
              </div>
              {connected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={testPermissions}
                  disabled={testingPermissions}
                >
                  {testingPermissions ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-2" />
                      Test Permissions
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {hasTested && missingEssential > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-red-800">Missing Required Permissions</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    Some essential permissions are missing. Please reconnect your Xero account to grant all permissions.
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              {scopeStatuses.map((s, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  {getStatusIcon(s.status)}
                  <div className="flex-1">
                    <p className="text-xs font-mono font-semibold">{s.scope}</p>
                    <p className="text-[10px] text-muted-foreground">{s.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.essential && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">
                        Required
                      </span>
                    )}
                    {s.status === 'granted' && (
                      <span className="text-[10px] font-semibold text-emerald-600">Granted</span>
                    )}
                    {s.status === 'missing' && (
                      <span className="text-[10px] font-semibold text-red-600">Missing</span>
                    )}
                    {s.status === 'untested' && (
                      <span className="text-[10px] font-semibold text-muted-foreground">Untested</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {!connected && (
              <p className="text-xs text-muted-foreground mt-3">
                Connect to Xero to enable permission testing. You&apos;ll be asked to grant these permissions during OAuth.
              </p>
            )}
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs font-semibold mb-1">How to update permissions:</p>
              <p className="text-[10px] text-muted-foreground">
                1. Click &quot;Disconnect Xero&quot; above
              </p>
              <p className="text-[10px] text-muted-foreground">
                2. Click &quot;Connect with Xero&quot; to re-authorize with all required scopes
              </p>
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
}
