'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout } from '@/components/auth/auth-layout';
import { RegisterForm } from '@/components/auth/register-form';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(
    email: string,
    password: string,
    firmName: string,
    firstName: string,
    lastName: string
  ) {
    setLoading(true);
    setError('');

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          firm_name: firmName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If we get here, signup succeeded - redirect to dashboard
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <AuthLayout
      title="Start your free trial"
      subtitle="14 days free · No credit card required"
    >
      <RegisterForm onSubmit={handleRegister} error={error} loading={loading} />
    </AuthLayout>
  );
}
