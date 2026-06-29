"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/Button';
import Switch from '@/components/Switch';
import { Webhook } from './types';

interface WebhookTableProps {
  webhooks: Webhook[];
  onEdit: (webhook: Webhook) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  isTesting: string | null;
  onViewDeliveries: (webhook: Webhook) => void;
  onToggleActive: (id: string, active: boolean) => void;
  emptySlot: React.ReactNode;
}

export const WebhookTable = ({
  webhooks,
  onEdit,
  onDelete,
  onTest,
  isTesting,
  onViewDeliveries,
  onToggleActive,
  emptySlot
}: WebhookTableProps) => {
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleRevealSecret = (id: string) => {
    setRevealedSecrets(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopySecret = (id: string, secret: string) => {
    navigator.clipboard.writeText(secret).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (webhooks.length === 0) {
    return <>{emptySlot}</>;
  }

  return (
    <div className="hidden lg:block overflow-hidden rounded-2xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-table-header/35 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <th className="px-6 py-4.5">Name</th>
              <th className="px-6 py-4.5">Endpoint URL</th>
              <th className="px-6 py-4.5">Secret Key</th>
              <th className="px-6 py-4.5">Events</th>
              <th className="px-6 py-4.5">Status</th>
              <th className="px-6 py-4.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm text-text-secondary">
            {webhooks.map((webhook) => {
              const isRevealed = !!revealedSecrets[webhook.id];
              const isCopied = copiedId === webhook.id;
              const testing = isTesting === webhook.id;

              return (
                <tr key={webhook.id} className="transition-colors hover:bg-hover-bg/35">
                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-text">
                    {webhook.name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs max-w-[220px] truncate text-text-secondary">
                    {webhook.url}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-secondary">
                        {isRevealed ? webhook.secret : '••••••••••••••••••••••••••••'}
                      </span>
                      <button
                        onClick={() => toggleRevealSecret(webhook.id)}
                        className="text-text-muted hover:text-text transition-colors p-1"
                        title={isRevealed ? 'Hide secret' : 'Show secret'}
                      >
                        <Icon icon={isRevealed ? 'lucide:eye-off' : 'lucide:eye'} width={16} />
                      </button>
                      {isRevealed && (
                        <button
                          onClick={() => handleCopySecret(webhook.id, webhook.secret)}
                          className="text-text-muted hover:text-accent transition-colors p-1"
                          title="Copy secret"
                        >
                          <Icon icon={isCopied ? 'lucide:check' : 'lucide:copy'} className={isCopied ? 'text-success' : ''} width={16} />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="inline-flex items-center rounded-lg bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent border border-accent/15"
                        >
                          {event}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Switch
                      initialChecked={webhook.isActive}
                      onChange={(checked) => onToggleActive(webhook.id, checked)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="bordered"
                        onClick={() => onViewDeliveries(webhook)}
                        title="View delivery history"
                      >
                        <Icon icon="lucide:history" width={16} />
                        <span className="ml-1.5 hidden xl:inline">Logs</span>
                      </Button>
                      <Button
                        variant="bordered"
                        onClick={() => onTest(webhook.id)}
                        disabled={testing || !webhook.isActive}
                        title="Send test request"
                      >
                        {testing ? (
                          <Icon icon="lucide:loader-2" className="animate-spin" width={16} />
                        ) : (
                          <Icon icon="lucide:play" width={16} />
                        )}
                        <span className="ml-1.5 hidden xl:inline">Test</span>
                      </Button>
                      <Button
                        variant="bordered"
                        onClick={() => onEdit(webhook)}
                        title="Edit"
                      >
                        <Icon icon="lucide:edit" width={16} />
                      </Button>
                      <Button
                        variant="bordered"
                        className="hover:!border-error hover:!text-error"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this webhook?')) {
                            onDelete(webhook.id);
                          }
                        }}
                        title="Delete"
                      >
                        <Icon icon="lucide:trash-2" width={16} />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
