"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";

interface FullReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FullReferenceModal({ isOpen, onClose }: FullReferenceModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Full API Reference"
      icon="lucide:book-open"
    >
      <div className="flex flex-col gap-4 text-center items-center py-4">
        <div className="bg-accent/10 text-accent h-16 w-16 rounded-full flex items-center justify-center mb-2">
          <Icon icon="lucide:construction" width={32} />
        </div>
        <h3 className="text-text-light text-lg font-bold">
          Coming Soon
        </h3>
        <p className="text-text-muted text-sm">
          The full API documentation is currently under development and will be available soon. For now, please use the quick guide on this page.
        </p>
        
        <Button variant="accent" onClick={onClose} className="mt-4 w-full">
          Got it
        </Button>
      </div>
    </Modal>
  );
}
