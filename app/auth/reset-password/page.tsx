'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 密码强度验证
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: '', color: '' };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { strength, label: 'Weak', color: '#EF4444' };
    if (strength === 3) return { strength, label: 'Fair', color: '#F59E0B' };
    if (strength === 4) return { strength, label: 'Good', color: '#10B981' };
    return { strength, label: 'Strong', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      toast.error(updateError.message);
    } else {
      toast.success('Password updated successfully!', {
        duration: 2000,
      });
      setTimeout(() => router.push('/dashboard'), 2000);
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#F9FAFB' }}>
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#ECFDF5' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
            <p className="mt-2 text-sm text-gray-500">
              Create a strong password to secure your account
            </p>
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm mb-4"
              style={{ background: '#FEE2E2', color: '#991B1B' }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2.5 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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

              {/* 密码强度指示器 */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className="h-1 flex-1 rounded-full transition-all"
                        style={{
                          background: level <= passwordStrength.strength ? passwordStrength.color : '#E5E7EB'
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-[10px] font-medium" style={{ color: passwordStrength.color }}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}

              <p className="text-[10px] text-gray-400 mt-1">
                Min 8 chars · 1 uppercase · 1 lowercase · 1 number
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Confirm Password
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full text-sm px-3 py-2.5 pr-10 rounded-xl border border-gray-200 focus:outline-none focus:border-emerald-400 transition-all"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPwd ? (
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

              {/* 密码匹配提示 */}
              {confirmPassword && (
                <p className={`text-[10px] mt-1 ${password === confirmPassword ? 'text-emerald-600' : 'text-red-500'}`}>
                  {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full justify-center py-3 text-sm font-medium rounded-xl transition-all disabled:opacity-50"
              style={{
                background: loading ? '#9CA3AF' : '#059669',
                color: 'white'
              }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}