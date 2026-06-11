"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Inputs";
import { Modal } from "@/components/Modal";
import {
  type Permission,
  PERMISSION_BADGE,
  PERMISSION_OPTIONS,
} from "./types";

interface GenerateKeyModalProps {
  isOpen:     boolean;
  onClose:    () => void;
  onGenerate: (name: string, permission: Permission) => void;
}

/**
 * Модальне вікно генерації нового API ключа.
 * Двокроковий флоу: форма → показ токена.
 */
export function GenerateKeyModal({
  isOpen,
  onClose,
  onGenerate,
}: GenerateKeyModalProps) {
  const [name, setName]               = useState("");
  const [permission, setPermission]   = useState<Permission>("Full Access");
  const [step, setStep]               = useState<"form" | "reveal">("form");
  const [generatedToken, setToken]    = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);

  /* Скидання стану після закриття */
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setName("");
        setPermission("Full Access");
        setStep("form");
        setToken("");
        setTokenCopied(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  /* Генерація демо-токена */
  const handleGenerate = () => {
    if (!name.trim()) return;
    const rand   = Math.random().toString(36).slice(2, 10);
    const prefix = permission === "Read-only" ? "op_test_" : "op_live_";
    setToken(`${prefix}${rand}`);
    setStep("reveal");
    onGenerate(name.trim(), permission);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(generatedToken).catch(() => {});
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const title = step === "form" ? "Generate New API Key" : "Your New API Key";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      icon="lucide:key-round"
    >
      {step === "form" ? (
        /* ── Step 1: Form ── */
        <>
          {/* Key name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Key Name
            </label>
            <Input
              variant="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              placeholder="e.g. Production-Backend"
              className="w-full"
            />
          </div>

          {/* Permissions picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Permissions
            </label>
            <div className="flex flex-col gap-2">
              {PERMISSION_OPTIONS.map((opt) => {
                const isSelected = permission === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPermission(opt.value)}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? opt.bg
                        : "border-border bg-transparent hover:bg-white/5"
                    }`}
                  >
                    <Icon
                      icon={opt.icon}
                      width={16}
                      className={isSelected ? opt.color : "text-text-muted"}
                    />
                    <div className="flex flex-col">
                      <span
                        className={`text-sm font-medium ${isSelected ? "text-text-light" : "text-text-muted"}`}
                      >
                        {opt.value}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        {opt.desc}
                      </span>
                    </div>
                    {isSelected && (
                      <Icon
                        icon="lucide:check"
                        width={14}
                        className={`ml-auto shrink-0 ${opt.color}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="bordered" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={handleGenerate}
              disabled={!name.trim()}
              className="flex-1 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon icon="lucide:sparkles" width={14} />
              Generate
            </Button>
          </div>
        </>
      ) : (
        /* ── Step 2: Reveal token ── */
        <>
          {/* Warning */}
          <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <Icon
              icon="lucide:triangle-alert"
              width={16}
              className="mt-0.5 shrink-0 text-amber-400"
            />
            <p className="text-xs text-amber-300">
              Save this key now — it will not be shown again in full.
            </p>
          </div>

          {/* Token */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Your API Key
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded-xl border border-border bg-bg px-3.5 py-2.5 font-mono text-sm text-text-light">
                {generatedToken}
              </code>
              <button
                onClick={handleCopyToken}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-bg text-text-muted transition-all hover:bg-white/10 hover:text-text-light active:scale-90"
              >
                <Icon
                  icon={tokenCopied ? "lucide:check" : "lucide:copy"}
                  width={15}
                  className={tokenCopied ? "text-success" : ""}
                />
              </button>
            </div>
          </div>

          {/* Key details */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-bg px-4 py-3">
            <div>
              <p className="text-[11px] text-text-muted">Key Name</p>
              <p className="text-sm font-medium text-text-light">{name}</p>
            </div>
            <div>
              <p className="text-[11px] text-text-muted">Permissions</p>
              <p className={`text-sm font-medium ${PERMISSION_BADGE[permission]}`}>
                {permission}
              </p>
            </div>
          </div>

          {/* Done */}
          <Button variant="accent" onClick={onClose} className="w-full">
            <Icon icon="lucide:check" width={15} />
            Done
          </Button>
        </>
      )}
    </Modal>
  );
}
