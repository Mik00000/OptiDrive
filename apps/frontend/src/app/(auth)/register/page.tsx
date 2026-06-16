"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { registerApi } from '@/features/auth/api';
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

  // Валідація форми
  const validateForm = (): boolean => {
    let isValid = true;
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setError(null);

    if (!name.trim()) {
      setNameError('Будь ласка, введіть ваше ім\'я');
      isValid = false;
    }

    if (!email) {
      setEmailError('Будь ласка, введіть email адресу');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Некоректний формат email');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Будь ласка, введіть пароль');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Пароль має містити щонайменше 6 символів');
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
      // Робимо POST запит на бекенд для реєстрації
      const response = await registerApi(email, password, name);

      if (response.success && response.token && response.user) {
        // Зберігаємо сесію та перенаправляємо на /dashboard
        login(response.token, response.user);
      } else {
        setError('Не вдалося створити аккаунт. Спробуйте пізніше.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Помилка реєстрації. Можливо, цей користувач вже існує.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-semibold text-text-light">Create your account</h1>
        <p className="text-xs text-text-muted">Зареєструйтеся, щоб розпочати оптимізацію зображень</p>
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
