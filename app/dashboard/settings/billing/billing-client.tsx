'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, AlertTriangle, Sparkles, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PLAN_CLIENT_LIMITS, UNLIMITED_CLIENTS } from '@/lib/constants/plans'

interface Subscription {
  plan: string
  status: string
  client_limit: number | null
  current_period_end: string | null
  stripe_customer_id: string | null
  trial_ends_at?: string | null
  created_at?: string
}

interface Invoice {
  id: string
  date: string
  amount: number
  currency: string
  pdfUrl: string | null
  hostedUrl: string | null
}

const PLANS = [
  {
    slug: 'starter',
    name: 'Starter',
    monthlyPrice: 29,
    annualMonthly: 23,
    annualTotal: 276,
    clients: 20,
    features: [
      'Client Portal',
      'Xero Direct Sync',
      'Automated Email Reminders',
      'Audit Log',
    ],
  },
  {
    slug: 'professional',
    name: 'Professional',
    monthlyPrice: 59,
    annualMonthly: 47,
    annualTotal: 564,
    clients: 100,
    earlyBird: true,
    features: [
      'Everything in Starter',
      'Magic Email Inbox',
      'Document Checklist',
      'Client Activity Timeline',
      'Brand Customisation',
    ],
  },
  {
    slug: 'firm',
    name: 'Firm',
    monthlyPrice: 99,
    annualMonthly: 79,
    annualTotal: 948,
    clients: null,
    earlyBird: true,
    features: [
      'Everything in Professional',
      'Unlimited Clients',
      'Custom Domain (coming)',
      'Team Members (coming)',
      'API Access (coming)',
    ],
  },
]

const PLAN_RANK: Record<string, number> = { starter: 0, professional: 1, firm: 2 }

export function BillingClient({
  subscription,
  clientCount,
}: {
  subscription: Subscription
  clientCount: number
}) {
  const currentPlan = (subscription.plan || 'trial').toLowerCase()
  const isTrial = currentPlan === 'trial'
  const isCanceled = subscription.status === 'canceled'
  const hasStripeCustomer = !!subscription.stripe_customer_id

  const clientLimit =
    currentPlan === 'firm'
      ? UNLIMITED_CLIENTS
      : (subscription.client_limit ?? PLAN_CLIENT_LIMITS[currentPlan] ?? 20)
  const isUnlimited = clientLimit >= UNLIMITED_CLIENTS
  const usagePercent = isUnlimited
    ? 0
    : Math.min(100, Math.round((clientCount / clientLimit) * 100))

  const trialEndDate = (() => {
    if (!isTrial) return null
    if (subscription.trial_ends_at) return new Date(subscription.trial_ends_at)
    if (subscription.created_at) {
      return new Date(new Date(subscription.created_at).getTime() + 30 * 24 * 60 * 60 * 1000)
    }
    return null
  })()
  const trialDaysRemaining = trialEndDate
    ? Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const nextBilling = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : isTrial && trialEndDate
    ? trialEndDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const currentPlanData = PLANS.find(p => p.slug === currentPlan)
  const monthlyCostDisplay = isTrial
    ? '£0.00'
    : currentPlanData
    ? `£${currentPlanData.monthlyPrice}.00`
    : '—'

  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [openingPortal, setOpeningPortal] = useState(false)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invoiceError, setInvoiceError] = useState(false)
  const [downgradeConfirm, setDowngradeConfirm] = useState<{
    planSlug: string
    newLimit: number
    excess: number
  } | null>(null)

  useEffect(() => {
    if (!hasStripeCustomer) return
    setLoadingInvoices(true)
    setInvoiceError(false)
    fetch('/api/stripe/invoices')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setInvoices(d.data || [])
      })
      .catch(() => setInvoiceError(true))
      .finally(() => setLoadingInvoices(false))
  }, [hasStripeCustomer])

  const handleUpgrade = async (planSlug: string) => {
    setCheckingOut(planSlug)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planSlug, billing }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to start checkout')
      }
    } catch {
      toast.error('Failed to start checkout')
    } finally {
      setCheckingOut(null)
    }
  }

  const handleManageBilling = async () => {
    setOpeningPortal(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error || 'Failed to open billing portal')
      }
    } catch {
      toast.error('Failed to open billing portal')
    } finally {
      setOpeningPortal(false)
    }
  }

  const handlePlanClick = (planSlug: string) => {
    if (isTrial) {
      handleUpgrade(planSlug)
      return
    }
    const currentRank = PLAN_RANK[currentPlan] ?? 0
    const targetRank = PLAN_RANK[planSlug] ?? 0
    const isDowngrade = targetRank < currentRank

    if (isDowngrade) {
      const newLimit = PLAN_CLIENT_LIMITS[planSlug] ?? 20
      const excess = Math.max(0, clientCount - newLimit)
      if (excess > 0) {
        setDowngradeConfirm({ planSlug, newLimit, excess })
        return
      }
    }
    handleUpgrade(planSlug)
  }

  const currentRank = isTrial ? -1 : (PLAN_RANK[currentPlan] ?? 0)

  return (
    <div className="max-w-3xl space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">Current Plan</CardTitle>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  isCanceled
                    ? 'bg-red-50 text-red-700'
                    : isTrial
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                {isTrial
                  ? 'Trial — Full Access'
                  : currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}{' '}
                · {isCanceled ? 'Canceled' : 'Active'}
              </span>
              {hasStripeCustomer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageBilling}
                  disabled={openingPortal}
                >
                  {openingPortal ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Manage Billing'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Clients Used
              </p>
              <p className="text-xl font-bold tabular-nums">
                {clientCount} / {isUnlimited ? '∞' : clientLimit}
              </p>
              {!isUnlimited && (
                <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 90
                        ? 'bg-red-500'
                        : usagePercent >= 70
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {isTrial ? 'Trial Ends' : 'Next Billing'}
              </p>
              <p className="text-xl font-bold">{nextBilling}</p>
              {isTrial && trialDaysRemaining !== null && (
                <p className={`text-xs font-medium mt-0.5 ${
                  trialDaysRemaining <= 0 ? 'text-red-600' :
                  trialDaysRemaining <= 7 ? 'text-amber-600' :
                  'text-blue-600'
                }`}>
                  {trialDaysRemaining <= 0
                    ? 'Expired'
                    : `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} remaining`}
                </p>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                Monthly Cost
              </p>
              <p className="text-xl font-bold tabular-nums">{monthlyCostDisplay}</p>
            </div>
          </div>
          {isTrial && (
            <div className={`rounded-lg px-3 py-2.5 mt-3 ${
              trialDaysRemaining !== null && trialDaysRemaining <= 0
                ? 'bg-red-50 text-red-700'
                : trialDaysRemaining !== null && trialDaysRemaining <= 7
                ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              <p className="text-xs font-semibold mb-0.5">
                {trialDaysRemaining !== null && trialDaysRemaining <= 0
                  ? 'Your trial has ended'
                  : trialDaysRemaining !== null
                  ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? '' : 's'} left in your free trial`
                  : 'Free trial — full access'}
              </p>
              <p className="text-xs opacity-80">
                You have full access to all Professional features during your trial.
                Subscribe below to keep your data and clients after it ends.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing Toggle + Plans */}
      <div>
        <div className="flex items-center justify-center mb-5">
          <div className="inline-flex items-center bg-muted rounded-lg p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all ${
                billing === 'monthly'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-muted-foreground hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`text-xs font-medium px-4 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                billing === 'annual'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-muted-foreground hover:text-gray-700'
              }`}
            >
              Annual
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = !isTrial && plan.slug === currentPlan
            const targetRank = PLAN_RANK[plan.slug] ?? 0
            const isDowngrade = !isTrial && targetRank < currentRank
            const isLoading = checkingOut === plan.slug
            const displayPrice =
              billing === 'annual' ? plan.annualMonthly : plan.monthlyPrice

            return (
              <Card
                key={plan.slug}
                className={`relative ${isCurrent ? 'ring-2 ring-emerald-500' : ''}`}
              >
                {plan.earlyBird && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-400 text-amber-900 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                      <Sparkles className="h-2.5 w-2.5" /> Early Bird Price
                    </span>
                  </div>
                )}
                <CardHeader className="pb-3 pt-5">
                  {isCurrent && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-2 w-fit">
                      Current Plan
                    </span>
                  )}
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <div className="flex items-end gap-1">
                    <span className="text-2xl font-bold">£{displayPrice}</span>
                    <span className="text-sm text-muted-foreground mb-0.5">/mo</span>
                  </div>
                  {billing === 'annual' && (
                    <p className="text-[10px] text-muted-foreground">
                      £{plan.annualTotal}/year · 2 months free
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Up to {plan.clients === null ? 'unlimited' : plan.clients} clients
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1.5 mb-4">
                    {plan.features.map((f) => (
                      <div
                        key={f}
                        className="flex items-center gap-2 text-xs text-muted-foreground"
                      >
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                        {f}
                      </div>
                    ))}
                  </div>
                  {isCurrent ? (
                    <div className="w-full text-center text-xs text-muted-foreground py-1.5">
                      Your current plan
                    </div>
                  ) : (
                    <Button
                      variant={isDowngrade ? 'outline' : 'default'}
                      className="w-full"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handlePlanClick(plan.slug)}
                    >
                      {isLoading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isTrial ? (
                        'Subscribe'
                      ) : isDowngrade ? (
                        'Downgrade'
                      ) : (
                        'Upgrade'
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Invoice History */}
      {hasStripeCustomer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Invoice History</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading invoices…
              </div>
            ) : invoiceError ? (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Failed to load invoices. Please try refreshing the page.
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
            ) : (
              <div className="divide-y">
                {invoices.map((inv) => {
                  const dateLabel = (() => {
                    const d = new Date(inv.date)
                    return isNaN(d.getTime())
                      ? inv.date
                      : d.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                  })()

                  return (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between py-2.5 text-sm"
                    >
                      <span className="text-muted-foreground">{dateLabel}</span>
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
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* GDPR */}
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground">
          Need to delete your account and data?{' '}
          <a
            href="mailto:privacy@filio.uk?subject=Data Deletion Request"
            className="text-red-600 hover:underline"
          >
            Request data deletion
          </a>{' '}
          — we will process your request within 30 days in accordance with GDPR.
        </p>
      </div>

      {/* Downgrade confirmation */}
      {downgradeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Confirm Downgrade</h3>
                <p className="text-xs text-gray-500">
                  You currently have <strong>{clientCount} active clients</strong>. The{' '}
                  {downgradeConfirm.planSlug.charAt(0).toUpperCase() +
                    downgradeConfirm.planSlug.slice(1)}{' '}
                  plan allows up to <strong>{downgradeConfirm.newLimit}</strong>.
                </p>
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">
                  <strong>
                    {downgradeConfirm.excess} client
                    {downgradeConfirm.excess > 1 ? 's' : ''}
                  </strong>{' '}
                  will be automatically set to <strong>dormant</strong> (least recently active
                  first). You can reactivate them by upgrading again.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDowngradeConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  const slug = downgradeConfirm.planSlug
                  setDowngradeConfirm(null)
                  handleUpgrade(slug)
                }}
              >
                Confirm Downgrade
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
