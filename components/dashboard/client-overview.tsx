"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Send, Search, Star, Loader2, Users, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useI18n } from "@/lib/i18n/context"
import { getClientAvatarBg } from "@/lib/file-types"

type Client = {
  id: string
  client_number?: number
  name: string
  email: string
  health_status: string
  management_status: string
  next_deadline?: {
    type: string
    date: string
  }
  upload_progress?: {
    uploaded: number
    required: number
  }
  last_upload: string | null
  is_starred: boolean
}

export function ClientOverview() {
  const { t, locale } = useI18n()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeFilter, setActiveFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchClients() {
      try {
        const response = await fetch('/api/clients?management_status=active')
        if (response.ok) {
          const { data } = await response.json()
          // Sort by priority: Overdue > Due Soon > others
          const sorted = (data || []).sort((a: Client, b: Client) => {
            const priority: Record<string, number> = {
              'Overdue': 1,
              'Due Soon': 2,
              'Not Started': 3,
              'In Progress': 4,
              'Complete': 5,
              'No Action': 6,
            }
            return (priority[a.health_status] || 99) - (priority[b.health_status] || 99)
          })
          setClients(sorted)
        }
      } catch (error) {
        console.error('Failed to fetch clients:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchClients()
  }, [])

  const filteredClients = clients.filter(client => {
    if (activeFilter !== 'all') {
      const filterMap: Record<string, string> = {
        'overdue': 'Overdue',
        'due_soon': 'Due Soon',
        'starred': 'starred',
      }
      if (activeFilter === 'starred') {
        if (!client.is_starred) return false
      } else if (client.health_status !== filterMap[activeFilter]) {
        return false
      }
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return client.name.toLowerCase().includes(query) ||
             client.email?.toLowerCase().includes(query)
    }
    return true
  })

  const overdueCount = clients.filter(c => c.health_status === 'Overdue').length
  const dueSoonCount = clients.filter(c => c.health_status === 'Due Soon').length
  const starredCount = clients.filter(c => c.is_starred).length

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      'Overdue': 'bg-red-50 text-red-700 border-red-200',
      'Due Soon': 'bg-amber-50 text-amber-700 border-amber-200',
      'Not Started': 'bg-blue-50 text-blue-700 border-blue-200',
      'In Progress': 'bg-yellow-50 text-yellow-700 border-yellow-200',
      'Complete': 'bg-emerald-50 text-emerald-700 border-emerald-200',
      'No Action': 'bg-gray-50 text-gray-600 border-gray-200',
    }
    const labels: Record<string, string> = {
      'Overdue': locale === 'en' ? 'Overdue' : '已逾期',
      'Due Soon': locale === 'en' ? 'Due Soon' : '即将到期',
      'Not Started': locale === 'en' ? 'Not Started' : '未开始',
      'In Progress': locale === 'en' ? 'In Progress' : '进行中',
      'Complete': locale === 'en' ? 'Complete' : '已完成',
      'No Action': locale === 'en' ? 'No Action' : '无需操作',
    }

    const statusDot: Record<string, string> = {
      'Overdue': '🔴',
      'Due Soon': '🟠',
      'Not Started': '🔵',
      'In Progress': '🟡',
      'Complete': '🟢',
      'No Action': '⚪',
    }

    return (
      <Badge variant="outline" className={cn("text-xs", styles[status])}>
        {statusDot[status]} {labels[status]}
      </Badge>
    )
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return locale === 'en' ? `${Math.abs(diffDays)}d ago` : `${Math.abs(diffDays)} 天前`
    } else if (diffDays === 0) {
      return locale === 'en' ? 'Today' : '今天'
    } else if (diffDays <= 7) {
      return locale === 'en' ? `${diffDays}d` : `${diffDays} 天`
    } else {
      return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  // Format: "Never", "2 hours ago", or "18 Mar 2026"
  function formatRelativeUpload(dateStr: string | undefined | null) {
    if (!dateStr) return locale === 'en' ? 'Never' : '从未'
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return locale === 'en' ? 'Just now' : '刚刚'
    if (diffMins < 60) return locale === 'en' ? `${diffMins} min ago` : `${diffMins} 分钟前`
    if (diffHours < 24) return locale === 'en' ? `${diffHours} hours ago` : `${diffHours} 小时前`
    if (diffDays === 1) return locale === 'en' ? 'Yesterday' : '昨天'
    if (diffDays < 7) return locale === 'en' ? `${diffDays} days ago` : `${diffDays} 天前`
    return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'zh-CN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function getRowBg(status: string) {
    if (status === 'Overdue') return '#FFF8F8'
    if (status === 'Due Soon') return '#FFFDF5'
    return 'white'
  }

  return (
    <Card>
      <CardHeader className="pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold">
            {locale === 'en' ? 'Client Overview' : '客户概览'}
          </CardTitle>
          <Link href="/dashboard/clients" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
            {locale === 'en' ? 'View all clients' : '查看全部客户'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Search and Filters */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={locale === 'en' ? 'Search by name or email...' : '按姓名或邮箱搜索...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeFilter === 'all'
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {locale === 'en' ? 'All' : '全部'} ({clients.length})
            </button>
            <button
              onClick={() => setActiveFilter('overdue')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeFilter === 'overdue'
                  ? "bg-red-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {locale === 'en' ? 'Overdue' : '已逾期'} ({overdueCount})
            </button>
            <button
              onClick={() => setActiveFilter('due_soon')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeFilter === 'due_soon'
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {locale === 'en' ? 'Due Soon' : '即将到期'} ({dueSoonCount})
            </button>
            <button
              onClick={() => setActiveFilter('starred')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                activeFilter === 'starred'
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              ★ {locale === 'en' ? 'Starred' : '星标'} ({starredCount})
            </button>
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">
              {searchQuery || activeFilter !== 'all'
                ? (locale === 'en' ? 'No clients match your filters' : '没有符合条件的客户')
                : (locale === 'en' ? 'No active clients yet' : '暂无活跃客户')}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-8 px-4 py-3" />
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {locale === 'en' ? 'Client' : '客户'}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {locale === 'en' ? 'Status' : '状态'}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {locale === 'en' ? 'Uploads' : '上传'}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {locale === 'en' ? 'Next Deadline' : '下一个截止日期'}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {locale === 'en' ? 'Last Upload' : '最后上传'}
                  </th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    {locale === 'en' ? 'Action' : '操作'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 hover:brightness-[0.98] transition-all cursor-pointer group"
                    style={{ background: getRowBg(client.health_status) }}
                    onClick={() => window.location.href = `/dashboard/clients/${client.client_number ?? client.id}`}
                  >
                    <td className="px-4 py-3.5">
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            client.is_starred
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300"
                          )}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${getClientAvatarBg(client.health_status)}`}>
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {getStatusBadge(client.health_status)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-700">
                        {client.upload_progress?.uploaded || 0} files
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {client.next_deadline && (
                        <div>
                          <p className={cn(
                            "text-xs font-medium",
                            client.health_status === 'Overdue' ? 'text-red-600' :
                            client.health_status === 'Due Soon' ? 'text-amber-600' :
                            'text-gray-700'
                          )}>
                            {client.next_deadline.type} · {formatDate(client.next_deadline.date)}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {new Date(client.next_deadline.date).toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN')}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn(
                        "text-xs",
                        client.last_upload === 'Today' || client.last_upload === '今天'
                          ? 'font-semibold text-emerald-600'
                          : 'text-gray-500'
                      )}>
                        {formatRelativeUpload(client.last_upload)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      {(client.health_status === 'Overdue' || client.health_status === 'Due Soon') ? (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle send reminder
                          }}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {locale === 'en' ? 'Send Reminder' : '发送提醒'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.location.href = `/dashboard/clients/${client.client_number ?? client.id}`
                          }}
                          className="h-7 text-xs"
                        >
                          {locale === 'en' ? 'View' : '查看'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
