"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  const isAdmin = user?.email === 'mikjarkov@gmail.com' || user?.email?.endsWith('@optidrive.app') || user?.email === 'admin@optidrive.app';

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login?returnTo=/admin');
      } else if (!isAdmin) {
        // Redirect standard users back to main dashboard
        router.push('/dashboard');
      } else {
        setChecking(false);
      }
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  if (isLoading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-text-light">
        <div className="flex flex-col items-center gap-4">
          <Icon icon="lucide:shield-alert" className="animate-pulse text-accent" width={48} height={48} />
          <span className="text-sm font-semibold tracking-wide text-text-muted">Verifying Credentials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-[#090d16] text-text-light font-sans overflow-x-hidden">
      {/* Sidebar for Admin Console */}
      <aside className="w-64 border-r border-slate-800 bg-[#0c1220] flex flex-col shrink-0">
        {/* Title */}
        <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-2.5">
          <div className="size-8 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Icon icon="lucide:shield" width={16} className="text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-headings font-bold text-sm text-text-light tracking-wide">OptiDrive</span>
            <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-widest leading-none">Admin Console</span>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="size-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-text-light">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-text-light truncate">{user?.name || 'Administrator'}</span>
            <span className="text-[10px] text-text-muted truncate">{user?.email}</span>
          </div>
        </div>

        {/* Back Link */}
        <div className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900/50 hover:bg-slate-800 text-xs font-semibold text-text-muted hover:text-text-light transition-all cursor-pointer">
            <Icon icon="lucide:arrow-left" width={14} />
            <span>Workspace Panel</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Admin Header */}
        <header className="h-16 px-6 border-b border-slate-800 bg-[#0c1220]/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
              <span className="size-1.5 rounded-full bg-indigo-400 animate-ping" />
              Secure Root Session
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <Link href="/" target="_blank" className="text-xs text-text-muted hover:text-text-light transition-colors flex items-center gap-1.5">
              <span>View Landing</span>
              <Icon icon="lucide:external-link" width={12} />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
