'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, User, Search, CheckCircle2, ChevronRight, AlertCircle, Plus, RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TRIAL_EXPIRED_ERROR, trialExpiredMessage } from '@/lib/constants/trial'

type Mode = 'choose' | 'xero' | 'manual'

function XeroImportMode({ onBack }: { onBack: () => void }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [contacts, setContacts] = useState<Array<{
    contactId: string
    name: string
    emailAddress: string | null
    alreadyImported: boolean
  }>>([])
  const router = useRouter()

  // Fetch real Xero contacts on mount
  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch('/api/xero/contacts')
        if (res.ok) {
          const data = await res.json()
          setContacts(data.contacts || [])
        } else {
          const err = await res.json()
          toast.error(err.error || 'Failed to load Xero contacts')
        }
      } catch {
        toast.error('Failed to load Xero contacts')
      } finally {
        setLoading(false)
      }
    }
    fetchContacts()
  }, [])

  const filtered = contacts.filter(c => {
    if (c.alreadyImported) return false
    const q = search.toLowerCase()
    const matchesName = c.name.toLowerCase().includes(q)
    const matchesEmail = c.emailAddress ? c.emailAddress.toLowerCase().includes(q) : false
    return matchesName || matchesEmail
  })

  const toggle = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const selectAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map(c => c.contactId))

  const handleImport = async () => {
    if (selected.length === 0) { toast.error('Select at least one contact to import'); return; }
    setImporting(true)
    try {
      const res = await fetch('/api/xero/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selected })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`${data.imported} contact${data.imported !== 1 ? 's' : ''} imported successfully`)
        router.push('/dashboard/clients')
        router.refresh()
      } else if (data.error === TRIAL_EXPIRED_ERROR) {
        toast.error(trialExpiredMessage('import clients'))
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch {
      toast.error('Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="filio-card p-8 text-center">
        <RefreshCw size={24} className="mx-auto mb-2 animate-spin text-gray-400" />
        <p className="text-sm text-gray-500">Loading Xero contacts...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="filio-card overflow-hidden">
        {/* Search + Select All */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search Xero contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-sm pl-9 pr-4 py-2 rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:border-emerald-400 focus:bg-white transition-all"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={selected.length === filtered.length && filtered.length > 0}
              onChange={selectAll}
              className="rounded"
            />
            Select all
          </label>
        </div>

        {/* Contact List */}
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {filtered.map(c => (
            <label
              key={c.contactId}
              className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-all cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.includes(c.contactId)}
                onChange={() => toggle(c.contactId)}
                className="rounded"
              />
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: '#13B5EA' }}>
                {c.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{c.name}</p>
                <p className="text-xs text-gray-400">{c.emailAddress || 'No email'}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 shrink-0">Xero</span>
            </label>
          ))}
          {filtered.length === 0 && (
            <div className="py-10 text-center">
              <Search size={28} className="mx-auto mb-2 text-gray-200" />
              <p className="text-sm text-gray-400">No contacts found</p>
              {contacts.some(c => c.alreadyImported) && (
                <p className="text-xs text-gray-400 mt-1">All Xero contacts have already been imported</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
          <p className="text-xs text-gray-500">
            {selected.length > 0
              ? <span><strong className="text-gray-800">{selected.length}</strong> contact{selected.length > 1 ? 's' : ''} selected</span>
              : 'Select contacts to import'
            }
          </p>
          <button
            onClick={handleImport}
            disabled={selected.length === 0 || importing}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? (
              <><RefreshCw size={14} className="animate-spin" /> Importing...</>
            ) : (
              <><Zap size={14} /> Import {selected.length > 0 ? selected.length : ''} Client{selected.length !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-sky-50 border border-sky-100">
        <AlertCircle size={16} className="text-sky-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-sky-800">Existing contacts will be updated</p>
          <p className="text-xs text-sky-600 mt-0.5">If a contact already exists in Filio (matched by Xero ContactID), their information will be updated. New contacts will appear as pending confirmation.</p>
        </div>
      </div>
    </div>
  )
}

function ManualAddMode({ onBack }: { onBack: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', company: '',
    vatGroup: 'A', fyeMonth: 'March', fyeDay: '31',
    createXeroContact: true,
  })

  const update = (k: keyof typeof form, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 1) { setStep(2); return; }

    setSubmitting(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, email: form.email }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Client "${form.name}" created successfully`)
        router.push('/dashboard/clients')
        router.refresh()
      } else if (data.error === TRIAL_EXPIRED_ERROR) {
        toast.error(trialExpiredMessage('add clients'))
      } else {
        toast.error(data.error || 'Failed to create client')
      }
    } catch {
      toast.error('Failed to create client')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg">
      {/* Step Indicator */}
      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={step >= s
                ? { background: '#064E3B', color: 'white' }
                : { background: '#F3F4F6', color: '#9CA3AF' }
              }
            >
              {step > s ? <CheckCircle2 size={14} /> : s}
            </div>
            <span className="text-xs font-medium" style={{ color: step >= s ? '#064E3B' : '#9CA3AF' }}>
              {s === 1 ? 'Client Details' : 'Deadlines & Settings'}
            </span>
            {s < 2 && <ChevronRight size={14} className="text-gray-300" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="filio-card p-6 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Client / Company Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => update('name', e.target.value)}
                  required
                  placeholder="e.g. Harlow & Sons Ltd"
                  className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Portal Contact Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => update('email', e.target.value)}
                  required
                  placeholder="client@example.co.uk"
                  className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                />
                <p className="text-[10px] text-gray-400 mt-1">Must be unique within your firm. One email per client.</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Trading Name (optional)</label>
                <input
                  type="text"
                  value={form.company}
                  onChange={e => update('company', e.target.value)}
                  placeholder="e.g. Harlow Sons"
                  className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                />
              </div>
              <div className="flex items-center justify-between py-3 border-t border-gray-50 mt-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">Auto-create in Xero</p>
                  <p className="text-xs text-gray-400">Create a matching Contact in your Xero organisation. If a contact with the same name exists, it will be linked.</p>
                </div>
                <button
                  type="button"
                  onClick={() => update('createXeroContact', !form.createXeroContact)}
                  className="ml-4 shrink-0"
                >
                  {form.createXeroContact
                    ? <div className="w-10 h-6 rounded-full flex items-center justify-end px-0.5 transition-all" style={{ background: '#059669' }}><div className="w-5 h-5 rounded-full bg-white shadow-sm" /></div>
                    : <div className="w-10 h-6 rounded-full flex items-center justify-start px-0.5 bg-gray-200 transition-all"><div className="w-5 h-5 rounded-full bg-white shadow-sm" /></div>
                  }
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">VAT Quarter Group</label>
                <select
                  value={form.vatGroup}
                  onChange={e => update('vatGroup', e.target.value)}
                  className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                >
                  <option value="A">Group A — Jan / Apr / Jul / Oct</option>
                  <option value="B">Group B — Feb / May / Aug / Nov</option>
                  <option value="C">Group C — Mar / Jun / Sep / Dec</option>
                  <option value="none">Not VAT registered</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Financial Year End</label>
                <div className="flex gap-2 mt-1.5">
                  <select
                    value={form.fyeMonth}
                    onChange={e => update('fyeMonth', e.target.value)}
                    className="flex-1 text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                  >
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={form.fyeDay}
                    onChange={e => update('fyeDay', e.target.value)}
                    className="w-24 text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portal Language</label>
                <select className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all">
                  <option>English (default)</option>
                  <option>简体中文</option>
                </select>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="btn-secondary">
              Back
            </button>
          )}
          <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed">
            {step === 1 ? 'Next: Deadlines' : submitting ? (
              <><RefreshCw size={14} className="animate-spin" /> Creating...</>
            ) : (
              <><CheckCircle2 size={14} /> Create Client</>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export function NewClientForm({ initialMode }: { initialMode?: string }) {
  const [mode, setMode] = useState<Mode>(
    initialMode === 'xero' ? 'xero' : initialMode === 'manual' ? 'manual' : 'choose'
  )

  return (
    <div className="max-w-2xl">
      {/* Back */}
      <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft size={15} /> Back to Clients
      </Link>

      {mode === 'choose' && (
        <div>
          <div className="grid grid-cols-2 gap-4">
            {/* Import from Xero */}
            <button
              onClick={() => setMode('xero')}
              className="filio-card p-6 text-left hover:shadow-md transition-all group border-2 border-transparent hover:border-sky-200"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#E0F2FE' }}>
                <Zap size={22} style={{ color: '#13B5EA' }} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Import from Xero</h3>
              <p className="text-sm text-gray-500 mb-4">Select from your existing Xero contacts. Files will be automatically linked to their Xero records.</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#13B5EA' }}>
                Browse Xero contacts <ChevronRight size={14} />
              </span>
            </button>

            {/* Add Manually */}
            <button
              onClick={() => setMode('manual')}
              className="filio-card p-6 text-left hover:shadow-md transition-all group border-2 border-transparent hover:border-emerald-200"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: '#ECFDF5' }}>
                <User size={22} style={{ color: '#059669' }} />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Add Manually</h3>
              <p className="text-sm text-gray-500 mb-4">Enter client details by hand. A matching Xero Contact will be created automatically if enabled.</p>
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: '#059669' }}>
                Fill in details <ChevronRight size={14} />
              </span>
            </button>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Starter plan: up to 20 clients</p>
              <p className="text-xs text-amber-600 mt-0.5">You have 47 active clients. Upgrade to Professional (100 clients) or Firm (unlimited) to add more.</p>
            </div>
          </div>
        </div>
      )}

      {mode === 'xero' && (
        <div>
          <button onClick={() => setMode('choose')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#E0F2FE' }}>
              <Zap size={18} style={{ color: '#13B5EA' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Import from Xero</h2>
              <p className="text-xs text-gray-400">Showing contacts not yet imported</p>
            </div>
          </div>
          <XeroImportMode onBack={() => setMode('choose')} />
        </div>
      )}

      {mode === 'manual' && (
        <div>
          <button onClick={() => setMode('choose')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#ECFDF5' }}>
              <Plus size={18} style={{ color: '#059669' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Add Client Manually</h2>
              <p className="text-xs text-gray-400">Fill in the details below to create a new client</p>
            </div>
          </div>
          <ManualAddMode onBack={() => setMode('choose')} />
        </div>
      )}
    </div>
  )
}
