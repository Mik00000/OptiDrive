"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { WorkspaceStats } from "../dashboard/api";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: WorkspaceStats | null;
}

export function UpgradePlanModal({ isOpen, onClose, stats }: UpgradePlanModalProps) {
  const currentPlan = stats?.plan || 'FREE';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Plan"
      icon="lucide:zap"
      iconColor="text-yellow-400"
      iconBg="bg-yellow-400/15"
      maxWidth="max-w-3xl"
    >
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h3 className="text-text-light text-lg font-bold mb-2">
            Choose the Right Plan for You
          </h3>
          <p className="text-text-muted text-sm">
            Unlock more storage, optimizations, and bandwidth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`border ${currentPlan === 'FREE' ? 'border-accent bg-accent/5' : 'border-border'} rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-colors`}>
            {currentPlan === 'FREE' && <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">ACTIVE</div>}
            <span className="text-text-light font-semibold">Free</span>
            <div className="mt-2 text-xl font-bold text-text-light">$0<span className="text-sm font-normal text-text-muted">/mo</span></div>
            <ul className="flex flex-col gap-2 mt-2">
              <li className="text-xs text-text-muted">1 GB Storage</li>
              <li className="text-xs text-text-muted">500 Optimizations</li>
              <li className="text-xs text-text-muted">10 GB Bandwidth</li>
              <li className="text-xs text-text-muted">1 API Key</li>
            </ul>
          </div>

          <div className={`border ${currentPlan === 'PRO' ? 'border-accent bg-accent/5' : 'border-border'} rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-colors hover:border-accent cursor-pointer`}>
            {currentPlan === 'PRO' && <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">ACTIVE</div>}
            <span className="text-text-light font-semibold">Pro</span>
            <div className="mt-2 text-xl font-bold text-text-light">$29<span className="text-sm font-normal text-text-muted">/mo</span></div>
            <ul className="flex flex-col gap-2 mt-2">
              <li className="text-xs text-text-light">50 GB Storage</li>
              <li className="text-xs text-text-light">10,000 Optimizations</li>
              <li className="text-xs text-text-light">500 GB Bandwidth</li>
              <li className="text-xs text-text-light">5 API Keys</li>
            </ul>
          </div>

          <div className={`border ${currentPlan === 'ENTERPRISE' ? 'border-accent bg-accent/5' : 'border-border'} rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-colors hover:border-accent cursor-pointer`}>
            {currentPlan === 'ENTERPRISE' && <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">ACTIVE</div>}
            <span className="text-text-light font-semibold">Enterprise</span>
            <div className="mt-2 text-xl font-bold text-text-light">Custom</div>
            <ul className="flex flex-col gap-2 mt-2">
              <li className="text-xs text-text-light">250 GB+ Storage</li>
              <li className="text-xs text-text-light">100,000+ Optimizations</li>
              <li className="text-xs text-text-light">2 TB+ Bandwidth</li>
              <li className="text-xs text-text-light">50 API Keys</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="bordered" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="accent" onClick={onClose} className="flex-1">
            Change Plan
          </Button>
        </div>
      </div>
    </Modal>
  );
}
