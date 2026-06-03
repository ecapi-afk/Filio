'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface RegisterFormProps {
  onSubmit: (
    email: string,
    password: string,
    firmName: string,
    firstName: string,
    lastName: string
  ) => Promise<void>;
  error?: string;
  loading?: boolean;
}

export function RegisterForm({ onSubmit, error, loading }: RegisterFormProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    firmName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);

  const update = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.firmName || !form.email) {
      toast.error('Please fill in all fields');
      return;
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    await onSubmit(form.email, form.password, form.firmName, form.firstName, form.lastName);
  };

  return (
    <>
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={
                step >= s
                  ? { background: '#059669', color: 'white' }
                  : { background: '#F3F4F6', color: '#9CA3AF' }
              }
            >
              {step > s ? <CheckCircle2 size={14} /> : s}
            </div>
            <span className="text-xs text-gray-500">
              {s === 1 ? 'Your details' : 'Set password'}
            </span>
            {s < 2 && <div className="flex-1 h-px bg-gray-200 w-8" />}
          </div>
        ))}
      </div>

      {error && (
        <div
          className="p-3 rounded-xl text-sm mb-4"
          style={{ background: '#FEE2E2', color: '#991B1B' }}
        >
          {error}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleStep1} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                First Name
              </label>
              <input
                value={form.firstName}
                onChange={update('firstName')}
                required
                placeholder="Sarah"
                className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Last Name
              </label>
              <input
                value={form.lastName}
                onChange={update('lastName')}
                required
                placeholder="Clarke"
                className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Firm Name
            </label>
            <input
              value={form.firmName}
              onChange={update('firmName')}
              required
              placeholder="Smith & Co Accountants"
              className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
            />
            <p className="text-[10px] text-gray-400 mt-1">Max 100 characters</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Work Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              placeholder="sarah@smith.co.uk"
              className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
            />
          </div>
          <button
            type="submit"
            className="btn-primary w-full justify-center py-3 text-sm"
          >
            Continue
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium"
              style={{ color: '#059669' }}
            >
              Sign in
            </Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleStep2} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={update('password')}
                required
                className="w-full text-sm px-3 py-2.5 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showPwd ? (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Min 8 chars · 1 uppercase · 1 lowercase · 1 number
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Confirm Password
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={update('confirmPassword')}
              required
              className="mt-1.5 w-full text-sm px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
            />
          </div>
          <div className="flex items-start gap-2 py-1">
            <input type="checkbox" required id="terms" className="mt-0.5" />
            <label htmlFor="terms" className="text-xs text-gray-500">
              I agree to the{' '}
              <a href="#" style={{ color: '#059669' }}>
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" style={{ color: '#059669' }}>
                Privacy Policy
              </a>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary flex-1 justify-center py-2.5 text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 justify-center py-2.5 text-sm disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium"
              style={{ color: '#059669' }}
            >
              Sign in
            </Link>
          </p>
        </form>
      )}
    </>
  );
}
