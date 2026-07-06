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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
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

          {children}
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
