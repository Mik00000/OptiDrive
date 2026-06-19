"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/Inputs';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { resetPasswordApi } from '@/features/auth/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError('Invalid or missing reset token.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setError(null);

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    if (!password) {
      setPasswordError('Please enter a new password');
      return;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    if (password !== passwordConfirm) {
      setPasswordError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await resetPasswordApi(token, password);
      setIsSuccess(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password. Token might be expired.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Icon icon="lucide:check" width={24} height={24} />
          </div>
          <h1 className="text-xl font-semibold text-text-light">Password Reset Successfully</h1>
          <p className="text-xs text-text-muted px-4">
            Your password has been successfully updated. You can now sign in with your new password.
          </p>
        </div>

        <Link href="/login" className="w-full">
          <Button variant="accent" className="w-full justify-center">
            Go to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-text-light">Create New Password</h1>
        <p className="text-xs text-text-muted font-normal">
          Please enter your new password below.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-error/20 bg-error/10 p-3.5 text-sm text-error">
          <Icon icon="lucide:alert-circle" className="shrink-0" width={18} height={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* New Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-light" htmlFor="password">
            New Password
          </label>
          <Input
            id="password"
            type="password"
            variant="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading || !token}
            className={passwordError ? 'border-error/50 focus:border-error' : ''}
          />
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-light" htmlFor="passwordConfirm">
            Confirm Password
          </label>
          <Input
            id="passwordConfirm"
            type="password"
            variant="password"
            placeholder="••••••••"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            disabled={isLoading || !token}
            className={passwordError ? 'border-error/50 focus:border-error' : ''}
          />
          {passwordError && (
            <span className="text-[11px] font-medium text-error mt-0.5">{passwordError}</span>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="accent"
          disabled={isLoading || !token}
          className="w-full justify-center mt-2"
        >
          {isLoading ? (
            <>
              <Icon icon="lucide:loader-2" className="animate-spin" width={18} height={18} />
              <span>Resetting...</span>
            </>
          ) : (
            <span>Reset Password</span>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Icon icon="lucide:loader-2" className="animate-spin text-accent" width={24} height={24} /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
