"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Bell, Plus, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { LanguageSwitcher } from "@/components/language-switcher"
import { toast } from "sonner"

interface DashboardHeaderProps {
  isXeroConnected?: boolean
}

// Page title map based on pathname
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

export function DashboardHeader({ isXeroConnected = false }: DashboardHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [xeroConnected, setXeroConnected] = useState(false)

  useEffect(() => {
    setXeroConnected(isXeroConnected)
  }, [isXeroConnected])

  const handleImportXero = () => {
    router.push('/dashboard/clients/new?mode=xero')
  }

  // Get page info from pathname
  const getPageInfo = () => {
    // Check exact match first
    if (pageTitles[pathname]) {
      return pageTitles[pathname]
    }
    // Check partial matches for sub-routes
    for (const [path, info] of Object.entries(pageTitles)) {
      if (path !== '/dashboard' && pathname.startsWith(path)) {
        return info
      }
    }
    return { title: 'Dashboard', subtitle: 'Overview of your firm' }
  }

  const pageInfo = getPageInfo()
  const showActionButtons = pathname === '/dashboard' || pathname === '/dashboard/clients'

  return (
    <header
      className="flex items-center justify-between px-7 py-4 bg-white border-b border-gray-100 shrink-0"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
    >
      {/* Page Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">{pageInfo.title}</h1>
        {pageInfo.subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{pageInfo.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Action Buttons - show on Dashboard and Clients pages */}
        {showActionButtons && (
          <>
            {xeroConnected && (
              <button
                onClick={handleImportXero}
                className="btn-secondary"
              >
                <Zap size={15} style={{ color: '#13B5EA' }} />
                Sync Xero Contacts
              </button>
            )}
            <Link href="/dashboard/clients/new" className="btn-primary">
              <Plus size={15} />
              Add Client
            </Link>
          </>
        )}

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
                3
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Notifications</h4>
              <div className="space-y-3">
                <div className="flex gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">3 clients overdue</p>
                    <p className="text-gray-500 text-xs">Please send reminders</p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">5 clients due soon</p>
                    <p className="text-gray-500 text-xs">Within next 7 days</p>
                  </div>
                </div>
                <div className="flex gap-3 text-sm">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="font-medium">New files uploaded</p>
                    <p className="text-gray-500 text-xs">Sarah Johnson uploaded 2 files</p>
                  </div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
