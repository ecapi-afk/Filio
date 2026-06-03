'use client';

import { useState } from 'react';
import { Upload, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PortalEntryClient() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // Simulate sending OTP to email
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Verification code sent to your email');
      setStep('verify');
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-background border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-emerald-600">
            F
          </div>
          <div>
            <p className="text-sm font-bold">Document Portal</p>
            <p className="text-[10px] text-muted-foreground">Powered by Filio</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {step === 'request' ? (
            <Card>
              <CardHeader className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-emerald-50">
                  <Upload className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle className="text-xl">Upload Your Documents</CardTitle>
                <CardDescription>
                  Enter your email address and we&apos;ll send you a 4-digit verification code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      'Sending Code...'
                    ) : (
                      <>
                        Send Verification Code <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-emerald-50">
                  <Mail className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle className="text-xl">Enter Verification Code</CardTitle>
                <CardDescription>
                  We&apos;ve sent a 4-digit code to <strong>{email}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    await new Promise(r => setTimeout(r, 600));
                    if ((e.target as any).otp.value === '9527') {
                      toast.success('Verified successfully! (In a real app, you would be redirected)');
                    } else {
                      toast.error('Invalid verification code');
                    }
                    setLoading(false);
                  }} 
                  className="space-y-4"
                >
                  <div className="space-y-2 text-center flex flex-col items-center">
                    <Input
                      name="otp"
                      type="text"
                      maxLength={4}
                      placeholder="• • • •"
                      className="text-center text-2xl tracking-widest px-4 py-6 w-40"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Verifying...' : 'Verify & Proceed'}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <Button variant="link" className="text-xs" disabled={loading} onClick={() => setStep('request')}>
                    Use a different email
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Your files are encrypted and securely stored</p>
        </div>
      </footer>
    </div>
  );
}
