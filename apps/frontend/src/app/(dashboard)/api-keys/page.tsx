"use client";

import { useState } from "react";
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

const ApiKeysPage = () => {
  const [isModalOpen, setModal] = useState(false);
  const {
    keys,
    copiedId,
    isLoading,
    handleCopy,
    handleRevoke,
    handleGenerate,
  } = useApiKeys();

  const commonProps = {
    keys,
    onRevoke: handleRevoke,
    onCopy: handleCopy,
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
