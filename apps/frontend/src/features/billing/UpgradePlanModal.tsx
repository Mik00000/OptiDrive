"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradePlanModal({ isOpen, onClose }: UpgradePlanModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Plan"
      icon="lucide:zap"
      iconColor="text-yellow-400"
      iconBg="bg-yellow-400/15"
      maxWidth="max-w-lg"
    >
      <div className="flex flex-col gap-6">
        <div className="text-center">
          <h3 className="text-text-light text-lg font-bold mb-2">
            Upgrade to Enterprise
          </h3>
          <p className="text-text-muted text-sm">
            Get more bandwidth, priority support, and custom limits for your business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-border rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group hover:border-accent transition-colors cursor-pointer">
            <span className="text-text-light font-semibold">Pro Plan</span>
            <span className="text-text-muted text-sm">Current Plan</span>
            <div className="mt-2 text-xl font-bold text-text-light">$29<span className="text-sm font-normal text-text-muted">/mo</span></div>
          </div>

          <div className="border border-accent bg-accent/5 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden cursor-pointer">
            <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
              RECOMMENDED
            </div>
            <span className="text-text-light font-semibold">Enterprise</span>
            <span className="text-text-muted text-sm">For large teams</span>
            <div className="mt-2 text-xl font-bold text-text-light">Custom<span className="text-sm font-normal text-text-muted">/mo</span></div>
          </div>
        </div>

        <ul className="flex flex-col gap-3">
          {['Unlimited CDN Bandwidth', 'Dedicated Manager', '99.99% SLA', 'Custom Upload Limits'].map((feature, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-text-light">
              <Icon icon="lucide:check-circle-2" className="text-accent" width={18} />
              {feature}
            </li>
          ))}
        </ul>

        <div className="flex gap-3 pt-2">
          <Button variant="bordered" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button variant="accent" onClick={onClose} className="flex-1">
            Contact Us
          </Button>
        </div>
      </div>
    </Modal>
  );
}
