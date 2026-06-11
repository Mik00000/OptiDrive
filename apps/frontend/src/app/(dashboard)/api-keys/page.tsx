"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import PageHeading from "@/components/PageHeading";
import { ApiKeyTable } from "@/features/api-keys/ApiKeyTable";
import { ApiKeyCard } from "@/features/api-keys/ApiKeyCard";
import { GenerateKeyModal } from "@/features/api-keys/GenerateKeyModal";
import { type ApiKey, type Permission, MOCK_KEYS } from "@/features/api-keys/types";

/* ─── Порожній стан ─── */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-text-muted">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-white/5">
        <Icon icon="lucide:key-round" width={24} className="opacity-40" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm font-medium text-text-light">No active keys</p>
        <p className="text-xs text-text-muted">
          Click &quot;Generate New Key&quot; to create your first one
        </p>
      </div>
    </div>
  );
}

/* ─── Головна сторінка ─── */
const ApiKeysPage = () => {
  const [keys, setKeys]           = useState<ApiKey[]>(MOCK_KEYS);
  const [copiedId, setCopiedId]   = useState<string | null>(null);
  const [isModalOpen, setModal]   = useState(false);

  /* Копіювання токена */
  const handleCopy = (id: string, token: string) => {
    navigator.clipboard.writeText(token).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* Відкликання ключа */
  const handleRevoke = (id: string) => {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  };

  /* Додавання нового ключа */
  const handleGenerate = (name: string, permission: Permission) => {
    const rand         = Math.random().toString(36).slice(2, 10);
    const prefix       = permission === "Read-only" ? "op_test_" : "op_live_";
    const maskedSuffix = rand.slice(-4);

    const newKey: ApiKey = {
      id:          String(Date.now()),
      name,
      token:       `${prefix}••••••••${maskedSuffix}`,
      permissions: permission,
      createdAt:   new Date().toLocaleDateString("en-US", {
        month: "short",
        day:   "2-digit",
        year:  "numeric",
      }),
      lastUsed: "Just now",
    };

    setKeys((prev) => [newKey, ...prev]);
  };

  const commonProps = {
    keys,
    onRevoke: handleRevoke,
    onCopy:   handleCopy,
    copiedId,
  };

  return (
    <>
      <section className="dashboard-page">
        <PageHeading title="API Keys">
          <Button
            variant="accent"
            mobileBehavior="full-width"
            onClick={() => setModal(true)}
          >
            <div className="inline-flex h-4 w-4 items-center justify-center">
              <Icon icon="lucide:plus" width="100%" height="100%" />
            </div>
            <span>Generate New Key</span>
          </Button>
        </PageHeading>

        <div className="flex flex-col gap-6 p-4 pb-8 lg:p-8 lg:pb-8">
          {/* Security notice */}
          <div className="border-accent/20 bg-accent/10 flex gap-3 rounded-2xl border p-4 lg:p-5">
            <Icon
              icon="lucide:shield-alert"
              width={20}
              className="text-accent mt-0.5 shrink-0"
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-text-light">
                Keep your keys secret
              </p>
              <p className="text-sm font-medium text-text-muted">
                API keys grant full access to your OptiDrive account. Do not
                share them publicly or commit them to version control. If a key
                is compromised, revoke it immediately.
              </p>
            </div>
          </div>

          {/* Desktop table */}
          <ApiKeyTable {...commonProps} emptySlot={<EmptyState />} />

          {/* Mobile cards */}
          <div className="flex flex-col gap-3 lg:hidden">
            {keys.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card">
                <EmptyState />
              </div>
            ) : (
              keys.map((key) => (
                <ApiKeyCard key={key.id} apiKey={key} {...commonProps} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Generate key modal */}
      <GenerateKeyModal
        isOpen={isModalOpen}
        onClose={() => setModal(false)}
        onGenerate={handleGenerate}
      />
    </>
  );
};

export default ApiKeysPage;
