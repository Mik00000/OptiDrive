"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/Inputs';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { forgotPasswordApi } from '@/features/auth/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!email) {
      setEmailError('Please enter your email address');
      return;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email format');
      return;
    }

    setIsLoading(true);
    try {
      await forgotPasswordApi(email);
      setIsSent(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset link';
      setEmailError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
    return (
      <div className="flex flex-col gap-6 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
            <Icon icon="lucide:mail" width={24} height={24} />
          </div>
          <h1 className="text-xl font-semibold text-text-light">Check your email</h1>
          <p className="text-xs text-text-muted px-4">
            We sent a password reset link to <strong className="text-text-light">{email}</strong>
          </p>
        </div>

        <Link href="/login" className="w-full">
          <Button variant="accent" className="w-full justify-center">
            Back to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-text-light">Reset Password</h1>
        <p className="text-xs text-text-muted font-normal">
          Enter your email address and we will send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Email Address */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-light" htmlFor="email">
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            variant="text"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            className={emailError ? 'border-error/50 focus:border-error' : ''}
          />
          {emailError && (
            <span className="text-[11px] font-medium text-error mt-0.5">{emailError}</span>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          variant="accent"
          disabled={isLoading}
          className="w-full justify-center mt-2"
        >
          {isLoading ? (
            <>
              <Icon icon="lucide:loader-2" className="animate-spin" width={18} height={18} />
              <span>Sending...</span>
            </>
          ) : (
            <span>Send Reset Link</span>
          )}
        </Button>
      </form>

      {/* Footer */}
      <div className="text-center text-xs text-text-muted mt-2">
        Remember your password?{' '}
        <Link href="/login" className="font-semibold text-accent hover:brightness-125 transition-all">
          Sign in
        </Link>
      </div>
    </div>
  );
}
