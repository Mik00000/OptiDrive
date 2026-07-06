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
  getInvoiceHistoryApi,
  InvoiceItem,
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
  const [isCancelLoading, setIsCancelLoading] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isInvoiceLoading, setIsInvoiceLoading] = useState(false);
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

        // Перевіряємо статус останнього Enterprise запиту.
        // Якщо його схвалено (APPROVED) — автоматично відкриваємо модалку тарифів,
        // щоб показати юзеру схвалені ліміти та кнопку оплати.
        const { getEnterpriseRequestStatusApi } = await import('@/features/billing/api');
        const entStatus = await getEnterpriseRequestStatusApi();
        if (entStatus && entStatus.status === 'APPROVED') {
          setIsUpgradeModalOpen(true);
        }

        // Завантажуємо історію інвойсів
        setIsInvoiceLoading(true);
        try {
          const invoicesData = await getInvoiceHistoryApi();
          setInvoices(invoicesData);
        } catch (invErr) {
          console.error("Failed to load invoice history:", invErr);
        } finally {
          setIsInvoiceLoading(false);
        }
      } catch (e) {
        console.error("Failed to load initial billing or enterprise data:", e);
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
          const [statsData, billingData, invoicesData] = await Promise.all([
            getWorkspaceStatsApi(),
            getBillingStatusApi(),
            getInvoiceHistoryApi().catch(() => []),
          ]);
          setStats(statsData);
          setBillingStatus(billingData);
          setInvoices(invoicesData);
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

  const handleCancelRequest = async () => {
    if (!confirm("Are you sure you want to cancel your Enterprise request and revert this workspace back to the FREE plan?")) {
      return;
    }
    setIsCancelLoading(true);
    try {
      const { cancelEnterpriseRequestApi } = await import('@/features/billing/api');
      const response = await cancelEnterpriseRequestApi();
      if (response.success) {
        toast.success(response.message || "Reverted to FREE plan successfully!");
        // Re-fetch everything
        const [statsData, billingData] = await Promise.all([
          getWorkspaceStatsApi(),
          getBillingStatusApi(),
        ]);
        setStats(statsData);
        setBillingStatus(billingData);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel request and revert to FREE plan");
    } finally {
      setIsCancelLoading(false);
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
  const isEnterprise = stats?.plan === 'ENTERPRISE';
  const isPremium = isPro || isEnterprise;
  const isActive = billingStatus?.subscriptionStatus === 'active' || (isEnterprise && !billingStatus?.hasSubscription);
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

  const graceTimeLeft = getGracePeriodRemainingText();

  return (
    <section className="dashboard-page relative">
      <PageHeading title="Billing & Subscription" />



      {/* Banner: Subscription Cancelling */}
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
            {billingStatus?.hasStripeCustomer && (
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
            )}
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
              {isEnterprise && isActive ? (
                <span className="text-indigo-400 border-indigo-500/30 bg-indigo-500/20 h-fit rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  Enterprise
                </span>
              ) : isEnterprise && !isActive ? (
                <span className="h-fit rounded-full border border-orange-400/30 bg-orange-400/20 px-2.5 py-0.5 text-xs font-semibold text-orange-400 animate-pulse">
                  Enterprise Inactive
                </span>
              ) : isPro && isActive && !isCancelling ? (
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
              {isEnterprise
                ? 'Custom Enterprise pricing'
                : !isPro
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
                {isPremium ? 'Manage your subscription' : 'Need more limits?'}
              </span>
              <p className="text-text-muted text-sm">
                {isEnterprise
                  ? 'For any subscription changes or custom setups, please contact our support.'
                  : isPro
                    ? 'Change your card, cancel, or view invoices via Stripe.'
                    : 'Upgrade to a higher plan for custom limits and priority support.'}
              </p>
            </div>
            {isPremium ? (
              <div className="flex flex-wrap gap-2 w-full justify-start md:justify-end">
                {(isPro || isEnterprise) && (
                  <Button
                    variant="accent"
                    mobileBehavior="full-width"
                    className="md:w-auto whitespace-nowrap"
                    onClick={() => setIsUpgradeModalOpen(true)}
                  >
                    <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
                      <Icon icon="lucide:zap" width="100%" height="100%" />
                    </div>
                    <span>{isEnterprise ? (isActive ? 'Change Limits' : 'Pay & Activate Plan') : 'Upgrade Plan'}</span>
                  </Button>
                )}

                {isPremium && !isActive && (
                  <Button
                    variant="bordered"
                    mobileBehavior="full-width"
                    className="md:w-auto text-rose-500 border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 cursor-pointer whitespace-nowrap"
                    onClick={handleCancelRequest}
                    disabled={isCancelLoading}
                  >
                    {isCancelLoading ? (
                      <Icon icon="lucide:loader-2" className="animate-spin" width={16} />
                    ) : (
                      <Icon icon="lucide:x-circle" width={16} />
                    )}
                    <span className="ml-1.5">Cancel Request</span>
                  </Button>
                )}
              </div>
            ) : (
              <Button
                variant="accent"
                mobileBehavior="full-width"
                className="mt-2 md:mt-0 md:w-auto whitespace-nowrap"
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

        {/* Payment Method */}
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
            {isPremium && billingStatus?.hasStripeCustomer ? (
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
                      Click "Manage Billing" to update your card or view details.
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
            ) : isEnterprise ? (
              <div className="flex items-center gap-4 w-full">
                <div className="bg-bg border-border flex h-10 w-16 shrink-0 items-center justify-center rounded-lg border">
                  <Icon
                    icon="lucide:building-2"
                    width="24"
                    height="24px"
                    className="text-indigo-400"
                  ></Icon>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-text-light text-sm font-medium">
                    Corporate Invoicing
                  </span>
                  <span className="text-text-muted text-sm">
                    Your payments are handled manually via corporate custom invoices.
                  </span>
                </div>
              </div>
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

        {/* Subscription Details — для PRO та Enterprise юзерів */}
        {isPremium && billingStatus && (
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
                      {isEnterprise && !billingStatus.hasSubscription ? 'Active' : (billingStatus.subscriptionStatus || 'Unknown')}
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
                    {isEnterprise ? 'Custom Pricing' : '$29.00/mo'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Invoice History — показується лише якщо є хоча б один інвойс або якщо це преміум */}
        {isPremium && (
          <section className="border-border bg-card flex min-w-0 flex-1 flex-col rounded-2xl border">
            <div className="border-border flex flex-col gap-1 border-b p-5 md:p-6">
              <span className="text-text-light text-lg font-semibold">
                Invoice History
              </span>
              <p className="text-text-muted text-sm">
                View your recent payments and download invoice PDFs.
              </p>
            </div>
            <div className="p-5 md:p-6">
              {isInvoiceLoading ? (
                <div className="flex justify-center items-center py-6">
                  <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={24} />
                </div>
              ) : invoices.length === 0 ? (
                <div className="text-center text-text-muted py-6 text-sm">
                  No payment history found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-text-muted text-xs font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4">Invoice</th>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-text-light">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-bg/25 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium">{inv.number}</td>
                          <td className="py-3 px-4">
                            {new Date(inv.date * 1000).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 font-semibold">
                            {inv.amountPaid.toFixed(2)} {inv.currency}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              inv.status === 'paid'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                                : inv.status === 'open'
                                ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                                : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2">
                              {inv.pdfUrl && (
                                <a
                                  href={inv.pdfUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-bg/50 hover:bg-bg hover:text-accent text-xs font-medium transition-colors"
                                >
                                  <Icon icon="lucide:download" width={12} />
                                  <span>PDF</span>
                                </a>
                              )}
                              {inv.hostedInvoiceUrl && (
                                <a
                                  href={inv.hostedInvoiceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-border bg-bg/50 hover:bg-bg hover:text-accent text-xs font-medium transition-colors"
                                >
                                  <Icon icon="lucide:external-link" width={12} />
                                  <span>View</span>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      <UpgradePlanModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        stats={stats}
        isSubscriptionActive={isActive}
      />
    </section>
  );
};

export default BillingAndSubscriptionsPage;

