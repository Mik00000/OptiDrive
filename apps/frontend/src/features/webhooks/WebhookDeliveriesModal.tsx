"use client";

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Icon } from '@iconify/react';
import { Webhook, WebhookDelivery } from './types';

interface WebhookDeliveriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  webhook: Webhook | null;
  deliveries: WebhookDelivery[];
  isLoading: boolean;
}

export const WebhookDeliveriesModal = ({
  isOpen,
  onClose,
  webhook,
  deliveries,
  isLoading
}: WebhookDeliveriesModalProps) => {
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDelivery | null>(null);

  // Automatically select the latest delivery (first in the list) when list updates
  useEffect(() => {
    if (deliveries.length > 0) {
      setSelectedDelivery(deliveries[0]);
    } else {
      setSelectedDelivery(null);
    }
  }, [deliveries]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('uk-UA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setSelectedDelivery(null);
        onClose();
      }}
      title={`Delivery History: ${webhook?.name || ''}`}
      maxWidth="max-w-4xl"
    >
      <div className="flex flex-col gap-6 pt-2 h-[calc(100vh-10rem)] md:h-[550px]">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={40} />
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center p-8">
            <Icon icon="lucide:activity" className="text-text-muted mb-3" width={48} />
            <h4 className="text-base font-semibold text-text">No delivery history</h4>
            <p className="text-sm text-text-muted mt-1 max-w-sm">
              This webhook has not been triggered yet or history was cleared.
            </p>
          </div>
        ) : (
          <div className="flex flex-1 flex-col md:flex-row gap-4 md:gap-6 overflow-hidden">
            {/* Ліва панель: Список доставок */}
            <div className="w-full md:w-2/5 overflow-y-auto border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4 flex flex-col gap-2 shrink-0 max-h-[40vh] md:max-h-full">
              {deliveries.map((delivery) => {
                const isSelected = selectedDelivery?.id === delivery.id;
                return (
                  <button
                    key={delivery.id}
                    onClick={() => setSelectedDelivery(delivery)}
                    className={`
                      w-full flex items-center justify-between p-3.5 rounded-xl border text-left transition-all shrink-0
                      ${isSelected 
                        ? 'border-accent bg-accent/5 ring-1 ring-accent' 
                        : 'border-border bg-card-bg hover:bg-hover-bg'}
                    `}
                  >
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`
                          text-xs font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0
                          ${delivery.success 
                            ? 'bg-success/15 text-success' 
                            : 'bg-error/15 text-error'}
                        `}>
                          <span className={`h-1.5 w-1.5 rounded-full ${delivery.success ? 'bg-success' : 'bg-error'}`} />
                          {delivery.status}
                        </span>
                        <span className="text-xs font-mono text-text-muted truncate">
                          {delivery.event}
                        </span>
                      </div>
                      <span className="text-xs text-text-secondary truncate mt-1">
                        {formatDate(delivery.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs text-text-muted font-mono shrink-0 ml-2">
                      {delivery.duration}ms
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Права панель: Деталі обраної доставки */}
            <div className="w-full md:w-3/5 overflow-y-auto md:pl-2 flex flex-col pb-4 md:pb-0">
              {selectedDelivery ? (
                <div className="flex flex-col gap-4">
                  <div className="rounded-xl border border-border bg-card-bg/30 p-4">
                    <h5 className="text-sm font-semibold text-text mb-3">Delivery Details</h5>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                      <span className="text-text-muted">Response Status:</span>
                      <span className={`font-semibold ${selectedDelivery.success ? 'text-success' : 'text-error'}`}>
                        {selectedDelivery.status} ({selectedDelivery.success ? 'Success' : 'Error'})
                      </span>
                      <span className="text-text-muted">Request Time:</span>
                      <span className="text-text-secondary">{formatDate(selectedDelivery.createdAt)}</span>
                      <span className="text-text-muted">Duration:</span>
                      <span className="text-text-secondary">{selectedDelivery.duration} ms</span>
                      <span className="text-text-muted">Event:</span>
                      <span className="text-text-secondary font-mono">{selectedDelivery.event}</span>
                    </div>
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold text-text-secondary mb-1.5">Request Data (Payload)</h5>
                    <pre className="text-xs bg-sidebar rounded-xl border border-border p-3 overflow-x-auto max-h-[150px] font-mono text-text-secondary">
                      {JSON.stringify(JSON.parse(selectedDelivery.payload), null, 2)}
                    </pre>
                  </div>

                  <div>
                    <h5 className="text-xs font-semibold text-text-secondary mb-1.5">Server Response</h5>
                    {selectedDelivery.response ? (
                      <pre className="text-xs bg-sidebar rounded-xl border border-border p-3 overflow-x-auto max-h-[150px] font-mono text-text-secondary">
                        {selectedDelivery.response}
                      </pre>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-text-muted">
                        Empty response body
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-xl">
                  <Icon icon="lucide:info" className="text-text-muted mb-2" width={32} />
                  <p className="text-sm text-text-muted">
                    Select a delivery attempt from the list on the left to view request and response details.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
