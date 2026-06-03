'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  error?: string;
  loading?: boolean;
}

export function LoginForm({ onSubmit, error, loading }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-xl text-sm"
          style={{ background: '#FEE2E2', color: '#991B1B' }}
        >
          {error}
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="sarah@smith.co.uk"
          required
          className="mt-1.5 w-full text-sm px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium"
            style={{ color: '#059669' }}
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full text-sm px-4 py-3 pr-12 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPwd ? (
              <svg
                width="16"
                height="16"
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
                width="16"
                height="16"
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
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full justify-center py-3 text-sm mt-2 disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-gray-50 px-3 text-xs text-gray-400">or</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => toast.info('Xero SSO coming soon')}
        className="btn-xero w-full justify-center py-3 text-sm"
      >
        <Zap size={16} /> Sign in with Xero
      </button>

      <p className="text-center text-sm text-gray-500 mt-4">
        Don&apos;t have an account?{' '}
        <Link
          href="/register"
          className="font-medium"
          style={{ color: '#059669' }}
        >
          Register
        </Link>
      </p>
    </form>
  );
}
