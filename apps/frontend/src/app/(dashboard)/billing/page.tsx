'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import { Icon } from '@iconify/react';
import { UpgradePlanModal } from '@/features/billing/UpgradePlanModal';
import { getWorkspaceStatsApi, WorkspaceStats } from '@/features/dashboard/api';
import {
  getBillingStatusApi,
  createPortalSessionApi,
  BillingStatus,
} from '@/features/billing/api';
import { toast } from 'react-toastify';
import { useSearchParams } from 'next/navigation';

const BillingAndSubscriptionsPage = () => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(
    null,
  );
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, billingData] = await Promise.all([
          getWorkspaceStatsApi(),
          getBillingStatusApi(),
        ]);
        setStats(statsData);
        setBillingStatus(billingData);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  // Обробка повернення з Stripe Checkout
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'success') {
      toast.success(
        'Payment successful! Your workspace is now on the PRO plan.',
      );
      // Перезавантажуємо дані
      const refresh = async () => {
        try {
          const [statsData, billingData] = await Promise.all([
            getWorkspaceStatsApi(),
            getBillingStatusApi(),
          ]);
          setStats(statsData);
          setBillingStatus(billingData);
        } catch (e) {
          console.error(e);
        }
      };
      refresh();
      // Очищуємо URL від query params
      window.history.replaceState({}, '', '/billing');
    } else if (status === 'cancelled') {
      toast.info('Checkout was cancelled.');
      window.history.replaceState({}, '', '/billing');
    }
  }, [searchParams]);

  const handleManageBilling = async () => {
    setIsPortalLoading(true);
    try {
      const url = await createPortalSessionApi();
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to open billing portal');
    } finally {
      setIsPortalLoading(false);
    }
  };

  const bytesToGB = (bytes?: string | number) =>
    bytes ? (Number(bytes) / (1024 * 1024 * 1024)).toFixed(2) : '0.00';
  const percentage = stats
    ? Math.min(
        100,
        Math.round(
          (Number(stats.storageUsed) / Number(stats.limits.storageBytes)) * 100,
        ),
      )
    : 0;

  const isPro = stats?.plan === 'PRO';
  const isActive = billingStatus?.subscriptionStatus === 'active';
  const isPastDue = billingStatus?.subscriptionStatus === 'past_due';
  const isCancelling = isActive && billingStatus?.cancelAtPeriodEnd === true;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };


  return (
    <section className="dashboard-page relative">
      <PageHeading title="Billing & Subscription" />

      {/* Банер: платіж прострочено (past_due) */}
      {isPastDue && (
        <div className="mx-4 mt-2 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 lg:mx-8">
          <Icon icon="lucide:alert-triangle" className="mt-0.5 shrink-0 text-amber-400" width={18} />
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-300">Payment overdue — action required</p>
              <p className="text-xs text-amber-400/80">
                Your last payment failed. Stripe will retry automatically. Update your card to avoid losing PRO access.
              </p>
            </div>
            <Button
              variant="bordered"
              className="mt-2 shrink-0 border-amber-500/40 text-amber-300 hover:border-amber-400 hover:bg-amber-400/10 sm:mt-0"
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
          </div>
        </div>
      )}

      {/* Банер: підписка буде скасована в кінці періоду (cancel_at_period_end) */}
      {isCancelling && (
        <div className="mx-4 mt-2 flex items-start gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4 lg:mx-8">
          <Icon icon="lucide:clock" className="mt-0.5 shrink-0 text-orange-400" width={18} />
          <div className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-orange-300">Subscription cancellation scheduled</p>
              <p className="text-xs text-orange-400/80">
                Your PRO plan will be cancelled on{' '}
                <strong className="text-orange-300">{formatDate(billingStatus?.currentPeriodEnd ?? null)}</strong>.
                {' '}After that, your workspace will be downgraded to FREE.
              </p>
            </div>
            <Button
              variant="bordered"
              className="mt-2 shrink-0 border-orange-500/40 text-orange-300 hover:border-orange-400 hover:bg-orange-400/10 sm:mt-0"
              onClick={handleManageBilling}
              disabled={isPortalLoading}
            >
              {isPortalLoading ? (
                <Icon icon="lucide:loader-2" className="animate-spin" width={14} />
              ) : (
                <Icon icon="lucide:refresh-cw" width={14} />
              )}
              <span className="ml-1.5 text-xs">Resume Subscription</span>
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6 p-4 pb-8 lg:p-8 lg:pb-8">
        {/* Current Plan */}
        <section className="border-border bg-card flex min-w-0 flex-1 flex-col gap-6 rounded-2xl border p-5 md:flex-row md:gap-3 md:p-6.25">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-2 md:mb-1">
              <span className="text-text-light text-xl font-semibold capitalize">
                {stats ? stats.plan.toLowerCase() : 'Loading...'} Plan
              </span>
              {isPro && isActive && !isCancelling ? (
                <span className="text-accent border-accent/30 bg-accent/20 h-fit rounded-full border px-2 py-0.5 text-xs font-medium">
                  Active
                </span>
              ) : isPro && isCancelling ? (
                <span className="h-fit rounded-full border border-orange-400/30 bg-orange-400/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                  Cancelling
                </span>
              ) : isPro && isPastDue ? (
                <span className="h-fit rounded-full border border-amber-400/30 bg-amber-400/20 px-2 py-0.5 text-xs font-medium text-amber-400">
                  Past Due
                </span>
              ) : isPro ? (
                <span className="h-fit rounded-full border border-orange-400/30 bg-orange-400/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                  {billingStatus?.subscriptionStatus || 'Inactive'}
                </span>
              ) : (
                <span className="text-text-muted border-border bg-bg h-fit rounded-full border px-2 py-0.5 text-xs font-medium">
                  Free
                </span>
              )}
            </div>
            <span className="text-text-muted mb-6 flex text-base">
              {!isPro
                ? 'Free forever'
                : isCancelling
                  ? `Cancels on ${formatDate(billingStatus?.currentPeriodEnd ?? null)} • No further charges`
                  : `$29/mo billed monthly${billingStatus?.currentPeriodEnd ? ` • Renews ${formatDate(billingStatus.currentPeriodEnd)}` : ''}`}
            </span>
            <div className="bg-bg border-border flex flex-col justify-between gap-3 rounded-xl border p-4">
              <div className="flex w-full justify-between">
                <span className="text-text-light text-sm">Storage Used</span>
                <span className="text-text-muted text-sm font-medium">
                  {bytesToGB(stats?.storageUsed)} GB /{' '}
                  {bytesToGB(stats?.limits?.storageBytes)} GB used
                </span>
              </div>
              <div className="border-border h-2 w-full rounded-full border">
                <div
                  className="bg-chart-gradient h-full rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-text-muted flex justify-between text-xs">
                <span>Resets on the 1st of every month</span>
                <span>{percentage}% Used</span>
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-start justify-between gap-4 text-start md:items-end md:gap-2 md:text-end">
            <div className="flex w-full flex-col gap-1 md:w-auto">
              <span className="text-text-light text-sm">
                {isPro ? 'Manage your subscription' : 'Need more limits?'}
              </span>
              <p className="text-text-muted text-sm">
                {isPro
                  ? 'Change your card, cancel, or view invoices via Stripe.'
                  : 'Upgrade to a higher plan for custom limits and priority support.'}
              </p>
            </div>
            {isPro ? (
              <Button
                variant="bordered"
                mobileBehavior="full-width"
                className="mt-2 md:mt-0 md:w-auto"
                onClick={handleManageBilling}
                disabled={isPortalLoading}
              >
                {isPortalLoading ? (
                  <>
                    <Icon
                      icon="lucide:loader-2"
                      className="animate-spin"
                      width={16}
                    />
                    <span>Opening...</span>
                  </>
                ) : (
                  <>
                    <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
                      <Icon icon="lucide:settings" width="100%" height="100%" />
                    </div>
                    <span>Manage Billing</span>
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="accent"
                mobileBehavior="full-width"
                className="mt-2 md:mt-0 md:w-auto"
                onClick={() => setIsUpgradeModalOpen(true)}
              >
                <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
                  <Icon icon="lucide:zap" width="100%" height="100%" />
                </div>
                <span>Upgrade Plan</span>
              </Button>
            )}
          </div>
        </section>

        {/* Payment Method — тепер показує реальний статус або кнопку Manage */}
        <section className="border-border bg-card flex min-w-0 flex-1 flex-col rounded-2xl border">
          <div className="border-border flex flex-col gap-1 border-b p-5 md:p-6">
            <span className="text-text-light text-lg font-semibold">
              Payment Method
            </span>
            <p className="text-text-muted text-sm">
              Manage your billing information and credit cards.
            </p>
          </div>
          <div className="border-border flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:gap-2 md:p-6">
            {isPro && billingStatus?.hasStripeCustomer ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="bg-bg border-border flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border">
                    <Icon
                      icon="lucide:credit-card"
                      width="24"
                      height="24px"
                    ></Icon>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-text-light text-sm font-medium">
                        Managed via Stripe
                      </span>
                      <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase">
                        CONNECTED
                      </span>
                    </div>
                    <span className="text-text-muted text-sm">
                      Click "Manage Billing" to update your card or view
                      details.
                    </span>
                  </div>
                </div>
                <Button
                  variant="bordered"
                  mobileBehavior="full-width"
                  className="md:w-auto"
                  onClick={handleManageBilling}
                  disabled={isPortalLoading}
                >
                  Manage
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div className="bg-bg border-border flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border">
                  <Icon
                    icon="lucide:credit-card"
                    width="24"
                    height="24px"
                  ></Icon>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-text-light text-sm font-medium">
                    No payment method
                  </span>
                  <span className="text-text-muted text-sm">
                    Upgrade to PRO to add a payment method.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Subscription Details — для PRO юзерів */}
        {isPro && billingStatus && (
          <section className="border-border bg-card flex min-w-0 flex-1 flex-col rounded-2xl border">
            <div className="border-border flex flex-col gap-1 border-b p-5 md:p-6">
              <span className="text-text-light text-lg font-semibold">
                Subscription Details
              </span>
              <p className="text-text-muted text-sm">
                Information about your active subscription.
              </p>
            </div>
            <div className="flex flex-col gap-4 p-5 md:p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="bg-bg border-border flex flex-col gap-1 rounded-xl border p-4">
                  <span className="text-text-muted text-xs font-medium tracking-wide uppercase">
                    Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-orange-400'}`}
                    ></span>
                    <span className="text-text-light font-semibold capitalize">
                      {billingStatus.subscriptionStatus || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="bg-bg border-border flex flex-col gap-1 rounded-xl border p-4">
                  <span className="text-text-muted text-xs font-medium tracking-wide uppercase">
                    Current Period Ends
                  </span>
                  <span className="text-text-light font-semibold">
                    {formatDate(billingStatus.currentPeriodEnd)}
                  </span>
                </div>
                <div className="bg-bg border-border flex flex-col gap-1 rounded-xl border p-4">
                  <span className="text-text-muted text-xs font-medium tracking-wide uppercase">
                    Monthly Cost
                  </span>
                  <span className="text-text-light font-semibold">
                    $29.00/mo
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        stats={stats}
      />
    </section>
  );
};

export default BillingAndSubscriptionsPage;
