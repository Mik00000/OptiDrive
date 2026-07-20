"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';
import Switch from '@/components/Switch';
import { Icon } from '@iconify/react';
import { getUserNotificationsApi, updateUserNotificationsApi } from '../api';
import { getUsageAlertSettingsApi, updateUsageAlertSettingsApi, UsageAlertSettings } from '@/features/billing/api';
import Slider from '@/components/Slider';

export const NotificationsTab = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // States
  const [emailWeeklySummary, setEmailWeeklySummary] = useState(true);
  const [emailQuotaWarnings, setEmailQuotaWarnings] = useState(true);
  const [emailSecurityAlerts, setEmailSecurityAlerts] = useState(true);
  const [emailBillingAlerts, setEmailBillingAlerts] = useState(true);

  const [alertsSettings, setAlertsSettings] = useState<UsageAlertSettings | null>(null);
  const [isAlertsSaving, setIsAlertsSaving] = useState(false);
  const isFirstMount = useRef(true);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setIsLoading(true);
        const [notifData, alertsData] = await Promise.all([
          getUserNotificationsApi(),
          getUsageAlertSettingsApi().catch(() => null)
        ]);

        setEmailWeeklySummary(notifData.emailWeeklySummary);
        setEmailQuotaWarnings(notifData.emailQuotaWarnings);
        setEmailSecurityAlerts(notifData.emailSecurityAlerts);
        setEmailBillingAlerts(notifData.emailBillingAlerts);

        if (alertsData) {
          setAlertsSettings(alertsData);
        }
      } catch (error) {
        console.error('Failed to fetch notification preferences:', error);
        showFeedback('Failed to load notification settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  // Debounce saving settings to prevent spamming the backend
  useEffect(() => {
    if (!alertsSettings) return;

    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      setIsAlertsSaving(true);
      try {
        await updateUsageAlertSettingsApi(alertsSettings);
      } catch (err: any) {
        showFeedback(err.message || 'Failed to update alert settings.', 'error');
      } finally {
        setIsAlertsSaving(false);
      }
    }, 800); // 800ms debounce

    return () => clearTimeout(timer);
  }, [alertsSettings]);

  const handleToggleAlertField = (field: 'storageAlertsEnabled' | 'bandwidthAlertsEnabled' | 'optimizationsAlertsEnabled', value: boolean) => {
    setAlertsSettings((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleThresholdChange = (field: 'storageWarningThreshold' | 'bandwidthWarningThreshold' | 'optimizationsWarningThreshold', value: number) => {
    setAlertsSettings((prev) => prev ? { ...prev, [field]: value } : null);
  };

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

      {alertsSettings && (
        <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
          {/* Header */}
          <div className="flex items-center justify-between border-border border-b px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-1">
              <span className="text-text-light text-lg font-semibold">
                Usage Alerts Settings
              </span>
              <p className="text-text-muted text-sm mt-1">
                Configure warning thresholds when you want to receive email alerts for resource limits.
              </p>
            </div>
            {isAlertsSaving && (
              <span className="text-xs text-accent font-medium flex items-center gap-1.5 bg-accent/10 border border-accent/25 rounded-full px-2.5 py-1 shrink-0">
                <Icon icon="lucide:loader-2" className="animate-spin" width={12} height={12} />
                Saving...
              </span>
            )}
          </div>

          {/* Content */}
          <div className="flex flex-col p-4 sm:p-6 gap-6 divide-y divide-border/40 text-sm text-text-light">
            {/* Storage Alerts */}
            <div className="flex flex-col gap-4 pt-1">
              <div className="flex items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-text-light font-medium flex items-center gap-2">
                    <Icon icon="lucide:database" className="text-accent" width={16} />
                    Storage Limit warning
                  </span>
                  <p className="text-text-muted text-xs leading-normal">
                    Send warning when disk space usage reaches the threshold.
                  </p>
                </div>
                <Switch
                  initialChecked={alertsSettings.storageAlertsEnabled}
                  onChange={(checked) => handleToggleAlertField('storageAlertsEnabled', checked)}
                />
              </div>
              
              {alertsSettings.storageAlertsEnabled && (
                <div className="bg-bg/40 border border-border/60 rounded-xl p-4 flex flex-col gap-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <span>Warning Threshold</span>
                      <div className="group relative cursor-pointer flex items-center">
                        <Icon icon="lucide:info" width={12} className="text-text-muted hover:text-text-light transition-colors" />
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-bg-dark border border-border p-2 text-[10px] font-medium leading-normal text-text-light opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                          Alerts are triggered before reaching 100% to give you time to manage limits.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="10"
                        max="95"
                        value={alertsSettings.storageWarningThreshold}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleThresholdChange('storageWarningThreshold', isNaN(val) ? 10 : val);
                        }}
                        onBlur={(e) => {
                          const val = Math.max(10, Math.min(95, Number(e.target.value) || 10));
                          handleThresholdChange('storageWarningThreshold', val);
                        }}
                        className="w-14 px-1.5 py-0.5 bg-bg-dark border border-border rounded text-center text-text-light font-mono text-xs font-semibold outline-none focus:border-accent"
                      />
                      <span className="text-text-muted text-xs font-medium">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-muted font-semibold font-mono">10%</span>
                    <Slider
                      min={10}
                      max={95}
                      value={alertsSettings.storageWarningThreshold}
                      onChange={(val) => handleThresholdChange('storageWarningThreshold', val)}
                    />
                    <span className="text-[10px] text-text-muted font-semibold font-mono">95%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bandwidth Alerts */}
            <div className="flex flex-col gap-4 pt-5">
              <div className="flex items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-text-light font-medium flex items-center gap-2">
                    <Icon icon="lucide:activity" className="text-amber-500" width={16} />
                    Traffic / Bandwidth warning
                  </span>
                  <p className="text-text-muted text-xs leading-normal">
                    Send warning when monthly bandwidth consumption reaches the threshold.
                  </p>
                </div>
                <Switch
                  initialChecked={alertsSettings.bandwidthAlertsEnabled}
                  onChange={(checked) => handleToggleAlertField('bandwidthAlertsEnabled', checked)}
                />
              </div>

              {alertsSettings.bandwidthAlertsEnabled && (
                <div className="bg-bg/40 border border-border/60 rounded-xl p-4 flex flex-col gap-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <span>Warning Threshold</span>
                      <div className="group relative cursor-pointer flex items-center">
                        <Icon icon="lucide:info" width={12} className="text-text-muted hover:text-text-light transition-colors" />
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-bg-dark border border-border p-2 text-[10px] font-medium leading-normal text-text-light opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                          Alerts are triggered before reaching 100% to give you time to manage limits.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="10"
                        max="95"
                        value={alertsSettings.bandwidthWarningThreshold}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleThresholdChange('bandwidthWarningThreshold', isNaN(val) ? 10 : val);
                        }}
                        onBlur={(e) => {
                          const val = Math.max(10, Math.min(95, Number(e.target.value) || 10));
                          handleThresholdChange('bandwidthWarningThreshold', val);
                        }}
                        className="w-14 px-1.5 py-0.5 bg-bg-dark border border-border rounded text-center text-text-light font-mono text-xs font-semibold outline-none focus:border-accent"
                      />
                      <span className="text-text-muted text-xs font-medium">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-muted font-semibold font-mono">10%</span>
                    <Slider
                      min={10}
                      max={95}
                      value={alertsSettings.bandwidthWarningThreshold}
                      onChange={(val) => handleThresholdChange('bandwidthWarningThreshold', val)}
                    />
                    <span className="text-[10px] text-text-muted font-semibold font-mono">95%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Optimizations Alerts */}
            <div className="flex flex-col gap-4 pt-5 pb-1">
              <div className="flex items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-text-light font-medium flex items-center gap-2">
                    <Icon icon="lucide:zap" className="text-purple-500" width={16} />
                    Optimizations Quota warning
                  </span>
                  <p className="text-text-muted text-xs leading-normal">
                    Send warning when monthly optimizations quota usage reaches the threshold.
                  </p>
                </div>
                <Switch
                  initialChecked={alertsSettings.optimizationsAlertsEnabled}
                  onChange={(checked) => handleToggleAlertField('optimizationsAlertsEnabled', checked)}
                />
              </div>

              {alertsSettings.optimizationsAlertsEnabled && (
                <div className="bg-bg/40 border border-border/60 rounded-xl p-4 flex flex-col gap-2 mt-1 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <div className="flex items-center gap-1.5 text-text-muted">
                      <span>Warning Threshold</span>
                      <div className="group relative cursor-pointer flex items-center">
                        <Icon icon="lucide:info" width={12} className="text-text-muted hover:text-text-light transition-colors" />
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded bg-bg-dark border border-border p-2 text-[10px] font-medium leading-normal text-text-light opacity-0 shadow-lg transition-opacity group-hover:opacity-100 z-50">
                          Alerts are triggered before reaching 100% to give you time to manage limits.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="10"
                        max="95"
                        value={alertsSettings.optimizationsWarningThreshold}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          handleThresholdChange('optimizationsWarningThreshold', isNaN(val) ? 10 : val);
                        }}
                        onBlur={(e) => {
                          const val = Math.max(10, Math.min(95, Number(e.target.value) || 10));
                          handleThresholdChange('optimizationsWarningThreshold', val);
                        }}
                        className="w-14 px-1.5 py-0.5 bg-bg-dark border border-border rounded text-center text-text-light font-mono text-xs font-semibold outline-none focus:border-accent"
                      />
                      <span className="text-text-muted text-xs font-medium">%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-text-muted font-semibold font-mono">10%</span>
                    <Slider
                      min={10}
                      max={95}
                      value={alertsSettings.optimizationsWarningThreshold}
                      onChange={(val) => handleThresholdChange('optimizationsWarningThreshold', val)}
                    />
                    <span className="text-[10px] text-text-muted font-semibold font-mono">95%</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
