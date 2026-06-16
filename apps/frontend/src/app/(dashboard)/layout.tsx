"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Icon } from '@iconify/react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-light">
        <div className="flex flex-col items-center gap-3">
          <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={40} height={40} />
          <span className="text-sm font-medium text-text-muted">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen xl:h-screen xl:overflow-hidden">
        <Sidebar />
        <main className="flex flex-1 flex-col w-full min-w-0 xl:h-full xl:overflow-y-auto">
          <Header className="md:hidden" />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
