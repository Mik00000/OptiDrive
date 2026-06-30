"use client";

import { useState } from 'react';
import { Icon } from '@iconify/react';
import { Button } from '@/components/Button';
import PageHeading from '@/components/PageHeading';
import { WebhookTable } from '@/features/webhooks/WebhookTable';
import { WebhookCard } from '@/features/webhooks/WebhookCard';
import { WebhookFormModal } from '@/features/webhooks/WebhookFormModal';
import { WebhookDeliveriesModal } from '@/features/webhooks/WebhookDeliveriesModal';
import { useWebhooks } from '@/features/webhooks/useWebhooks';
import { Webhook, WebhookDelivery } from '@/features/webhooks/types';
import { toast } from 'react-toastify';

export default function WebhooksPage() {
  const {
    webhooks,
    isLoading,
    isTesting,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleTest,
    fetchDeliveries
  } = useWebhooks();

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);

  const [isDeliveriesModalOpen, setIsDeliveriesModalOpen] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [isDeliveriesLoading, setIsDeliveriesLoading] = useState(false);

  const [showDocs, setShowDocs] = useState(false);

  const openCreateModal = () => {
    setEditingWebhook(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (name: string, url: string, events: string[], isActive?: boolean) => {
    if (editingWebhook) {
      await handleUpdate(editingWebhook.id, { name, url, events, isActive });
    } else {
      await handleCreate(name, url, events);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    await handleUpdate(id, { isActive: active });
  };

  const openDeliveriesModal = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setIsDeliveriesModalOpen(true);
    setIsDeliveriesLoading(true);
    try {
      const data = await fetchDeliveries(webhook.id);
      setDeliveries(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeliveriesLoading(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const response = await handleTest(id);
      const webhook = webhooks.find(w => w.id === id);
      if (response.success) {
        toast.success(`Test successful! Response status: ${response.status} in ${response.duration}ms.`);
      } else {
        toast.error(`Test failed. Server returned status: ${response.status}`);
      }
      if (webhook) {
        await openDeliveriesModal(webhook);
      }
    } catch (err: any) {
      toast.error(`Connection error: ${err?.message || 'Unknown error'}`);
    }
  };

  return (
    <>
      <section className="dashboard-page">
        <PageHeading title="Webhooks">
          <div className="flex items-center gap-4">
            <Button
              variant="bordered"
              onClick={() => setShowDocs(!showDocs)}
              className="gap-2"
            >
              <Icon icon="lucide:book-open" width={16} />
              <span>{showDocs ? 'Hide Instructions' : 'Documentation'}</span>
            </Button>
            <Button
              variant="accent"
              mobileBehavior="full-width"
              onClick={openCreateModal}
            >
              <div className="inline-flex h-4 w-4 items-center justify-center">
                <Icon icon="lucide:plus" width="100%" height="100%" />
              </div>
              <span>Create Webhook</span>
            </Button>
          </div>
        </PageHeading>

        <div className="flex flex-col gap-6 p-4 pb-8 lg:p-8 lg:pb-8">
          {/* Документація / Інструкція інтеграції */}
          {showDocs && (
            <div className="rounded-2xl border border-accent/25 bg-accent/5 p-5 text-text-secondary animate-fadeIn">
              <div className="flex items-start gap-3">
                <Icon icon="lucide:info" className="text-accent shrink-0 mt-0.5" width={20} />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-text">How to set up webhook receiver?</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Webhooks allow your server to receive real-time notifications about events in OptiDrive.
                    We send a `POST` request with a JSON payload containing detailed information about the compressed file.
                  </p>
                  <h5 className="text-xs font-semibold text-text mt-3">Signature Verification (Security)</h5>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Each request is signed using your Webhook **Secret Key** (HMAC-SHA256) in the
                    `X-OptiDrive-Signature` header. We strongly recommend verifying this signature on your server:
                  </p>
                  <pre className="text-[11px] bg-sidebar rounded-xl border border-border p-3.5 mt-2.5 overflow-x-auto font-mono text-text-secondary leading-normal">
{`const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-optidrive-signature'];
  const payload = JSON.stringify(req.body);
  
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', YOUR_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  // Handle the event...
  res.status(200).send('Received');
});`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Icon icon="lucide:loader-2" className="animate-spin text-accent" width={32} />
            </div>
          ) : (
            <>
              {/* Desktop view */}
              <WebhookTable
                webhooks={webhooks}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onTest={handleTestWebhook}
                isTesting={isTesting}
                onViewDeliveries={openDeliveriesModal}
                onToggleActive={handleToggleActive}
                emptySlot={
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent mb-4">
                      <Icon icon="lucide:webhook" width={24} />
                    </div>
                    <h3 className="text-lg font-semibold text-text">No webhooks created</h3>
                    <p className="text-sm text-text-muted mt-1 max-w-sm">
                      Create your first webhook to receive instant notifications when your files are compressed and optimized.
                    </p>
                    <Button
                      variant="bordered"
                      className="mt-6"
                      onClick={openCreateModal}
                    >
                      Create Webhook
                    </Button>
                  </div>
                }
              />

              {/* Mobile cards view */}
              <div className="flex flex-col gap-3 lg:hidden">
                {webhooks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-8 text-center">
                    <Icon icon="lucide:webhook" className="text-accent mb-2" width={32} />
                    <span className="text-sm font-semibold text-text">No webhooks found</span>
                    <Button variant="bordered" className="mt-4" onClick={openCreateModal}>
                      Add Webhook
                    </Button>
                  </div>
                ) : (
                  webhooks.map((webhook) => (
                    <WebhookCard
                      key={webhook.id}
                      webhook={webhook}
                      onEdit={openEditModal}
                      onDelete={handleDelete}
                      onTest={handleTestWebhook}
                      isTesting={isTesting}
                      onViewDeliveries={openDeliveriesModal}
                      onToggleActive={handleToggleActive}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Form modal */}
      <WebhookFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        webhook={editingWebhook}
      />

      {/* Deliveries log modal */}
      <WebhookDeliveriesModal
        isOpen={isDeliveriesModalOpen}
        onClose={() => setIsDeliveriesModalOpen(false)}
        webhook={selectedWebhook}
        deliveries={deliveries}
        isLoading={isDeliveriesLoading}
      />
    </>
  );
}
