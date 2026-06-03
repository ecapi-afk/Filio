'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function OTPClient({
  code,
  portalToken,
  clientName,
  clientEmail,
}: {
  code: string;
  portalToken: string;
  clientName: string;
  clientEmail: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  // Mask the email for privacy (e.g., e***@firm.com)
  const maskEmail = (email: string) => {
    if (!email || !email.includes('@')) return email;
    const [local, domain] = email.split('@');
    return `${local[0]}***@${domain}`;
  };

  const maskedEmail = maskEmail(clientEmail);

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      // TODO: Actually trigger an API call to send the 4-digit code to the user's email
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success(`Verification code sent to ${maskedEmail}`);
      setStep('verify');
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) return;

    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate validation delay
      if (otp === '9527') {
        toast.success('Successfully verified');
        // Redirect to upload interface with the hidden portalToken
        window.location.href = `/portal/upload?token=${portalToken}`;
      } else {
        toast.error('Invalid verification code');
      }
    } catch {
      toast.error('An error occurred during verification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
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

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          {step === 'request' ? (
            <Card>
              <CardHeader className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-blue-50">
                  <Shield className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Security Verification</CardTitle>
                <CardDescription>
                  Welcome back, <strong>{clientName}</strong>.
                  <br />
                  For security reasons, your immediate access window has expired.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-center text-muted-foreground">
                  We need to send a 4-digit verification code to your registered email address (<strong>{maskedEmail}</strong>).
                </p>
                <Button onClick={handleSendOTP} className="w-full" disabled={loading}>
                  {loading ? 'Sending Code...' : 'Send Verification Code'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="text-center">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-emerald-50">
                  <Lock className="h-6 w-6 text-emerald-600" />
                </div>
                <CardTitle className="text-xl">Enter Verification Code</CardTitle>
                <CardDescription>
                  We&apos;ve sent a 4-digit code to <strong>{maskedEmail}</strong>.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="space-y-2 text-center flex flex-col items-center">
                    <Input
                      type="text"
                      maxLength={4}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // only digits
                      placeholder="• • • •"
                      className="text-center text-2xl tracking-widest px-4 py-6 w-40"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading || otp.length < 4}>
                    {loading ? 'Verifying...' : 'Verify & Proceed'}
                  </Button>
                </form>
                <div className="mt-4 text-center">
                  <Button variant="link" className="text-xs" disabled={loading} onClick={() => setStep('request')}>
                    Didn&apos;t receive the code? Try again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
