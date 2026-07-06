"use client";

import React, { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/Button";
import { Input } from "@/components/Inputs";
import { createEnterpriseRequestApi, EnterpriseRequestStatus } from "./api";
import { WorkspaceStats } from "../dashboard/api";
import { toast } from "react-toastify";
import { useAuth } from "@/contexts/AuthContext";

interface EnterpriseRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessSubmitted?: () => void;
  stats?: WorkspaceStats | null;
  enterpriseStatus?: EnterpriseRequestStatus | null;
}

export function EnterpriseRequestModal({
  isOpen,
  onClose,
  onSuccessSubmitted,
  stats,
  enterpriseStatus,
}: EnterpriseRequestModalProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    contactName: "",
    contactEmail: "",
    companyName: "",
    expectedStorage: "",
    expectedTraffic: "",
    expectedOptimizations: "",
    teamSize: "",
    message: "",
  });

  useEffect(() => {
    if (isOpen) {
      let storage = "";
      let traffic = "";
      let optimizations = "";

      // 1. Пріоритет 1: Схвалені ліміти з останнього запиту
      if (enterpriseStatus) {
        if (enterpriseStatus.approvedStorageGb) {
          storage = `${enterpriseStatus.approvedStorageGb} GB`;
        }
        if (enterpriseStatus.approvedBandwidthGb) {
          const gb = enterpriseStatus.approvedBandwidthGb;
          traffic = gb >= 1024 ? `${(gb / 1024).toFixed(0)} TB` : `${gb} GB`;
        }
        if (enterpriseStatus.approvedOptimizations) {
          optimizations = enterpriseStatus.approvedOptimizations.toLocaleString();
        }
      }

      // 2. Пріоритет 2: Поточні ліміти воркспейсу (якщо порожньо)
      if (!storage && stats?.limits?.storageBytes) {
        const gb = Math.round(Number(stats.limits.storageBytes) / (1024 * 1024 * 1024));
        storage = gb >= 1024 ? `${(gb / 1024).toFixed(0)} TB` : `${gb} GB`;
      }
      if (!traffic && stats?.limits?.bandwidthBytes) {
        const gb = Math.round(Number(stats.limits.bandwidthBytes) / (1024 * 1024 * 1024));
        traffic = gb >= 1024 ? `${(gb / 1024).toFixed(0)} TB` : `${gb} GB`;
      }
      if (!optimizations && stats?.limits?.monthlyOptimizations) {
        optimizations = stats.limits.monthlyOptimizations.toLocaleString();
      }

      setFormData((prev) => ({
        ...prev,
        contactName: prev.contactName || user?.name || "",
        contactEmail: prev.contactEmail || user?.email || "",
        expectedStorage: prev.expectedStorage || storage,
        expectedTraffic: prev.expectedTraffic || traffic,
        expectedOptimizations: prev.expectedOptimizations || optimizations,
      }));
    }
  }, [isOpen, user, stats, enterpriseStatus]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.contactName.trim() ||
      !formData.contactEmail.trim() ||
      !formData.expectedStorage.trim() ||
      !formData.expectedTraffic.trim()
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await createEnterpriseRequestApi({
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim(),
        companyName: formData.companyName.trim() || undefined,
        expectedStorage: formData.expectedStorage.trim(),
        expectedTraffic: formData.expectedTraffic.trim(),
        expectedOptimizations: formData.expectedOptimizations.trim() || undefined,
        teamSize: formData.teamSize.trim() || undefined,
        message: formData.message.trim() || undefined,
      });

      if (response.success) {
        toast.success(
          "Your request has been submitted! Our team will contact you shortly."
        );
        if (onSuccessSubmitted) {
          onSuccessSubmitted();
        }
        onClose();
        setFormData({
          contactName: user?.name || "",
          contactEmail: user?.email || "",
          companyName: "",
          expectedStorage: "",
          expectedTraffic: "",
          expectedOptimizations: "",
          teamSize: "",
          message: "",
        });
      }
    } catch (error: any) {
      const errMsg =
        error.response?.data?.error ||
        error.message ||
        "Failed to submit request.";
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Enterprise Plan"
      icon="lucide:building-2"
      iconColor="text-indigo-400"
      iconBg="bg-indigo-400/15"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <h3 className="text-text-light text-base font-bold mb-1">
            Tell us about your requirements
          </h3>
          <p className="text-text-muted text-xs">
            Please specify your expected storage and traffic volumes. We will calculate a custom quote tailored for your business.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">
              Contact Name *
            </label>
            <Input
              name="contactName"
              placeholder="e.g., Alex Johnson"
              value={formData.contactName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">
              Contact Email *
            </label>
            <Input
              type="email"
              name="contactEmail"
              placeholder="e.g., alex@company.com"
              value={formData.contactEmail}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">
              Company Name
            </label>
            <Input
              name="companyName"
              placeholder="e.g., OptiDrive Inc"
              value={formData.companyName}
              onChange={handleChange}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">
              Team Size
            </label>
            <Input
              name="teamSize"
              placeholder="e.g., 25 people"
              value={formData.teamSize}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">
              Expected Storage *
            </label>
            <Input
              name="expectedStorage"
              placeholder="e.g., 500 GB"
              value={formData.expectedStorage}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">
              Monthly Traffic *
            </label>
            <Input
              name="expectedTraffic"
              placeholder="e.g., 2 TB"
              value={formData.expectedTraffic}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-text-light text-xs font-semibold">
              Monthly Optimizations
            </label>
            <Input
              name="expectedOptimizations"
              placeholder="e.g., 100k or 1M"
              value={formData.expectedOptimizations}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-text-light text-xs font-semibold">
            Additional Requirements or Message
          </label>
          <textarea
            name="message"
            placeholder="Tell us about any specific needs (e.g., custom S3 integration, dedicated domains, custom SLAs)..."
            value={formData.message}
            onChange={handleChange}
            className="px-3 py-2 w-full rounded-xl border border-slate-700 bg-bg text-text-light placeholder:text-text-muted text-sm outline-none focus:border-accent transition-all duration-200 resize-none min-h-[80px]"
          />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border mt-2">
          <Button
            type="button"
            variant="bordered"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Icon
                  icon="lucide:loader-2"
                  className="animate-spin mr-1"
                  width={16}
                />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Icon icon="lucide:send" className="mr-1" width={16} />
                <span>Submit Request</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
