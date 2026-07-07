"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { loginApi } from '@/features/auth/api';
import { SocialLoginButtons } from '@/features/auth/SocialLoginButtons';
import { Input } from '@/components/Inputs';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';

import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  
  // Стани форми
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Стани валідації та помилок
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const userB64 = params.get('user');
      const errorParam = params.get('error');

      if (errorParam === 'oauth_failed') {
        setError('Failed to log in with social account. Please try again.');
      }

      if (token && userB64) {
        try {
          // In URL query parameters, '+' characters are often converted to spaces (' '). 
          // We need to restore them before decoding base64.
          const base64Decoded = atob(userB64.replace(/ /g, '+'));
          const userStr = decodeURIComponent(
            base64Decoded.split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join('')
          );
          const userObj = JSON.parse(userStr);
          
          // Clear query parameters from URL history immediately to prevent logout redirect loop
          window.history.replaceState({}, document.title, window.location.pathname);
          
          login(token, userObj);
        } catch (err) {
          console.error('Failed to parse user from URL', err);
        }
      }
    }
  }, [login]);

  // Валідація полів перед сабмітом
  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);
    setError(null);

    if (!email) {
      setEmailError('Please enter your email address');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email format');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Please enter your password');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      // Робимо POST запит на бекенд для логіну
      const response = await loginApi(email, password);

      if (response.success && response.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else if (response.success && response.token && response.user) {
        login(response.token, response.user);
      } else {
        setError('Failed to log in. Please try again later.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid email or password';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-text-light">Welcome back to OptiDrive</h1>
        <p className="text-xs text-text-muted">Sign in to your account to continue working</p>
      </div>

      {/* Повідомлення про загальну помилку */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-error/20 bg-error/10 p-3.5 text-sm text-error">
          <Icon icon="lucide:alert-circle" className="shrink-0" width={18} height={18} />
          <span>{error}</span>
        </div>
      )}

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

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-text-light" htmlFor="password">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-text-muted transition-colors hover:text-accent"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            variant="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
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
          disabled={isLoading}
          className="w-full justify-center mt-2"
        >
          {isLoading ? (
            <>
              <Icon icon="lucide:loader-2" className="animate-spin" width={18} height={18} />
              <span>Sign In...</span>
            </>
          ) : (
            <span>Sign In</span>
          )}
        </Button>
      </form>

      <SocialLoginButtons />

      {/* Footer */}
      <div className="text-center text-xs text-text-muted mt-2">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-accent hover:brightness-125 transition-all">
          Sign up
        </Link>
      </div>
    </div>
  );
}
