"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Icon } from '@iconify/react';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingNav() {
  const { isAuthenticated } = useAuth();

  return (
    <nav className="w-full px-6 md:px-16 py-5 flex items-center justify-between border-b border-border bg-sidebar z-50 sticky top-0">
      {/* Логотип */}
      <Link href="/" className="flex items-center gap-2.5 cursor-pointer">
        <Image src="/images/logo.svg" alt="OptiDrive Logo" width={32} height={32} />
        <span className="font-headings font-bold text-lg text-text-light tracking-tight">OptiDrive</span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        <Link href="/#features" className="text-sm text-text-muted hover:text-text-light transition-colors font-medium">Features</Link>
        <Link href="/pricing" className="text-sm text-text-muted hover:text-text-light transition-colors font-medium">Pricing</Link>
        <Link href="/api-docs" className="text-sm text-text-muted hover:text-text-light transition-colors font-medium">Documentation</Link>
        <Link href="/#developer" className="text-sm text-text-muted hover:text-text-light transition-colors font-medium">API</Link>
      </div>

      {/* Кнопки дій */}
      <div className="flex items-center gap-3">
        {isAuthenticated ? (
          <Link href="/dashboard">
            <button className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-text-light text-sm font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer">
              <span>Dashboard</span>
              <Icon icon="lucide:arrow-right" width={14} height={14} />
            </button>
          </Link>
        ) : (
          <>
            <Link href="/login" className="text-sm font-medium text-text-muted hover:text-text-light transition-colors px-4 py-2 cursor-pointer">
              Log in
            </Link>
            <Link href="/register">
              <button className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-text-light text-sm font-medium px-5 py-2.5 rounded-lg transition-colors cursor-pointer">
                <span>Start for Free</span>
                <Icon icon="lucide:arrow-right" width={14} height={14} />
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
