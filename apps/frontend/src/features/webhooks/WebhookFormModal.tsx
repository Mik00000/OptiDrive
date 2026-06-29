"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Inputs';
import { Button } from '@/components/Button';
import Switch from '@/components/Switch';
import { Icon } from '@iconify/react';
import { Webhook } from './types';

interface WebhookFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string, url: string, events: string[], isActive?: boolean) => Promise<any>;
  webhook?: Webhook | null;
}

export const WebhookFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  webhook
}: WebhookFormModalProps) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['file.optimized']);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (webhook) {
      setName(webhook.name);
      setUrl(webhook.url);
      setEvents(webhook.events);
      setIsActive(webhook.isActive);
    } else {
      setName('');
      setUrl('');
      setEvents(['file.optimized']);
      setIsActive(true);
    }
    setError(null);
  }, [webhook, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Webhook name is required');
      return;
    }
    if (!url.trim() || !url.startsWith('http')) {
      setError('Please enter a valid URL starting with http:// or https://');
      return;
    }
    if (events.length === 0) {
      setError('Please select at least one event');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit(name.trim(), url.trim(), events, isActive);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save webhook');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={webhook ? 'Edit Webhook' : 'Create New Webhook'}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 pt-2">
        {error && (
          <div className="rounded-xl border border-error/20 bg-error/10 p-3.5 text-sm text-error">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-text-secondary">Webhook Name</label>
          <Input
            placeholder="e.g. My optimization server"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-text-secondary">Endpoint URL</label>
          <Input
            placeholder="https://yourserver.com/api/webhooks"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isSubmitting}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-secondary">Events to Send</label>
          <div className="rounded-xl border border-border bg-card-bg/50 p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={events.includes('file.optimized')}
                disabled
                className="mt-0.5 h-4.5 w-4.5 rounded border-border text-accent focus:ring-accent"
              />
              <div>
                <span className="text-sm font-medium text-text">Image optimized successfully</span>
                <p className="text-xs text-text-muted mt-0.5">
                  Triggers every time a file is successfully compressed and uploaded to storage (`file.optimized`).
                </p>
              </div>
            </label>
          </div>
        </div>

        {webhook && (
          <div className="flex items-center justify-between border-t border-border pt-4">
            <div>
              <span className="text-sm font-semibold text-text">Active</span>
              <p className="text-xs text-text-muted mt-0.5">Temporarily disable or enable sending this webhook</p>
            </div>
            <Switch
              initialChecked={isActive}
              onChange={setIsActive}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4 mt-2">
          <Button
            type="button"
            variant="bordered"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="accent"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Icon icon="lucide:loader-2" className="animate-spin h-4 w-4" />
                <span>Saving...</span>
              </>
            ) : (
              webhook ? 'Save changes' : 'Create webhook'
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
