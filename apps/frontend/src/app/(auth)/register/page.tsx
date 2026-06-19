"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { registerApi } from '@/features/auth/api';
import { SocialLoginButtons } from '@/features/auth/SocialLoginButtons';
import { Input } from '@/components/Inputs';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';

export default function RegisterPage() {
  const { login } = useAuth();
  
  // Стани форми
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Стани валідації та помилок
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setError(null);

    if (!name.trim()) {
      setNameError('Please enter your full name');
      isValid = false;
    }

    if (!email) {
      setEmailError('Please enter your email address');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Invalid email format');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Please enter a password');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    return isValid;
  };

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await registerApi(email, password, name);

      if (response.success && response.requiresVerification) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        setError('Failed to create account. Please try again later.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed. This user might already exist.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-text-light">Create your account</h1>
        <p className="text-xs text-text-muted">Register to start optimizing images</p>
      </div>

      {/* Повідомлення про загальну помилку */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-xl border border-error/20 bg-error/10 p-3.5 text-sm text-error">
          <Icon icon="lucide:alert-circle" className="shrink-0" width={18} height={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-light" htmlFor="name">
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            variant="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className={nameError ? 'border-error/50 focus:border-error' : ''}
          />
          {nameError && (
            <span className="text-[11px] font-medium text-error mt-0.5">{nameError}</span>
          )}
        </div>

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
          <label className="text-xs font-medium text-text-light" htmlFor="password">
            Password
          </label>
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
              <span>Create Account...</span>
            </>
          ) : (
            <span>Create Account</span>
          )}
        </Button>
      </form>

      <SocialLoginButtons />

      {/* Footer */}
      <div className="text-center text-xs text-text-muted mt-2">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-accent hover:brightness-125 transition-all">
          Sign in
        </Link>
      </div>
    </div>
  );
}
