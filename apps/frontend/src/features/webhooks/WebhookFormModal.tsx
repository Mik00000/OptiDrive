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

  const availableEvents = [
    {
      id: 'file.optimized',
      label: 'Image optimized successfully',
      description: 'Triggers when a file is successfully compressed and uploaded.',
      icon: 'lucide:zap',
      activeColor: 'text-accent',
      activeBg: 'bg-accent/15'
    },
    {
      id: 'file.deleted',
      label: 'File moved to Trash',
      description: 'Triggers when a file is soft-deleted.',
      icon: 'lucide:trash-2',
      activeColor: 'text-error',
      activeBg: 'bg-error/15'
    },
    {
      id: 'file.restored',
      label: 'File restored from Trash',
      description: 'Triggers when a file is recovered from the recycle bin.',
      icon: 'lucide:rotate-ccw',
      activeColor: 'text-success',
      activeBg: 'bg-success/15'
    },
    {
      id: 'folder.created',
      label: 'Folder created',
      description: 'Triggers when a new directory is created.',
      icon: 'lucide:folder-plus',
      activeColor: 'text-purple',
      activeBg: 'bg-purple/15'
    },
    {
      id: 'folder.deleted',
      label: 'Folder moved to Trash',
      description: 'Triggers when a directory is moved to the recycle bin.',
      icon: 'lucide:folder-x',
      activeColor: 'text-error',
      activeBg: 'bg-error/15'
    }
  ];

  const handleToggleEvent = (eventId: string) => {
    if (events.includes(eventId)) {
      setEvents(events.filter(e => e !== eventId));
    } else {
      setEvents([...events, eventId]);
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-text-secondary">Events to Send</label>
            <span className="text-xs text-text-muted/80 bg-border/40 px-2 py-0.5 rounded-md font-mono">
              {events.length} selected
            </span>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-border bg-sidebar/30 p-2 max-h-[250px] overflow-y-auto custom-scrollbar">
            {availableEvents.map((evt) => {
              const isSelected = events.includes(evt.id);
              return (
                <div
                  key={evt.id}
                  onClick={() => handleToggleEvent(evt.id)}
                  className={`
                    flex items-center justify-between gap-3 p-3 rounded-lg border cursor-pointer select-none
                    transition-all duration-200
                    ${isSelected 
                      ? 'border-accent bg-accent/[0.04] shadow-sm shadow-accent/5' 
                      : 'border-transparent bg-transparent hover:bg-white/[0.02] hover:border-border/50'
                    }
                  `}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`
                      flex items-center justify-center h-9 w-9 rounded-lg shrink-0 transition-all duration-200
                      ${isSelected 
                        ? `${evt.activeBg} ${evt.activeColor} scale-105` 
                        : 'bg-border/30 text-text-muted/70'
                      }
                    `}>
                      <Icon icon={evt.icon} width={18} />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className={`
                        text-xs font-semibold transition-colors duration-200
                        ${isSelected ? 'text-text-light' : 'text-text-muted'}
                      `}>
                        {evt.label}
                      </span>
                      <p className="text-[11px] text-text-muted/65 mt-0.5 leading-relaxed truncate max-w-[280px] md:max-w-[320px]">
                        {evt.description}
                      </p>
                      <span className="text-[9px] font-mono text-text-muted/40 mt-0.5">
                        {evt.id}
                      </span>
                    </div>
                  </div>
                  
                  {/* Custom Checkbox */}
                  <div className={`
                    flex items-center justify-center h-5 w-5 rounded-md border transition-all duration-200 shrink-0
                    ${isSelected 
                      ? 'border-accent bg-accent text-white scale-105 shadow-md shadow-accent/15' 
                      : 'border-border bg-transparent text-transparent'
                    }
                  `}>
                    <Icon icon="lucide:check" width={12} className="stroke-[3]" />
                  </div>
                </div>
              );
            })}
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
