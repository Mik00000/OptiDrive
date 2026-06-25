"use client";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Icon } from "@iconify/react";
import { Input } from "@/components/Inputs";
import { useState, useEffect } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "accent";
  icon?: string;
  requiredInputText?: string;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  icon = "lucide:alert-circle",
  requiredInputText
}: ConfirmModalProps) {
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (isOpen) {
      setInputValue("");
    }
  }, [isOpen]);
  
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const getIconColors = () => {
    switch (variant) {
      case "danger": return { color: "text-error", bg: "bg-error/15" };
      case "accent": return { color: "text-accent", bg: "bg-accent/15" };
      default: return { color: "text-primary", bg: "bg-primary/15" };
    }
  };

  const colors = getIconColors();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon={icon}
      iconColor={colors.color}
      iconBg={colors.bg}
    >
      <div className="flex flex-col gap-6">
        <p className="text-text-muted text-sm">
          {description}
        </p>

        {requiredInputText && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text-light">
              Type <strong className="select-none text-text-light bg-slate-800 px-1.5 py-0.5 rounded border border-border">{requiredInputText}</strong> to confirm:
            </span>
            <Input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPaste={(e) => e.preventDefault()}
              placeholder={requiredInputText}
              autoComplete="off"
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          {cancelText && (
            <Button variant="bordered" onClick={onClose}>
              {cancelText}
            </Button>
          )}
          <Button 
            variant={variant} 
            onClick={handleConfirm}
            disabled={requiredInputText ? inputValue !== requiredInputText : false}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
