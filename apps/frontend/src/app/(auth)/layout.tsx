"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { Icon } from '@iconify/react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-light">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={40} height={40} />
          <span className="text-sm font-medium text-text-muted">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bg p-4 overflow-hidden">
      {/* Легкий абстрактний градієнтний фон для преміального дизайну */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-accent/10 blur-[120px]" />
      
      <div className="z-10 flex w-full max-w-[400px] flex-col gap-6">
        {/* Логотип */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5">
            <Image src="/images/logo.svg" alt="OptiDrive Logo" width={40} height={40} priority />
            <span className="text-2xl font-bold tracking-tight text-text-light">OptiDrive</span>
          </div>
          <p className="text-sm text-text-muted">Smart Image Compression Service</p>
        </div>

        {/* Картка авторизації */}
        <div className="rounded-2xl border border-border bg-sidebar p-8 shadow-xl shadow-black/20">
          {children}
        </div>
      </div>
    </div>
  );
}
