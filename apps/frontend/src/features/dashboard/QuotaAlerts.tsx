"use client";

import { useState, useEffect } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
import { getWorkspaceStatsApi, WorkspaceStats } from './api';

interface QuotaAlertsProps {
  stats?: WorkspaceStats | null;
}

interface AlertItem {
  id: string;
  type: 'critical' | 'warning';
  title: string;
  description: string;
  icon: string;
  dismissible: boolean;
}

export default function QuotaAlerts({ stats: propStats }: QuotaAlertsProps) {
  const [stats, setStats] = useState<WorkspaceStats | null>(propStats || null);
  const [dismissed, setDismissed] = useState<string[]>([]);

  // Завантажуємо приховані ліміти з localStorage при старті
  useEffect(() => {
    try {
      const saved = localStorage.getItem('optidrive_dismissed_alerts');
      if (saved) {
        setDismissed(JSON.parse(saved));
      }
    } catch (e) {
      console.error('[QuotaAlerts] Error loading dismissed alerts:', e);
    }
  }, []);

  useEffect(() => {
    if (propStats) {
      setStats(propStats);
    } else {
      const fetchStats = async () => {
        try {
          const data = await getWorkspaceStatsApi();
          setStats(data);
        } catch (e) {
          console.error('[QuotaAlerts] Failed to fetch stats:', e);
        }
      };
      fetchStats();
    }
  }, [propStats]);

  const handleDismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem('optidrive_dismissed_alerts', JSON.stringify(next));
    } catch (e) {
      console.error('[QuotaAlerts] Error saving dismissed alerts:', e);
    }
  };

  // Розрахунок відсотків використання лімітів воркспейсу
  const storagePercent = stats ? Math.round((Number(stats.storageUsed) / Number(stats.limits.storageBytes)) * 100) : 0;
  const bandwidthPercent = stats ? Math.round((Number(stats.bandwidthUsed) / Number(stats.limits.bandwidthBytes)) * 100) : 0;
  const optimizationPercent = stats ? Math.round((stats.monthlyOptimizations / stats.limits.monthlyOptimizations) * 100) : 0;
  const apiKeysPercent = stats ? Math.round((stats.activeApiKeys / stats.limits.maxApiKeys) * 100) : 0;

  const rawAlerts: AlertItem[] = [];

  if (stats) {
    // 1. Перевірка сховища (Storage)
    if (storagePercent >= 100) {
      rawAlerts.push({
        id: 'storage_critical',
        type: 'critical',
        title: 'Storage Limit Exhausted (100% Used)',
        description: 'You have used all available storage. Image compression and uploads are now blocked. Clean up files or upgrade your plan to restore access.',
        icon: 'lucide:database-backup',
        dismissible: false
      });
    } else if (storagePercent >= 80) {
      rawAlerts.push({
        id: 'storage_warning',
        type: 'warning',
        title: `Storage Running Low (${storagePercent}% Used)`,
        description: `You are approaching your storage limit. Currently using ${(Number(stats.storageUsed) / (1024 * 1024 * 1024)).toFixed(2)} GB of ${(Number(stats.limits.storageBytes) / (1024 * 1024 * 1024)).toFixed(2)} GB.`,
        icon: 'lucide:database',
        dismissible: true
      });
    }

    // 2. Перевірка пропускної здатності (Bandwidth)
    if (bandwidthPercent >= 100) {
      rawAlerts.push({
        id: 'bandwidth_critical',
        type: 'critical',
        title: 'Bandwidth Limit Exhausted (100% Used)',
        description: 'Monthly bandwidth is completely used. CDN assets download and proxying are locked. Service will be restored next month, or you can upgrade.',
        icon: 'lucide:zap-off',
        dismissible: false
      });
    } else if (bandwidthPercent >= 80) {
      rawAlerts.push({
        id: 'bandwidth_warning',
        type: 'warning',
        title: `Bandwidth Usage High (${bandwidthPercent}% Used)`,
        description: `Your monthly bandwidth consumption is high: ${(Number(stats.bandwidthUsed) / (1024 * 1024 * 1024)).toFixed(2)} GB used. Upgrade your plan to prevent CDN delivery blocks.`,
        icon: 'lucide:zap',
        dismissible: true
      });
    }

    // 3. Перевірка ліміту оптимізацій (Optimizations)
    if (optimizationPercent >= 100) {
      rawAlerts.push({
        id: 'optimizations_critical',
        type: 'critical',
        title: 'Optimizations Limit Exhausted (100% Used)',
        description: 'You have reached the maximum number of monthly optimizations. Further compressions are disabled until next month or plan upgrade.',
        icon: 'lucide:image-minus',
        dismissible: false
      });
    } else if (optimizationPercent >= 80) {
      rawAlerts.push({
        id: 'optimizations_warning',
        type: 'warning',
        title: `Optimization Limit Nearing (${optimizationPercent}% Used)`,
        description: `You have optimized ${stats.monthlyOptimizations} of ${stats.limits.monthlyOptimizations} images. You will not be able to compress new images once this limit is reached.`,
        icon: 'lucide:image',
        dismissible: true
      });
    }

    // 4. Перевірка ліміту API-ключів (API Keys)
    if (apiKeysPercent >= 100) {
      rawAlerts.push({
        id: 'api_keys_limit',
        type: 'warning',
        title: 'API Keys Limit Reached',
        description: `You are using ${stats.activeApiKeys} of ${stats.limits.maxApiKeys} API Keys allowed on your plan. Revoke an old key to create a new one.`,
        icon: 'lucide:key-round',
        dismissible: true
      });
    }
  }

  // Синхронізуємо та очищуємо приховані ліміти, якщо користувач вийшов з ліміту
  const activeIdsStr = rawAlerts.map(a => a.id).join(',');
  useEffect(() => {
    const currentActiveIds = activeIdsStr.split(',').filter(Boolean);
    const stillDismissed = dismissed.filter(id => currentActiveIds.includes(id));
    
    if (stillDismissed.length !== dismissed.length) {
      setDismissed(stillDismissed);
      try {
        localStorage.setItem('optidrive_dismissed_alerts', JSON.stringify(stillDismissed));
      } catch (e) {
        console.error('[QuotaAlerts] Error updating dismissed list:', e);
      }
    }
  }, [activeIdsStr, dismissed]);

  // Фільтруємо приховані сповіщення
  const visibleAlerts = rawAlerts.filter(a => !dismissed.includes(a.id));

  if (!stats || visibleAlerts.length === 0) {
    return null;
  }

  // Якщо активних сповіщень 2 або більше, показуємо компактну версію
  if (visibleAlerts.length >= 2) {
    return (
      <div className="border-border bg-card/40 backdrop-blur-md rounded-2xl border p-4.5 shadow-lg flex flex-col gap-3 w-full mb-2">
        <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
          <div className="flex items-center gap-2">
            <Icon icon="lucide:alert-circle" className="text-amber-400 shrink-0" width={18} height={18} />
            <span className="text-sm font-semibold text-text-light">
              Plan Limit Notifications ({visibleAlerts.length})
            </span>
          </div>
          <Link
            href="/billing"
            className="text-xs font-semibold text-accent hover:brightness-140 hover:underline transition-all"
          >
            Upgrade Plan &rarr;
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {visibleAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between gap-4 px-3 py-2 rounded-xl border text-xs transition-all duration-300 ${
                alert.type === 'critical'
                  ? 'border-red-500/25 bg-red-500/5 text-red-300'
                  : 'border-amber-500/25 bg-amber-500/5 text-amber-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {alert.type === 'critical' ? (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                )}
                <span className="font-semibold shrink-0">{alert.title}</span>
                <span className="text-text-muted truncate hidden sm:inline">&mdash;</span>
                <span className="text-text-muted truncate max-w-[500px]">{alert.description}</span>
              </div>
              {alert.dismissible && (
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="text-text-muted hover:text-text-light transition-colors p-1"
                  title="Dismiss alert"
                >
                  <Icon icon="lucide:x" width={14} height={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Якщо активне лише 1 сповіщення, показуємо великий детальний блок
  const singleAlert = visibleAlerts[0];
  return (
    <div className="flex flex-col gap-4 w-full mb-2">
      <div
        className={`flex items-start gap-4 p-4.5 pr-12 rounded-2xl border transition-all duration-300 relative ${
          singleAlert.type === 'critical'
            ? 'border-red-500/25 bg-red-500/10 text-text-light shadow-lg shadow-red-500/5 animate-pulse-subtle'
            : 'border-amber-500/25 bg-amber-500/10 text-text-light shadow-lg shadow-amber-500/5'
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            singleAlert.type === 'critical'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-amber-500/20 text-amber-400'
          }`}
        >
          <Icon icon={singleAlert.icon} width={22} height={22} />
        </div>

        <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold flex items-center gap-2">
              {singleAlert.type === 'critical' ? (
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-amber-500" />
              )}
              {singleAlert.title}
            </span>
            <p className="text-xs text-text-muted leading-relaxed max-w-2xl mt-1">
              {singleAlert.description}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/billing"
              className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all border text-center ${
                singleAlert.type === 'critical'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30'
              }`}
            >
              Upgrade Plan
            </Link>
          </div>
        </div>

        {singleAlert.dismissible && (
          <button
            onClick={() => handleDismiss(singleAlert.id)}
            className="absolute top-3.5 right-3 text-text-muted hover:text-text-light hover:bg-white/5 transition-all p-2 rounded-xl flex items-center justify-center"
            title="Dismiss alert"
          >
            <Icon icon="lucide:x" width={18} height={18} />
          </button>
        )}
      </div>
    </div>
  );
}
