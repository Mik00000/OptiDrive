"use client";

import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = true,
  isLoading = false,
}: ConfirmModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={isDestructive ? "lucide:alert-triangle" : "lucide:info"}
      iconColor={isDestructive ? "text-red-500" : "text-accent"}
      iconBg={isDestructive ? "bg-red-500/10" : "bg-accent/10"}
    >
      <p className="text-sm text-text-muted">{description}</p>
      
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="bordered" onClick={onClose} disabled={isLoading}>
          {cancelText}
        </Button>
        <Button
          variant={isDestructive ? "danger" : "primary"}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <span>Loading...</span>
            </div>
          ) : (
            confirmText
          )}
        </Button>
      </div>
    </Modal>
  );
}
