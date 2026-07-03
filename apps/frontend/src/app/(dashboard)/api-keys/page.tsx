"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import PageHeading from "@/components/PageHeading";
import { ApiKeyTable } from "@/features/api-keys/ApiKeyTable";
import { ApiKeyCard } from "@/features/api-keys/ApiKeyCard";
import { GenerateKeyModal } from "@/features/api-keys/GenerateKeyModal";
import { EmptyState } from "@/features/api-keys/EmptyState";
import { SecurityNotice } from "@/features/api-keys/SecurityNotice";
import { useApiKeys } from "@/features/api-keys/useApiKeys";
import { ApiKeysSkeleton } from "@/features/api-keys/ApiKeysSkeleton";
import { getWorkspaceStatsApi, WorkspaceStats } from "@/features/dashboard/api";

const ApiKeysPage = () => {
  const [isModalOpen, setModal] = useState(false);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  
  const {
    keys,
    copiedId,
    isLoading,
    handleCopy,
    handleRevoke,
    handleGenerate,
  } = useApiKeys();

  useEffect(() => {
    getWorkspaceStatsApi().then(setStats).catch(console.error);
  }, [keys.length]); // Refresh stats when keys change

  const commonProps = {
    keys,
    onRevoke: handleRevoke,
    onCopy: handleCopy,
    copiedId,
  };

  const limitReached = stats ? stats.activeApiKeys >= stats.limits.maxApiKeys : false;

  return (
    <>
      <section className="dashboard-page">
        <PageHeading title="API Keys">
          <div className="flex items-center gap-4">
            {stats && (
              <span className={`text-sm font-medium ${limitReached ? 'text-error' : 'text-text-muted'}`}>
                {stats.activeApiKeys} / {stats.limits.maxApiKeys} Keys Used
              </span>
            )}
            <Button
              variant="accent"
              mobileBehavior="full-width"
              onClick={() => setModal(true)}
              disabled={limitReached}
              className="origin-right"
            >
              <div className="inline-flex h-4 w-4 items-center justify-center">
                <Icon icon="lucide:plus" width="100%" height="100%" />
              </div>
              <span>{limitReached ? 'Limit Reached' : 'Generate New Key'}</span>
            </Button>
          </div>
        </PageHeading>

        <div className="flex flex-col gap-6 p-4 pb-8 lg:p-8 lg:pb-8">
          <SecurityNotice />

          {isLoading ? (
            <ApiKeysSkeleton />
          ) : (
            <>
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
            </>
          )}
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
