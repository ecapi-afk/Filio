'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, Upload, X, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BrandingData {
  brand_color: string
  logo_url: string | null
  portal_welcome_message: string
}

const DEFAULT_WELCOME = "Welcome! Please upload your documents using the button below. If you have any questions, don't hesitate to contact us."

export default function BrandingSettingsPage() {
  const [data, setData] = useState<BrandingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [form, setForm] = useState({ brand_color: '#064E3B', portal_welcome_message: '' })
  const [previewOpen, setPreviewOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/firm/branding')
      .then(r => r.json())
      .then((d: BrandingData) => {
        setData(d)
        setForm({ brand_color: d.brand_color, portal_welcome_message: d.portal_welcome_message })
      })
      .catch(() => toast.error('Failed to load branding'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/firm/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setData(d => d ? { ...d, ...form } : d)
      toast.success('Branding saved')
    } catch {
      toast.error('Failed to save branding')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/firm/logo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setData(d => d ? { ...d, logo_url: json.url } : d)
      toast.success('Logo uploaded')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    try {
      await fetch('/api/firm/logo', { method: 'DELETE' })
      setData(d => d ? { ...d, logo_url: null } : d)
      toast.success('Logo removed')
    } catch {
      toast.error('Failed to remove logo')
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-gray-300" size={24} />
      </div>
    )
  }

  const welcomeChars = form.portal_welcome_message.length

  return (
    <div className="max-w-2xl space-y-5">
      {/* Logo */}
      <div className="filio-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Firm Logo</h3>
        <p className="text-xs text-gray-500">Shown on the client upload portal. PNG, SVG, JPEG or WebP · Max 2 MB · Recommended 200×60 px</p>

        {data?.logo_url ? (
          <div className="flex items-center gap-4">
            <div className="relative w-40 h-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
              <Image src={data.logo_url} alt="Firm logo" fill className="object-contain p-2" unoptimized />
            </div>
            <button
              onClick={handleRemoveLogo}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 transition-colors"
            >
              <X size={13} /> Remove
            </button>
          </div>
        ) : (
          <div
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-emerald-300 transition-all cursor-pointer relative"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadingLogo
              ? <Loader2 size={20} className="animate-spin mx-auto mb-2 text-gray-400" />
              : <Upload size={20} className="mx-auto mb-2 text-gray-400" />
            }
            <p className="text-sm text-gray-500">
              {uploadingLogo ? 'Uploading…' : <>Drop logo here or <span className="text-emerald-600">browse</span></>}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleLogoUpload(f)
                e.target.value = ''
              }}
            />
          </div>
        )}
      </div>

      {/* Brand colour */}
      <div className="filio-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Portal Header Colour</h3>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={form.brand_color}
            onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))}
            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
          />
          <input
            type="text"
            value={form.brand_color}
            onChange={e => setForm(f => ({ ...f, brand_color: e.target.value }))}
            className="w-32 px-3 py-2 text-sm font-mono rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <div className="flex-1 h-10 rounded-lg border border-gray-100" style={{ background: form.brand_color }} />
        </div>
      </div>

      {/* Welcome message */}
      <div className="filio-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-gray-900">Portal Welcome Message</h3>
        <textarea
          value={form.portal_welcome_message}
          onChange={e => setForm(f => ({ ...f, portal_welcome_message: e.target.value }))}
          placeholder={DEFAULT_WELCOME}
          rows={4}
          maxLength={500}
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
        />
        <p className="text-xs text-gray-400 text-right">{welcomeChars}/500</p>
      </div>

      {/* Preview + Save */}
      <div className="flex items-center gap-3 justify-between">
        <button
          onClick={() => setPreviewOpen(true)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Eye size={15} /> Preview portal
        </button>
        <Button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
          {saving ? 'Saving…' : 'Save Branding'}
        </Button>
      </div>

      {/* Portal preview modal */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl overflow-hidden w-96 max-w-[90vw]"
            onClick={e => e.stopPropagation()}
          >
            <div
              className="h-16 flex items-center px-6"
              style={{ background: form.brand_color }}
            >
              {data?.logo_url
                ? <Image src={data.logo_url} alt="Logo" width={120} height={36} className="object-contain" unoptimized />
                : <span className="text-white font-bold text-lg">Your Firm</span>
              }
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                {form.portal_welcome_message || DEFAULT_WELCOME}
              </p>
              <div className="h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium" style={{ background: form.brand_color }}>
                Upload Documents
              </div>
            </div>
            <div className="px-6 pb-4 text-right">
              <button onClick={() => setPreviewOpen(false)} className="text-xs text-gray-400 hover:text-gray-600">
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
