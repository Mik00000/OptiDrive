"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { verifyEmailApi, resendVerificationEmailApi } from '@/features/auth/api';
import { Input } from '@/components/Inputs';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await verifyEmailApi(email, code);

      if (response.success && response.token && response.user) {
        login(response.token, response.user);
      } else {
        setError('Failed to verify email. Please try again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid or expired code.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) return;

    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      await resendVerificationEmailApi(email);
      setSuccess('A new code has been sent! Check your inbox.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend the code.';
      setError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-text-light">Verify your email</h1>
        <p className="text-xs text-text-muted">
          We sent a 6-digit code to <span className="font-medium text-text-light">{email || 'your address'}</span>. Please enter it below.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-error/20 bg-error/10 p-3.5 text-sm text-error">
          <Icon icon="lucide:alert-circle" className="shrink-0" width={18} height={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/10 p-3.5 text-sm text-success">
          <Icon icon="lucide:check-circle" className="shrink-0" width={18} height={18} />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-light" htmlFor="code">
            Verification Code
          </label>
          <Input
            id="code"
            type="text"
            variant="text"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={isLoading}
            className="text-center tracking-widest text-lg"
          />
        </div>

        <Button
          type="submit"
          variant="accent"
          disabled={isLoading || code.length !== 6}
          className="w-full justify-center mt-2"
        >
          {isLoading ? (
            <>
              <Icon icon="lucide:loader-2" className="animate-spin" width={18} height={18} />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Verify</span>
          )}
        </Button>
      </form>

      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="text-center text-xs text-text-muted">
          Didn&apos;t receive the code?{' '}
          <button 
            onClick={handleResend}
            disabled={isResending || !email}
            className="font-semibold text-accent hover:brightness-125 transition-all disabled:opacity-50"
          >
            {isResending ? 'Sending...' : 'Resend Code'}
          </button>
        </div>
        
        <div className="text-center text-xs text-text-muted">
          Wrong email address?{' '}
          <Link href="/register" className="font-semibold text-accent hover:brightness-125 transition-all">
            Change Email
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Icon icon="lucide:loader-2" className="animate-spin text-accent" width={24} height={24} /></div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
