"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { WorkspaceStats } from "../dashboard/api";
import { createCheckoutSessionApi, getEnterpriseRequestStatusApi, EnterpriseRequestStatus } from "./api";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { EnterpriseRequestModal } from "./EnterpriseRequestModal";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: WorkspaceStats | null;
  onPlanUpdated?: () => void;
  isSubscriptionActive?: boolean;
}

export function UpgradePlanModal({ isOpen, onClose, stats, onPlanUpdated, isSubscriptionActive = false }: UpgradePlanModalProps) {
  const currentPlan = stats?.plan || 'FREE';
  const isProActive = currentPlan === 'PRO' && isSubscriptionActive;
  const [isLoadingPro, setIsLoadingPro] = useState(false);
  const [isEnterpriseModalOpen, setIsEnterpriseModalOpen] = useState(false);
  const [enterpriseStatus, setEnterpriseStatus] = useState<EnterpriseRequestStatus | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchEnterpriseStatus = async () => {
        setIsLoadingStatus(true);
        try {
          const status = await getEnterpriseRequestStatusApi();
          setEnterpriseStatus(status);
        } catch (error) {
          console.error("Failed to fetch enterprise request status:", error);
        } finally {
          setIsLoadingStatus(false);
        }
      };

      fetchEnterpriseStatus();
    }
  }, [isOpen]);

  const handleUpgradeToPro = async () => {
    setIsLoadingPro(true);
    try {
      const url = await createCheckoutSessionApi();
      if (url) {
        window.location.href = url;
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to initialize payment checkout');
    } finally {
      setIsLoadingPro(false);
    }
  };

  const handleEnterpriseSubmitted = async () => {
    try {
      const status = await getEnterpriseRequestStatusApi();
      setEnterpriseStatus(status);
    } catch (e) {
      console.error(e);
    }
  };

  const hasPendingEnterpriseRequest = 
    enterpriseStatus && (enterpriseStatus.status === 'PENDING' || enterpriseStatus.status === 'CONTACTED');

  const hasApprovedEnterpriseRequest = 
    enterpriseStatus && enterpriseStatus.status === 'APPROVED';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Choose a Plan"
        icon="lucide:zap"
        iconColor="text-yellow-400"
        iconBg="bg-yellow-400/15"
        maxWidth="max-w-4xl"
      >
        <div className="flex flex-col gap-6">
          <div className="text-center">
            <h3 className="text-text-light text-xl font-bold mb-2">
              Select the best option for your team
            </h3>
            <p className="text-text-muted text-sm">
              Get more storage, bandwidth, and image optimization limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FREE PLAN */}
            <div className={`border ${currentPlan === 'FREE' ? 'border-accent bg-accent/5' : 'border-border'} rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg`}>
              {currentPlan === 'FREE' && (
                <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider">
                  CURRENT
                </div>
              )}
              <div>
                <span className="text-text-light font-bold text-lg">Free</span>
                <p className="text-text-muted text-xs mt-1">For personal use and exploration</p>
              </div>
              <div className="text-3xl font-extrabold text-text-light mt-2">
                $0<span className="text-sm font-normal text-text-muted">/mo</span>
              </div>
              
              <hr className="border-border my-1" />

              <ul className="flex flex-col gap-2.5 flex-1">
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>1 GB storage</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>500 optimizations / mo</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>10 GB traffic / mo</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>7 days trash retention</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>Standard CDN speed</span>
                </li>
                <li className="text-xs text-text-muted/60 flex items-center gap-2 line-through">
                  <Icon icon="lucide:x" className="text-text-muted/40" width={14} />
                  <span>Watermarks & Webhooks</span>
                </li>
                <li className="text-xs text-text-muted/60 flex items-center gap-2 line-through">
                  <Icon icon="lucide:x" className="text-text-muted/40" width={14} />
                  <span>Custom domains & BYOS</span>
                </li>
              </ul>

              <Button
                variant="bordered"
                disabled
                className="w-full mt-4 justify-center"
              >
                {currentPlan === 'FREE' ? "Current Plan" : "Free Plan"}
              </Button>
            </div>

            {/* PRO PLAN */}
            <div className={`border ${currentPlan === 'PRO' ? 'border-accent bg-accent/5 ring-1 ring-accent/30' : 'border-border'} rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-accent`}>
              {currentPlan === 'PRO' && (
                <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider">
                  CURRENT
                </div>
              )}
              <div>
                <span className="text-text-light font-bold text-lg flex items-center gap-1.5">
                  Pro
                  <span className="bg-yellow-400/10 text-yellow-400 text-[10px] px-1.5 py-0.5 rounded font-medium">Popular</span>
                </span>
                <p className="text-text-muted text-xs mt-1">For professional designers & developers</p>
              </div>
              <div className="text-3xl font-extrabold text-text-light mt-2">
                $29<span className="text-sm font-normal text-text-muted">/mo</span>
              </div>

              <hr className="border-border my-1" />

              <ul className="flex flex-col gap-2.5 flex-1">
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span><strong>50 GB</strong> storage / 10K optims</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span><strong>500 GB</strong> traffic / mo</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span><strong>30 days</strong> trash retention</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>Text watermarks only</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>1 Domain & 5 Webhooks</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>Webhook delivery logs</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>High speed CDN priority (10Gbps)</span>
                </li>
              </ul>

              {isProActive ? (
                <Button variant="bordered" disabled className="w-full mt-4 justify-center">
                  Current Plan
                </Button>
              ) : currentPlan === 'ENTERPRISE' ? (
                <Button variant="bordered" disabled className="w-full mt-4 justify-center">
                  Manage via Portal
                </Button>
              ) : (
                <Button
                  variant="accent"
                  onClick={handleUpgradeToPro}
                  disabled={isLoadingPro}
                  className="w-full mt-4 justify-center"
                >
                  {isLoadingPro ? (
                    <>
                      <Icon icon="lucide:loader-2" className="animate-spin mr-1" width={16} />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:zap" className="mr-1" width={16} />
                      <span>Upgrade — $29/mo</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* ENTERPRISE PLAN */}
            <div className={`border ${currentPlan === 'ENTERPRISE' ? 'border-accent bg-accent/5 ring-1 ring-accent/30' : 'border-border'} rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-accent`}>
              {currentPlan === 'ENTERPRISE' && (
                <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg tracking-wider">
                  CURRENT
                </div>
              )}
              {hasApprovedEnterpriseRequest && (
                <div className="absolute top-0 right-0 bg-purple-600 text-white text-[9px] font-bold px-3 py-1 rounded-bl-lg tracking-wider uppercase">
                  APPROVED QUOTE
                </div>
              )}
              <div>
                <span className="text-text-light font-bold text-lg">Enterprise</span>
                <p className="text-text-muted text-xs mt-1">Scalable solutions for growing businesses</p>
              </div>
              <div className="text-3xl font-extrabold text-text-light mt-2">
                {hasApprovedEnterpriseRequest && enterpriseStatus?.approvedPrice
                  ? `$${enterpriseStatus.approvedPrice}`
                  : 'Custom'}
                {hasApprovedEnterpriseRequest && enterpriseStatus?.approvedPrice && (
                  <span className="text-sm font-normal text-text-muted">/mo</span>
                )}
              </div>

              <hr className="border-border my-1" />

              <ul className="flex flex-col gap-2.5 flex-1">
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span><strong>250 GB+</strong> storage / 100K+ optims</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span><strong>90 days</strong> trash retention</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>Text & Image watermarking</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>Webhook retry queue (DLQ)</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span>Premium CDN routing speed</span>
                </li>
                <li className="text-xs text-text-light flex items-center gap-2">
                  <Icon icon="lucide:check" className="text-emerald-500" width={14} />
                  <span className="text-indigo-400 font-semibold">Bring your own S3 storage (BYOS)</span>
                </li>
              </ul>

              {currentPlan === 'ENTERPRISE' ? (
                <div className="flex flex-col gap-2 w-full mt-4">
                  <Button variant="bordered" disabled className="w-full justify-center">
                    Current Plan
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => setIsEnterpriseModalOpen(true)}
                    className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white border-transparent py-2.5 cursor-pointer"
                  >
                    <Icon icon="lucide:refresh-cw" className="mr-1" width={16} />
                    <span>Request Limit Changes</span>
                  </Button>
                </div>
              ) : hasApprovedEnterpriseRequest ? (
                <div className="flex flex-col gap-2 w-full mt-2">
                  <Button
                    variant="accent"
                    onClick={() => {
                      if (enterpriseStatus?.stripePaymentLink) {
                        window.location.href = enterpriseStatus.stripePaymentLink;
                      }
                    }}
                    className="w-full justify-center bg-purple-600 hover:bg-purple-700 text-white border-transparent py-2.5 cursor-pointer"
                  >
                    <Icon icon="lucide:credit-card" className="mr-1" width={16} />
                    <span>Pay & Activate Custom Plan</span>
                  </Button>
                  <Button
                    variant="bordered"
                    onClick={() => setIsEnterpriseModalOpen(true)}
                    className="w-full justify-center text-xs text-text-muted hover:text-text-light border-border py-1.5 cursor-pointer"
                  >
                    <Icon icon="lucide:refresh-cw" className="mr-1" width={12} />
                    <span>Request Changes / Re-submit</span>
                  </Button>
                </div>
              ) : hasPendingEnterpriseRequest ? (
                <div className="flex flex-col gap-2 w-full mt-2">
                  <Button
                    variant="bordered"
                    disabled
                    className="w-full justify-center text-yellow-500 border-yellow-500/30 bg-yellow-500/5 py-2.5"
                  >
                    <Icon icon="lucide:clock" className="mr-1" width={16} />
                    <span>Request Pending</span>
                  </Button>
                  <Button
                    variant="bordered"
                    onClick={() => setIsEnterpriseModalOpen(true)}
                    className="w-full justify-center text-xs text-text-muted hover:text-text-light border-border py-1.5 cursor-pointer"
                  >
                    <Icon icon="lucide:refresh-cw" className="mr-1" width={12} />
                    <span>Change Requirements / Re-submit</span>
                  </Button>
                </div>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => setIsEnterpriseModalOpen(true)}
                  className="w-full mt-4 justify-center bg-indigo-600 hover:bg-indigo-700 text-white border-transparent cursor-pointer"
                >
                  <Icon icon="lucide:mail" className="mr-1" width={16} />
                  <span>Contact Sales</span>
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-border mt-2">
            <Button variant="bordered" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <EnterpriseRequestModal
        isOpen={isEnterpriseModalOpen}
        onClose={() => setIsEnterpriseModalOpen(false)}
        onSuccessSubmitted={handleEnterpriseSubmitted}
        stats={stats}
        enterpriseStatus={enterpriseStatus}
      />
    </>
  );
}
