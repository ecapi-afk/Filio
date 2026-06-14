'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Mail, Calendar, Wifi, WifiOff, AlertTriangle, Shield, ShieldOff, Save, Send, Users, Upload, Clock, StickyNote, CreditCard, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PLAN_CLIENT_LIMITS, UNLIMITED_CLIENTS } from '@/lib/constants/plans'

interface FirmDetail {
  id: string
  name: string
  ownerEmail: string | null
  ownerName: string | null
  createdAt: string
  suspendedAt: string | null
  adminNotes: string | null
  timezone: string | null
  xeroStatus: 'connected' | 'token_expired' | 'not_connected'
  subscription: {
    plan: string
    status: string
    clientLimit: number
    currentPeriodEnd: string | null
    stripeSubscriptionId: string | null
    stripeCustomerId: string | null
  } | null
}

interface ClientStats {
  active: number
  dormant: number
  archived: number
  deleted: number
  recentClients: any[]
}

interface StripePrice {
  id: string
  plan: string
  nickname: string | null
  productName: string | null
  unitAmount: number | null
  currency: string
  interval: string | null
}

const PLAN_OPTIONS = ['trial', 'starter', 'professional', 'firm']
const PLAN_COLORS: Record<string, string> = {
  trial: 'bg-gray-100 text-gray-600',
  starter: 'bg-blue-50 text-blue-700',
  professional: 'bg-emerald-50 text-emerald-700',
  firm: 'bg-purple-50 text-purple-700',
}

export default function FirmDetailClient({ firmId }: { firmId: string }) {
  const router = useRouter()
  const [data, setData] = useState<{ firm: FirmDetail; clientStats: ClientStats; totalUploads: number; auditLogs: any[] } | null>(null)
  const [prices, setPrices] = useState<StripePrice[]>([])
  const [loading, setLoading] = useState(true)

  // Subscription form state
  const [subPlan, setSubPlan] = useState('trial')
  const [subStatus, setSubStatus] = useState('active')
  const [subLimit, setSubLimit] = useState(20)
  const [subPeriodEnd, setSubPeriodEnd] = useState('')
  const [selectedPriceId, setSelectedPriceId] = useState('')
  const [savingSub, setSavingSub] = useState(false)

  // Notes state
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  // Email state
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  // Suspend state
  const [suspending, setSuspending] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/firms/${firmId}`).then(r => r.json()),
      fetch('/api/admin/stripe/prices').then(r => r.json()),
    ]).then(([firmData, priceData]) => {
      setData(firmData)
      setPrices(priceData.prices ?? [])
      if (firmData.firm) {
        const sub = firmData.firm.subscription
        setSubPlan(sub?.plan ?? 'trial')
        setSubStatus(sub?.status ?? 'active')
        setSubLimit(sub?.clientLimit ?? 20)
        setSubPeriodEnd(sub?.currentPeriodEnd ? sub.currentPeriodEnd.slice(0, 10) : '')
        // Pre-select the price matching the current plan
        const matchingPrice = (priceData.prices ?? []).find((p: StripePrice) => p.plan === sub?.plan)
        if (matchingPrice) setSelectedPriceId(matchingPrice.id)
      }
      setNotes(firmData.firm?.adminNotes ?? '')
    }).finally(() => setLoading(false))
  }, [firmId])

  // Auto-update client limit when plan changes
  useEffect(() => {
    const defaultLimit = PLAN_CLIENT_LIMITS[subPlan] ?? 20
    setSubLimit(defaultLimit)
    const matchingPrice = prices.find(p => p.plan === subPlan)
    if (matchingPrice) setSelectedPriceId(matchingPrice.id)
  }, [subPlan, prices])

  const handleSaveSubscription = async () => {
    setSavingSub(true)
    try {
      const res = await fetch(`/api/admin/firms/${firmId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: subPlan,
          status: subStatus,
          clientLimit: subLimit,
          currentPeriodEnd: subPeriodEnd || null,
          stripePriceId: selectedPriceId || null,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success('Subscription updated')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription')
    } finally {
      setSavingSub(false)
    }
  }

  const handleSaveNotes = async () => {
    setSavingNotes(true)
    try {
      await fetch(`/api/admin/firms/${firmId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      toast.success('Notes saved')
    } finally {
      setSavingNotes(false)
    }
  }

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error('Subject and body are required')
      return
    }
    setSendingEmail(true)
    try {
      const res = await fetch(`/api/admin/firms/${firmId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      toast.success(`Email sent to ${result.sentTo}`)
      setEmailSubject('')
      setEmailBody('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email')
    } finally {
      setSendingEmail(false)
    }
  }

  const handleSuspend = async () => {
    setSuspending(true)
    try {
      const isSuspended = !!data?.firm.suspendedAt
      const res = await fetch(`/api/admin/firms/${firmId}/suspend`, {
        method: isSuspended ? 'DELETE' : 'POST',
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(isSuspended ? 'Account unsuspended' : 'Account suspended')
      // Reload data
      const updated = await fetch(`/api/admin/firms/${firmId}`).then(r => r.json())
      setData(updated)
    } catch {
      toast.error('Action failed')
    } finally {
      setSuspending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 size={24} className="text-gray-300 animate-spin" />
      </div>
    )
  }

  if (!data?.firm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">Firm not found</p>
      </div>
    )
  }

  const { firm, clientStats, totalUploads, auditLogs } = data
  const isSuspended = !!firm.suspendedAt

  const xeroIcon = () => {
    if (firm.xeroStatus === 'connected') return <Wifi size={14} className="text-emerald-500" />
    if (firm.xeroStatus === 'token_expired') return <AlertTriangle size={14} className="text-amber-500" />
    return <WifiOff size={14} className="text-gray-400" />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center gap-4">
        <button onClick={() => router.push('/filio-control')} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="h-4 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs font-bold">
            {firm.name.slice(0, 2).toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-gray-900">{firm.name}</span>
          {isSuspended && (
            <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">SUSPENDED</span>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-3 gap-6">
        {/* LEFT COL — 2/3 */}
        <div className="col-span-2 space-y-6">

          {/* Firm Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Building2 size={15} className="text-gray-400" /> Firm Information
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: 'Firm Name', value: firm.name },
                { label: 'Owner', value: firm.ownerName || '—' },
                { label: 'Email', value: firm.ownerEmail || '—' },
                { label: 'Timezone', value: firm.timezone || '—' },
                { label: 'Registered', value: new Date(firm.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
                { label: 'Xero', value: (
                  <span className="flex items-center gap-1.5">{xeroIcon()} {firm.xeroStatus === 'connected' ? 'Connected' : firm.xeroStatus === 'token_expired' ? 'Token expired' : 'Not connected'}</span>
                )},
              ].map(row => (
                <div key={row.label} className="flex flex-col gap-1">
                  <span className="text-xs text-gray-400">{row.label}</span>
                  <span className="text-sm text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Editor */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              <CreditCard size={15} className="text-gray-400" /> Subscription
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Plan</label>
                <select
                  value={subPlan}
                  onChange={e => setSubPlan(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  {PLAN_OPTIONS.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Status</label>
                <select
                  value={subStatus}
                  onChange={e => setSubStatus(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="active">Active</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Client Limit</label>
                <input
                  type="number"
                  value={subLimit >= UNLIMITED_CLIENTS ? 999999 : subLimit}
                  onChange={e => setSubLimit(parseInt(e.target.value) || 20)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1.5">Period End</label>
                <input
                  type="date"
                  value={subPeriodEnd}
                  onChange={e => setSubPeriodEnd(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                />
              </div>
            </div>

            {/* Stripe price picker */}
            {firm.subscription?.stripeSubscriptionId && (
              <div className="mb-5">
                <label className="text-xs text-gray-500 block mb-1.5">
                  Stripe Price <span className="text-gray-400">(sync to Stripe when saving)</span>
                </label>
                <select
                  value={selectedPriceId}
                  onChange={e => setSelectedPriceId(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="">— DB only, skip Stripe sync —</option>
                  {prices.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.productName ?? p.nickname ?? p.id} · {p.plan} · {p.currency.toUpperCase()} {p.unitAmount ? (p.unitAmount / 100).toFixed(2) : '?'}/{p.interval}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={handleSaveSubscription}
              disabled={savingSub}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
              style={{ background: '#059669' }}
            >
              {savingSub ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Subscription
            </button>
          </div>

          {/* Client breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
              <Users size={15} className="text-gray-400" /> Clients
            </h2>
            <div className="flex gap-4 mb-5">
              {[
                { label: 'Active', value: clientStats.active, color: 'text-emerald-600' },
                { label: 'Dormant', value: clientStats.dormant, color: 'text-amber-600' },
                { label: 'Archived', value: clientStats.archived, color: 'text-gray-400' },
              ].map(s => (
                <div key={s.label} className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                </div>
              ))}
              <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold tabular-nums text-blue-600">{totalUploads}</p>
                <p className="text-xs text-gray-400 mt-1">Total Uploads</p>
              </div>
            </div>
            {clientStats.recentClients.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-400 mb-2">Recent clients</p>
                {clientStats.recentClients.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                    <span className="text-sm text-gray-700">{c.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.management_status === 'active' ? 'bg-emerald-50 text-emerald-600' :
                      c.management_status === 'dormant' ? 'bg-amber-50 text-amber-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{c.management_status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit log */}
          {auditLogs.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Clock size={15} className="text-gray-400" /> Recent Activity
                </h2>
              </div>
              <div className="divide-y divide-gray-50">
                {auditLogs.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="px-6 py-3 flex items-center justify-between">
                    <span className="text-xs text-gray-700 font-medium">{log.action}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(log.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COL — 1/3 */}
        <div className="space-y-6">

          {/* Suspend / Unsuspend */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={14} className="text-gray-400" /> Account Control
            </h2>
            {isSuspended ? (
              <div className="mb-4 p-3 rounded-lg bg-red-50 text-xs text-red-700">
                Suspended on {new Date(firm.suspendedAt!).toLocaleDateString('en-GB')}
              </div>
            ) : null}
            <button
              onClick={handleSuspend}
              disabled={suspending}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${
                isSuspended
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              {suspending ? <Loader2 size={14} className="animate-spin" /> : isSuspended ? <CheckCircle2 size={14} /> : <ShieldOff size={14} />}
              {isSuspended ? 'Unsuspend Account' : 'Suspend Account'}
            </button>
            {!isSuspended && (
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Sets all active clients to dormant and blocks login
              </p>
            )}
          </div>

          {/* Admin Notes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <StickyNote size={14} className="text-gray-400" /> Internal Notes
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Private notes only visible to admins…"
              rows={5}
              className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-gray-700"
            />
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {savingNotes ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Save Notes
            </button>
          </div>

          {/* Send Email */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Mail size={14} className="text-gray-400" /> Send Email
            </h2>
            <p className="text-xs text-gray-400 mb-3">To: {firm.ownerEmail || 'unknown'}</p>
            <div className="space-y-2">
              <input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                placeholder="Subject"
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                placeholder="Message…"
                rows={5}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: '#059669' }}
              >
                {sendingEmail ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Send Email
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
