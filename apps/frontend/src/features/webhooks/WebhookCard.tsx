"use client";

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/Button';
import Switch from '@/components/Switch';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Webhook } from './types';

interface WebhookCardProps {
  webhook: Webhook;
  onEdit: (webhook: Webhook) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  isTesting: string | null;
  onViewDeliveries: (webhook: Webhook) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

export function WebhookCard({
  webhook,
  onEdit,
  onDelete,
  onTest,
  isTesting,
  onViewDeliveries,
  onToggleActive
}: WebhookCardProps) {
  const [revealSecret, setRevealSecret] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const testing = isTesting === webhook.id;

  const handleCopySecret = () => {
    navigator.clipboard.writeText(webhook.secret).catch(() => {});
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4">
      {/* Header: Name + Active Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon icon="lucide:webhook" className="text-accent" width={18} />
          <span className="text-sm font-semibold text-text">{webhook.name}</span>
        </div>
        <Switch
          initialChecked={webhook.isActive}
          onChange={(checked) => onToggleActive(webhook.id, checked)}
        />
      </div>

      {/* URL */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-text-muted">Endpoint URL</span>
        <code className="rounded-md border border-border bg-white/5 px-2.5 py-1.5 font-mono text-xs text-text-secondary truncate">
          {webhook.url}
        </code>
      </div>

      {/* Secret Key */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-text-muted">Secret Key</span>
        <div className="flex items-center gap-2 rounded-md border border-border bg-white/5 px-2.5 py-1">
          <code className="flex-1 font-mono text-xs text-text-secondary truncate">
            {revealSecret ? webhook.secret : '••••••••••••••••••••••••••••'}
          </code>
          <button
            onClick={() => setRevealSecret(!revealSecret)}
            className="text-text-muted hover:text-text p-1"
          >
            <Icon icon={revealSecret ? 'lucide:eye-off' : 'lucide:eye'} width={14} />
          </button>
          {revealSecret && (
            <button
              onClick={handleCopySecret}
              className="text-text-muted hover:text-accent p-1"
            >
              <Icon icon={isCopied ? 'lucide:check' : 'lucide:copy'} className={isCopied ? 'text-success' : ''} width={14} />
            </button>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-text-muted">Events</span>
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
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t border-border pt-3 mt-1">
        <div className="flex gap-2">
          <Button
            variant="bordered"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => onViewDeliveries(webhook)}
          >
            <Icon icon="lucide:history" width={14} />
            <span className="ml-1">Logs</span>
          </Button>
          <Button
            variant="bordered"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => onTest(webhook.id)}
            disabled={testing || !webhook.isActive}
          >
            {testing ? (
              <Icon icon="lucide:loader-2" className="animate-spin" width={14} />
            ) : (
              <Icon icon="lucide:play" width={14} />
            )}
            <span className="ml-1">Test</span>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="bordered"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => onEdit(webhook)}
          >
            <Icon icon="lucide:edit" width={14} />
          </Button>
          <Button
            variant="bordered"
            className="px-2.5 py-1.5 text-xs hover:!border-error hover:!text-error"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            <Icon icon="lucide:trash-2" width={14} />
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          setIsDeleteModalOpen(false);
          onDelete(webhook.id);
        }}
        title="Delete Webhook"
        description="Are you sure you want to delete this webhook? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}
