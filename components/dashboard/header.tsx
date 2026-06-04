"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Plus, Zap, CheckCheck, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { LanguageSwitcher } from "@/components/language-switcher"
import { cn } from "@/lib/utils"

interface DashboardHeaderProps {
  isXeroConnected?: boolean
}

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read_at: string | null
  created_at: string
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your firm' },
  '/dashboard/clients': { title: 'Clients', subtitle: 'Manage your client documents' },
  '/dashboard/clients/new': { title: 'Add Client', subtitle: 'Import from Xero or add manually' },
  '/dashboard/clients/activity': { title: 'Activity', subtitle: 'Recent client activity' },
  '/dashboard/uploads': { title: 'Uploads', subtitle: 'All uploaded documents' },
  '/dashboard/reminders': { title: 'Reminders', subtitle: 'Upcoming deadlines and notifications' },
  '/dashboard/help': { title: 'Help Centre', subtitle: 'FAQs and support' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Manage your firm settings' },
  '/dashboard/settings/xero': { title: 'Xero Connection', subtitle: 'Manage your Xero integration' },
  '/dashboard/settings/profile': { title: 'Profile', subtitle: 'Your account settings' },
  '/dashboard/settings/notifications': { title: 'Notifications', subtitle: 'Email and push notification preferences' },
  '/dashboard/settings/branding': { title: 'Branding', subtitle: 'Customize your firm branding' },
  '/dashboard/settings/team': { title: 'Team Members', subtitle: 'Manage your team access' },
  '/dashboard/settings/billing': { title: 'Billing', subtitle: 'Subscription and payment details' },
  '/dashboard/settings/defaults': { title: 'Global Defaults', subtitle: 'Default settings for new clients' },
}

const TYPE_DOT: Record<string, string> = {
  upload_received: 'bg-green-500',
  download_ready: 'bg-blue-500',
  overdue: 'bg-red-500',
  reminder_sent: 'bg-amber-500',
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function DashboardHeader({ isXeroConnected = false }: DashboardHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [xeroConnected, setXeroConnected] = useState(false)
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    setXeroConnected(isXeroConnected)
  }, [isXeroConnected])

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/count')
      const data = await res.json()
      setUnreadCount(data.count ?? 0)
    } catch {}
  }, [])

  // Poll unread count every 60s
  useEffect(() => {
    fetchCount()
    const timer = setInterval(fetchCount, 60000)
    return () => clearInterval(timer)
  }, [fetchCount])

  const handleOpen = async (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) return
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(data.data ?? [])
    } catch {}
  }

  const handleMarkOne = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))
  }

  const handleMarkAll = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      setUnreadCount(0)
    } finally {
      setMarkingAll(false)
    }
  }

  const getPageInfo = () => {
    if (pageTitles[pathname]) return pageTitles[pathname]
    for (const [path, info] of Object.entries(pageTitles)) {
      if (path !== '/dashboard' && pathname.startsWith(path)) return info
    }
    return { title: 'Dashboard', subtitle: 'Overview of your firm' }
  }

  const pageInfo = getPageInfo()
  const showActionButtons = pathname === '/dashboard' || pathname === '/dashboard/clients'

  return (
    <header
      className="flex items-center justify-between px-4 lg:px-7 py-4 bg-white border-b border-gray-100 shrink-0"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-mobile-sidebar'))}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
        <h1 className="text-xl font-bold text-gray-900">{pageInfo.title}</h1>
          {pageInfo.subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{pageInfo.subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        {showActionButtons && (
          <>
            {xeroConnected && (
              <button onClick={() => router.push('/dashboard/clients/new?mode=xero')} className="btn-secondary hidden sm:inline-flex">
                <Zap size={15} style={{ color: '#13B5EA' }} />
                <span className="hidden md:inline">Sync Xero Contacts</span>
              </button>
            )}
            <Link href="/dashboard/clients/new" className="btn-primary">
              <Plus size={15} />
              <span className="hidden sm:inline">Add Client</span>
            </Link>
          </>
        )}

        <span className="hidden sm:block"><LanguageSwitcher /></span>

        {/* Notification Bell */}
        <Popover open={open} onOpenChange={handleOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="font-semibold text-sm">Notifications</h4>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground gap-1"
                  onClick={handleMarkAll}
                  disabled={markingAll}
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    className={cn(
                      "w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors border-b last:border-0",
                      !n.read_at && "bg-blue-50/40"
                    )}
                    onClick={() => !n.read_at && handleMarkOne(n.id)}
                  >
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full mt-1.5 shrink-0",
                        TYPE_DOT[n.type] ?? 'bg-gray-400',
                        n.read_at && 'opacity-30'
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", n.read_at && "text-muted-foreground font-normal")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{formatRelative(n.created_at)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
