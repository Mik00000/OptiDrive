"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Icon } from '@iconify/react';
import { InvitationManager } from '@/components/InvitationManager';
import { UpgradePlanModal } from '@/features/billing/UpgradePlanModal';
import { WorkspaceStats } from '@/features/dashboard/api';
import { BillingStatus } from '@/features/billing/api';
import { Button } from '@/components/Button';
import { twMerge } from 'tailwind-merge';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, workspaces, user } = useAuth();
  const activeWorkspace = workspaces.find(w => w.id === user?.workspaceId) || workspaces[0];
  const router = useRouter();
  const pathname = usePathname();

  // Стани для глобального показу модалки схваленого Enterprise
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [hasDismissedGlobally, setHasDismissedGlobally] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const fetchBillingAndApproval = async () => {
      try {
        const { getBillingStatusApi, getEnterpriseRequestStatusApi } = await import('@/features/billing/api');

        const [billingData, entStatus] = await Promise.all([
          getBillingStatusApi().catch(() => null),
          getEnterpriseRequestStatusApi().catch(() => null),
        ]);

        setBillingStatus(billingData);

        if (entStatus && entStatus.status === 'APPROVED') {
          // Якщо ми на сторінці /billing — там працює своя модалка, тому тут нічого не робимо
          if (pathname === '/billing') {
            return;
          }

          // Перевіряємо чи пройшло достатньо часу з моменту останнього закриття
          const dismissedAt = localStorage.getItem('enterprise_approved_dismissed_at');
          const fiveMinutes = 5 * 60 * 1000;
          const isTimePassed = !dismissedAt || (Date.now() - Number(dismissedAt) > fiveMinutes);

          if (!hasDismissedGlobally && isTimePassed) {
            const { getWorkspaceStatsApi } = await import('@/features/dashboard/api');
            const statsData = await getWorkspaceStatsApi().catch(() => null);
            setStats(statsData);
            setIsUpgradeModalOpen(true);
          }
        }
      } catch (err) {
        console.error('Failed to check enterprise status globally:', err);
      }
    };

    fetchBillingAndApproval();
  }, [isAuthenticated, isLoading, pathname, hasDismissedGlobally]);

  const handleCloseGlobalModal = () => {
    setHasDismissedGlobally(true);
    localStorage.setItem('enterprise_approved_dismissed_at', Date.now().toString());
    setIsUpgradeModalOpen(false);
  };

  const handleManageBilling = async () => {
    setIsPortalLoading(true);
    try {
      const { createPortalSessionApi } = await import('@/features/billing/api');
      const url = await createPortalSessionApi();
      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      console.error('Error starting billing portal:', err);
    } finally {
      setIsPortalLoading(false);
    }
  };

  const getGracePeriodRemainingText = () => {
    if (!billingStatus?.gracePeriodStartedAt) return '';
    const startedAt = new Date(billingStatus.gracePeriodStartedAt).getTime();
    const limit = 3 * 24 * 60 * 60 * 1000; // 3 days
    const timeLeft = startedAt + limit - Date.now();
    if (timeLeft <= 0) return 'Expired';
    const hoursLeft = Math.ceil(timeLeft / (1000 * 60 * 60));
    if (hoursLeft > 24) {
      return `${Math.ceil(hoursLeft / 24)} days`;
    }
    return `${hoursLeft} hours`;
  };

  const isPastDue = billingStatus?.subscriptionStatus === 'past_due';
  const graceTimeLeft = getGracePeriodRemainingText();
  const isLockedPage = activeWorkspace?.isLocked && pathname !== '/billing' && pathname !== '/settings/project';

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
        <main className="flex flex-1 flex-col w-full min-w-0 xl:h-full xl:overflow-y-auto relative">
          <Header className="md:hidden" />

          {/* Banner: Payment Past Due */}
          {isPastDue && (
            <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 lg:mx-8">
              <Icon icon="lucide:alert-triangle" className="mt-0.5 shrink-0 text-amber-400" width={18} />
              <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-amber-300">Payment overdue — action required</p>
                  <p className="text-xs text-amber-400/80">
                    {graceTimeLeft === 'Expired'
                      ? 'Your grace period has expired. Your premium limits are temporarily suspended.'
                      : `Your last payment failed. Grace period active: you have ${graceTimeLeft} to update your card before premium features are suspended.`}
                  </p>
                </div>
                {billingStatus?.hasStripeCustomer && (
                  <Button
                    variant="bordered"
                    className="mt-2 shrink-0 border-amber-500/40 text-amber-300 hover:border-amber-400 hover:bg-amber-400/10 sm:mt-0 whitespace-nowrap"
                    onClick={handleManageBilling}
                    disabled={isPortalLoading}
                  >
                    {isPortalLoading ? (
                      <Icon icon="lucide:loader-2" className="animate-spin" width={14} />
                    ) : (
                      <Icon icon="lucide:credit-card" width={14} />
                    )}
                    <span className="ml-1.5 text-xs">Update Payment Method</span>
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className={twMerge(
            "flex-1 flex flex-col min-h-0",
            isLockedPage && "blur-[6px] pointer-events-none select-none transition-all duration-200"
          )}>
            {children}
          </div>

          {isLockedPage && (
            <div className="absolute inset-0 z-45 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900/90 p-6 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400 mb-4 mx-auto shadow-inner">
                  <Icon icon="lucide:lock" width={28} height={28} />
                </div>
                <h3 className="text-lg font-bold text-text-light">Workspace is Locked</h3>
                <p className="text-sm text-text-muted mt-2.5 leading-relaxed">
                  This workspace has been frozen because you have exceeded the limit of **1 active FREE workspace** per account.
                </p>
                <p className="text-xs text-text-muted/70 mt-1.5">
                  To restore access, you can either upgrade this workspace or delete it/your other free workspace.
                </p>
                <div className="flex flex-col gap-2.5 mt-6">
                  <Button
                    variant="primary"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white w-full py-2.5 flex items-center justify-center"
                    onClick={() => router.push('/billing')}
                  >
                    <Icon icon="lucide:credit-card" width={16} height={16} />
                    <span className="ml-2 font-medium">Upgrade to PRO</span>
                  </Button>
                  <Button
                    variant="bordered"
                    className="border-slate-700 text-text-light hover:bg-slate-800 hover:border-slate-600 w-full py-2.5 flex items-center justify-center"
                    onClick={() => router.push('/settings/project')}
                  >
                    <Icon icon="lucide:trash-2" width={16} height={16} />
                    <span className="ml-2 font-medium">Delete Workspace</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
          <InvitationManager />
        </main>
      </div>

      {isUpgradeModalOpen && (
        <UpgradePlanModal
          isOpen={isUpgradeModalOpen}
          onClose={handleCloseGlobalModal}
          stats={stats}
          isSubscriptionActive={billingStatus?.subscriptionStatus === 'active'}
        />
      )}
    </SidebarProvider>
  );
}
