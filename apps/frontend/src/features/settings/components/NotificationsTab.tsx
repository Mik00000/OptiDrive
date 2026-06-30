"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import Switch from '@/components/Switch';
import { Icon } from '@iconify/react';
import { getUserNotificationsApi, updateUserNotificationsApi, UserNotificationPreferences } from '../api';

export const NotificationsTab = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // States
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(true);
  const [emailQuotaWarnings, setEmailQuotaWarnings] = useState(true);
  const [emailSecurityAlerts, setEmailSecurityAlerts] = useState(true);
  const [emailBillingAlerts, setEmailBillingAlerts] = useState(true);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const data = await getUserNotificationsApi();
        setEmailWeeklySummary(data.emailWeeklySummary);
        setEmailQuotaWarnings(data.emailQuotaWarnings);
        setEmailSecurityAlerts(data.emailSecurityAlerts);
        setEmailBillingAlerts(data.emailBillingAlerts);
      } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
        showFeedback('Failed to load notification settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateUserNotificationsApi({
        emailWeeklySummary,
        emailQuotaWarnings,
        emailSecurityAlerts,
        emailBillingAlerts
      });
      showFeedback('Notification preferences saved successfully');
    } catch (error: any) {
      console.error('Failed to save notification preferences:', error);
      showFeedback(error?.message || 'Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={32} />
      </div>
    );
  }

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        
        {/* Header */}
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Notification Preferences
          </span>
          <p className="text-text-muted text-sm mt-1">
            Choose how and when you want to receive email alerts from OptiDrive.
          </p>
        </div>
        
        {/* Content */}
        <div className="flex flex-col p-4 sm:p-6 gap-6 divide-y divide-border/40">
          
          {/* Weekly Summary */}
          <div className="flex items-start sm:items-center justify-between gap-4 pt-1">
            <div className="flex flex-col gap-1">
              <span className="text-text-light font-medium flex items-center gap-2">
                <Icon icon="lucide:mail" className="text-accent" width={16} />
                Weekly Usage Summary
              </span>
              <p className="text-text-muted text-xs leading-normal">
                Receive weekly stats reporting your bandwidth savings, optimized storage size, and resource consumption details.
              </p>
            </div>
            <Switch
              initialChecked={emailWeeklySummary}
              onChange={setEmailWeeklySummary}
            />
          </div>

          {/* Quota Warnings */}
          <div className="flex items-start sm:items-center justify-between gap-4 pt-5">
            <div className="flex flex-col gap-1">
              <span className="text-text-light font-medium flex items-center gap-2">
                <Icon icon="lucide:alert-triangle" className="text-amber-500" width={16} />
                Quota & Limit Warnings
              </span>
              <p className="text-text-muted text-xs leading-normal">
                Get notified as soon as your workspace hits 80% or 100% of its storage capacity, monthly optimizations, or bandwidth allocations.
              </p>
            </div>
            <Switch
              initialChecked={emailQuotaWarnings}
              onChange={setEmailQuotaWarnings}
            />
          </div>

          {/* Security Alerts */}
          <div className="flex items-start sm:items-center justify-between gap-4 pt-5">
            <div className="flex flex-col gap-1">
              <span className="text-text-light font-medium flex items-center gap-2">
                <Icon icon="lucide:shield-check" className="text-emerald-500" width={16} />
                Security & Workspace Activity
              </span>
              <p className="text-text-muted text-xs leading-normal">
                Receive security alerts regarding key actions like new API keys creation, role updates, and members invitation/removal.
              </p>
            </div>
            <Switch
              initialChecked={emailSecurityAlerts}
              onChange={setEmailSecurityAlerts}
            />
          </div>

          {/* Billing Alerts */}
          <div className="flex items-start sm:items-center justify-between gap-4 pt-5 pb-1">
            <div className="flex flex-col gap-1">
              <span className="text-text-light font-medium flex items-center gap-2">
                <Icon icon="lucide:credit-card" className="text-purple-500" width={16} />
                Billing Invoices & receipts
              </span>
              <p className="text-text-muted text-xs leading-normal">
                Receive monthly subscription invoices, successful payment receipts, and warning emails regarding failed transactions.
              </p>
            </div>
            <Switch
              initialChecked={emailBillingAlerts}
              onChange={setEmailBillingAlerts}
            />
          </div>

        </div>
        
        {/* Footer */}
        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6 border-t border-border">
          <Button 
            variant="accent" 
            className="w-full sm:w-auto justify-center min-w-[140px]"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <Icon icon="lucide:loader-2" className="animate-spin" width={18} />
            ) : (
              'Save Preferences'
            )}
          </Button>
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-4 duration-300`}>
          <Icon icon={feedback.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} />
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
