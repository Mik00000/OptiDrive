"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import { Icon } from '@iconify/react';
import { UpgradePlanModal } from '@/features/billing/UpgradePlanModal';
import { UpdatePaymentModal } from '@/features/billing/UpdatePaymentModal';
import { getWorkspaceStatsApi, WorkspaceStats } from '@/features/dashboard/api';
import { toast } from 'react-toastify';

const MOCK_INVOICES = [
  { id: 'INV-2023-10-01', date: 'Oct 1, 2023', amount: '$29.00', status: 'Paid' },
  { id: 'INV-2023-09-01', date: 'Sep 1, 2023', amount: '$29.00', status: 'Paid' },
  { id: 'INV-2023-08-01', date: 'Aug 1, 2023', amount: '$29.00', status: 'Paid' },
];

const BillingAndSubscriptionsPage = () => {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isUpdatePaymentModalOpen, setIsUpdatePaymentModalOpen] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getWorkspaceStatsApi();
        setStats(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchStats();
  }, []);

  const bytesToGB = (bytes?: string | number) => bytes ? (Number(bytes) / (1024 * 1024 * 1024)).toFixed(2) : '0.00';
  const percentage = stats ? Math.min(100, Math.round((Number(stats.storageUsed) / Number(stats.limits.storageBytes)) * 100)) : 0;

  return (
    <section className="dashboard-page relative">
      <PageHeading title="Billing & Subscription" />
      <div className="flex flex-col gap-6 p-4 pb-8 lg:p-8 lg:pb-8">
        <section className="border-border bg-card flex min-w-0 flex-1 flex-col md:flex-row gap-6 md:gap-3 rounded-2xl border p-5 md:p-6.25">
          <div className="flex-1">
            <div className="mb-3 md:mb-1 flex items-center gap-2">
              <span className="text-text-light text-xl font-semibold capitalize">
                {stats ? stats.plan.toLowerCase() : 'Loading...'} Plan
              </span>
              <span className="text-accent border-accent/30 bg-accent/20 h-fit rounded-full border px-2 py-0.5 text-xs font-medium">
                Active
              </span>
            </div>
            <span className="text-text-muted mb-6 flex text-base">
              {stats?.plan === 'FREE' ? 'Free forever' : stats?.plan === 'PRO' ? '$29/mo billed monthly' : 'Custom pricing'}
            </span>
            <div className="bg-bg border-border flex flex-col justify-between gap-3 rounded-xl border p-4">
              <div className="flex w-full justify-between">
                <span className="text-text-light text-sm">Storage Used</span>
                <span className="text-text-muted text-sm font-medium">
                  {bytesToGB(stats?.storageUsed)} GB / {bytesToGB(stats?.limits?.storageBytes)} GB used
                </span>
              </div>
              <div className="border-border h-2 w-full rounded-full border">
                <div 
                  className="bg-chart-gradient h-full rounded-full transition-all duration-500" 
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="text-text-muted text-xs flex justify-between">
                <span>Resets on the 1st of every month</span>
                <span>{percentage}% Used</span>
              </span>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-start md:items-end justify-between gap-4 md:gap-2 text-start md:text-end">
            <div className="flex flex-col gap-1 w-full md:w-auto">
              <span className="text-text-light text-sm">
                Need more limits?
              </span>
              <p className="text-text-muted text-sm">
                Upgrade to a higher plan for custom limits and priority support.
              </p>
            </div>
            <Button variant="accent" mobileBehavior="full-width" className="md:w-auto mt-2 md:mt-0" onClick={() => setIsUpgradeModalOpen(true)}>
              <div className="inline-flex h-5 w-5 items-center justify-center sm:h-4 sm:w-4">
                <Icon icon="lucide:zap" width="100%" height="100%" />
              </div>
              <span>Upgrade Plan</span>
            </Button>
          </div>
        </section>

        <section className="border-border bg-card flex min-w-0 flex-1 flex-col rounded-2xl border">
          <div className="border-border flex flex-col gap-1 border-b p-5 md:p-6">
            <span className="text-text-light text-lg font-semibold">Payment Method</span>
            <p className="text-text-muted text-sm">
              Manage your billing information and credit cards.
            </p>
          </div>
          <div className="border-border flex flex-col md:flex-row gap-4 md:gap-2 md:justify-between p-5 md:p-6 md:items-center">
            <div className='flex gap-4 items-center'>
              <div className="bg-bg border border-border flex h-10 w-16 shrink-0 items-center justify-center rounded-lg">
                <Icon icon="lucide:credit-card" width="24" height="24px"></Icon>
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-text-light font-medium text-sm">
                    Visa ending in 4242
                  </span>
                  <span className="py-0.5 text-[10px] font-bold uppercase text-text-muted bg-bg border border-border px-1.5 rounded-md">
                    DEFAULT
                  </span>
                </div>
                <span className="text-text-muted text-sm">
                  Expires 12/2025
                </span>
              </div>
            </div>
            <Button variant='bordered' mobileBehavior="full-width" className="md:w-auto" onClick={() => setIsUpdatePaymentModalOpen(true)}>Update</Button>
          </div>
        </section>

        <section className="border-border bg-card flex min-w-0 flex-1 flex-col rounded-2xl border">
          <div className="border-border flex flex-col gap-1 border-b p-5 md:p-6">
            <span className="text-text-light text-lg font-semibold">Billing History</span>
            <p className="text-text-muted text-sm">
              View and download your previous invoices.
            </p>
          </div>
          
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-border text-text-muted border-b text-xs font-medium">
                  <th className="px-6 py-4 font-normal">Date</th>
                  <th className="px-6 py-4 font-normal">Invoice ID</th>
                  <th className="px-6 py-4 font-normal">Amount</th>
                  <th className="px-6 py-4 font-normal">Status</th>
                  <th className="px-6 py-4 text-right font-normal">Action</th>
                </tr>
              </thead>
              <tbody className="text-text-light divide-border divide-y text-sm">
                {MOCK_INVOICES.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 text-text-muted">{invoice.date}</td>
                    <td className="px-6 py-4 font-mono text-xs font-semibold">{invoice.id}</td>
                    <td className="px-6 py-4 font-medium">{invoice.amount}</td>
                    <td className="px-6 py-4">
                      {invoice.status === 'Paid' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        className="text-text-muted hover:text-text-light cursor-pointer p-1.5 align-middle opacity-70 transition-colors hover:opacity-100 hover:scale-110 "
                        onClick={() => toast.info(`Downloading ${invoice.id}...`)}
                      >
                        <Icon icon="lucide:download" width={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col divide-y divide-border/50 md:hidden">
            {MOCK_INVOICES.map((invoice) => (
              <div key={invoice.id} className="flex gap-4 p-5 hover:bg-slate-700/30 transition-colors">
                <div className="flex-1 flex flex-col gap-2 justify-center">
                  <div className="flex justify-between items-center">
                    <span className="text-text-light font-semibold">{invoice.date}</span>
                    <span className="text-text-light font-medium">{invoice.amount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-mono text-xs">{invoice.id}</span>
                    {invoice.status === 'Paid' ? (
                      <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[11px] font-medium text-orange-400">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <button 
                    className="flex items-center justify-center w-12 h-12 rounded-xl text-text-muted hover:text-text-light hover:bg-white/5 transition-colors active:scale-95"
                    onClick={() => toast.info(`Downloading ${invoice.id}...`)}
                  >
                    <Icon icon="lucide:download" width={22} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      
      <UpgradePlanModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} stats={stats} />
      <UpdatePaymentModal isOpen={isUpdatePaymentModalOpen} onClose={() => setIsUpdatePaymentModalOpen(false)} />
    </section>
  );
};

export default BillingAndSubscriptionsPage;
