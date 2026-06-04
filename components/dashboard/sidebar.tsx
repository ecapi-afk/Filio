"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import {
  LayoutDashboard,
  Users,
  Upload,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  BarChart,
  Zap,
  User,
  Building2,
  CreditCard,
  Sliders,
  ChevronDown,
  RefreshCw,
  Loader2,
  X,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

const mainNav = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/dashboard/clients", labelKey: "nav.clients", icon: Users },
  { href: "/dashboard/clients/activity", labelKey: "nav.activity", icon: BarChart },
  { href: "/dashboard/uploads", labelKey: "nav.uploads", icon: Upload },
  { href: "/dashboard/reminders", labelKey: "nav.reminders", icon: Bell },
  { href: "/dashboard/help", labelKey: "nav.help", icon: HelpCircle },
]

const settingsNav = [
  { href: "/dashboard/settings?section=xero", labelKey: "settings.xero", icon: Zap },
  { href: "/dashboard/settings?section=profile", labelKey: "settings.profile", icon: User },
  { href: "/dashboard/settings?section=notifications", labelKey: "settings.notifications", icon: Bell },
  { href: "/dashboard/settings?section=branding", labelKey: "settings.branding", icon: Building2 },
  { href: "/dashboard/settings?section=team", labelKey: "settings.team", icon: Users },
  { href: "/dashboard/settings?section=billing", labelKey: "settings.billing", icon: CreditCard },
  { href: "/dashboard/settings?section=defaults", labelKey: "settings.defaults", icon: Sliders },
]

// Format ISO timestamp to relative time like "2h ago" or absolute date
import { formatRelativeTime } from '@/lib/utils'

export function DashboardSidebar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { t } = useI18n()
  const [userName, setUserName] = useState('')
  const [firmName, setFirmName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [xeroPopover, setXeroPopover] = useState(false)
  const [xeroStatus, setXeroStatus] = useState<'connected' | 'disconnected'>('disconnected')
  const [xeroLastSync, setXeroLastSync] = useState<string | null>(null)
  const [xeroOrgName, setXeroOrgName] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setMobileOpen(v => !v)
    window.addEventListener('toggle-mobile-sidebar', handler)
    return () => window.removeEventListener('toggle-mobile-sidebar', handler)
  }, [])

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  useEffect(() => {
    setMounted(true)
    // Check if settings sub-nav should be open
    setSettingsOpen(pathname.startsWith('/dashboard/settings'))

    async function fetchProfile() {
      try {
        const response = await fetch('/api/profile')
        if (response.ok) {
          const data = await response.json()
          setUserName(data.full_name || '')
          setFirmName(data.firm_name || '')
          setXeroStatus(data.xero_connected ? 'connected' : 'disconnected')
          setXeroLastSync(data.xero_last_sync_at)
          setXeroOrgName(data.xero_org_name || null)
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      console.error('Logout error:', err)
      setIsLoggingOut(false)
    }
  }

  useEffect(() => {
    const handleSyncStart = () => setSyncing(true)
    const handleSyncComplete = (e: any) => {
      setSyncing(false)
      if (e.detail?.lastSync) setXeroLastSync(e.detail.lastSync)
    }

    window.addEventListener('xero-sync-started', handleSyncStart)
    window.addEventListener('xero-sync-completed', handleSyncComplete)
    
    return () => {
      window.removeEventListener('xero-sync-started', handleSyncStart)
      window.removeEventListener('xero-sync-completed', handleSyncComplete)
    }
  }, [])

  const handleXeroSync = async () => {
    if (xeroStatus === 'disconnected') {
      toast.info('Connecting to Xero...')
      try {
        const response = await fetch('/api/xero/auth-url')
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          toast.error('Failed to get Xero authorization URL')
        }
      } catch (err) {
        toast.error('Failed to connect to Xero')
      }
    } else {
      if (syncing) return
      window.dispatchEvent(new CustomEvent('xero-sync-started'))
      try {
        // 1. Sync Xero contacts
        const response = await fetch('/api/xero/sync', { method: 'POST' })
        const data = await response.json()
        if (!response.ok) {
          toast.error(`Sync failed: ${data.error || 'Unknown error'}`)
          window.dispatchEvent(new CustomEvent('xero-sync-completed'))
          return
        }

        // 2. Process any pending file upload jobs for this firm
        const jobsRes = await fetch('/api/uploads/process-pending', { method: 'POST' })
        const jobsData = await jobsRes.json()

        const contactMsg = `${data.sync?.added || 0} contacts added, ${data.sync?.updated || 0} updated`
        const filesMsg = jobsData.processed > 0
          ? ` · ${jobsData.processed} file${jobsData.processed > 1 ? 's' : ''} synced to Xero`
          : jobsData.message === 'No pending jobs' ? '' : ''

        toast.success(`Sync completed: ${contactMsg}${filesMsg}`)
        window.dispatchEvent(new CustomEvent('xero-sync-completed', { detail: { lastSync: new Date().toISOString() } }))
        // Refresh server data so Xero status updates are visible immediately
        router.refresh()
      } catch (err) {
        toast.error('Sync failed')
        window.dispatchEvent(new CustomEvent('xero-sync-completed'))
      } finally {
        setXeroPopover(false)
      }
    }
    setXeroPopover(false)
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
    // Handle query string paths like /dashboard/settings?section=xero
    if (href.includes('?')) {
      const [pathWithoutQuery, query] = href.split('?')
      const urlSearchParams = new URLSearchParams(query)
      const sectionParam = urlSearchParams.get('section')
      if (pathWithoutQuery === '/dashboard/settings') {
        const currentSection = searchParams.get('section')
        return pathname === '/dashboard/settings' && currentSection === sectionParam
      }
    }
    // Exact match for non-settings paths, or match with trailing slash
    if (pathname === href || pathname === href + '/') return true
    // But /dashboard/clients should NOT match /dashboard/clients/activity
    if (href === '/dashboard/clients' && pathname.startsWith('/dashboard/clients/')) return false
    return pathname.startsWith(href)
  }

  // Get initials from user name
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  // Don't render loading state during SSR to avoid hydration mismatch
  const displayName = mounted ? (isLoading ? '' : (userName || 'User')) : ''
  const displayFirm = mounted ? (isLoading ? '' : (firmName || 'No firm')) : ''

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    <aside className={cn(
      "sidebar-light fixed left-0 top-0 z-40 flex h-screen w-60 flex-col transition-transform duration-200",
      "lg:translate-x-0",
      mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-100">
        <div
          className="sidebar-logo-icon w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
          style={{ background: '#059669' }}
        >
          F
        </div>
        <span className="sidebar-logo-text font-semibold text-lg tracking-tight text-gray-900">
          Filio
        </span>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 space-y-0.5 mt-2">
        <p className="sidebar-section-label px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          Main
        </p>
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "sidebar-nav-item",
              isActive(item.href) ? "active" : ""
            )}
          >
            <item.icon size={18} />
            <span className="flex-1">{t(item.labelKey)}</span>
          </Link>
        ))}

        <div className="sidebar-divider h-px my-3 bg-gray-100" />

        {/* Settings Group */}
        <button
          className={cn(
            "sidebar-nav-item w-full",
            settingsOpen ? "active" : ""
          )}
          onClick={() => setSettingsOpen(!settingsOpen)}
        >
          <Settings size={18} />
          <span className="flex-1 text-left">Settings</span>
          <ChevronDown
            size={14}
            className="transition-transform duration-200"
            style={{ transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </button>

        {settingsOpen && (
          <div className="sidebar-settings-group ml-3 space-y-0.5 border-l border-gray-200 pl-3">
            {settingsNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "sidebar-nav-item text-xs py-2",
                  isActive(item.href) ? "active" : ""
                )}
              >
                <item.icon size={16} />
                <span className="flex-1">{t(item.labelKey)}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Bottom: Xero Status + User */}
      <div className="px-3 pb-4 space-y-2">
        {/* Xero Status Indicator */}
        <div className="relative">
          <div
            onClick={() => setXeroPopover(!xeroPopover)}
            className="sidebar-xero-btn w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 bg-gray-50 border border-gray-200 cursor-pointer"
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                background: xeroStatus === 'connected' ? '#34D399' : '#EF4444',
                boxShadow: xeroStatus === 'connected' ? '0 0 6px #34D399' : '0 0 6px #EF4444'
              }}
            />
            <div className="flex-1 text-left min-w-0">
              <p className="sidebar-xero-title text-xs font-medium text-gray-900 truncate">
                {xeroStatus === 'connected' ? 'Xero Connected' : 'Xero Disconnected'}
              </p>
              <p className="sidebar-xero-sub text-[10px] text-gray-500">
                Synced {formatRelativeTime(xeroLastSync)}
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleXeroSync(); }}
              className="sidebar-xero-icon text-gray-400 hover:text-gray-600 transition-colors"
              disabled={syncing}
            >
              {syncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} className="transition-transform group-hover:rotate-180" />}
            </button>
          </div>

          {/* Xero Popover */}
          {xeroPopover && (
            <div
              className="sidebar-xero-popover absolute bottom-full left-0 mb-2 w-64 rounded-xl p-4 shadow-xl z-50 bg-white border border-gray-200"
              style={{ boxShadow: '0 10px 25px rgba(0,0,0,0.12)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: xeroStatus === 'connected' ? '#34D399' : '#EF4444',
                      boxShadow: xeroStatus === 'connected' ? '0 0 6px #34D399' : '0 0 6px #EF4444'
                    }}
                  />
                  <span className="text-sm font-semibold text-gray-900">
                    {xeroStatus === 'connected' ? 'Xero Connected' : 'Xero Disconnected'}
                  </span>
                </div>
                <button onClick={() => setXeroPopover(false)}>
                  <X className="sidebar-xero-popover-close text-gray-400" size={14} />
                </button>
              </div>
              <div className="space-y-1.5 text-xs mb-3 text-gray-600">
                <p>
                  <span className="sidebar-xero-popover-label text-gray-500">Organisation: </span>
                  <span className="sidebar-xero-popover-value font-medium text-gray-900">
                    {xeroOrgName || 'Not connected'}
                  </span>
                </p>
                <p>
                  <span className="sidebar-xero-popover-label text-gray-500">Last sync: </span>
                  <span className="font-medium text-gray-900">{formatRelativeTime(xeroLastSync)}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleXeroSync}
                  disabled={syncing}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: '#059669' }}
                >
                  {syncing ? (
                    <>
                      <Loader2 size={10} className="inline animate-spin mr-1" />
                      Syncing...
                    </>
                  ) : 'Sync now'}
                </button>
                <Link
                  href="/dashboard/settings/xero"
                  className="sidebar-xero-popover-secondary flex-1 py-1.5 rounded-lg text-xs font-medium text-center transition-all text-gray-700 bg-gray-100 hover:bg-gray-200"
                  onClick={() => setXeroPopover(false)}
                >
                  Settings
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Card */}
        <div
          className="sidebar-user-card flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: '#059669' }}
          >
            {mounted && !isLoading ? initials : '...'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="sidebar-user-name text-xs font-semibold text-gray-900 truncate">
              {displayName || '...'}
            </p>
            <p className="sidebar-user-plan text-[10px] text-gray-500 truncate">
              {displayFirm || '...'}
            </p>
          </div>
          <button
            className="sidebar-user-logout text-gray-400 hover:text-gray-600"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
    </>
  )
}
