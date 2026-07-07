"use client";

import { useEffect } from "react";
import { Icon } from "@iconify/react";
import { twMerge } from "tailwind-merge";

interface ModalProps {
  /** Чи відкрита модалка */
  isOpen: boolean;
  /** Callback при закритті */
  onClose: () => void;
  /** Заголовок модалки */
  title: string;
  /** Іконка у заголовку (iconify id) */
  icon?: string;
  /** Колір іконки (tailwind клас), наприклад "text-accent" */
  iconColor?: string;
  /** Фон іконки, наприклад "bg-accent/15" */
  iconBg?: string;
  /** Максимальна ширина, default "max-w-md" */
  maxWidth?: string;
  /** Дочірні елементи — вміст модалки */
  children: React.ReactNode;
  /** Додаткові класи для картки */
  className?: string;
  /** Чи можна закрити кліком поза межами модалки */
  closeOnOutsideClick?: boolean;
}

/**
 * Універсальний компонент модального вікна.
 *
 * Підтримує:
 * - закриття по кліку на backdrop
 * - закриття по клавіші Escape
 * - кастомну іконку та ширину
 * - анімацію blur-backdrop
 */
export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  iconColor = "text-accent",
  iconBg = "bg-accent/15",
  maxWidth = "max-w-md",
  children,
  className,
  closeOnOutsideClick = true,
}: ModalProps) {
  /* Закриття по Escape */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnOutsideClick) onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose, closeOnOutsideClick]);

  /* Блокування скролу сторінки коли модалка відкрита */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (closeOnOutsideClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Розмите тло */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Картка */}
      <div
        className={twMerge(
          "relative z-10 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl",
          maxWidth,
          className,
        )}
      >
        {/* ── Заголовок ── */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div
                className={twMerge(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  iconBg,
                )}
              >
                <Icon icon={icon} className={iconColor} width={16} />
              </div>
            )}
            <h2 className="text-base font-semibold text-text-light">{title}</h2>
          </div>

          {/* Кнопка закриття */}
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted transition-all hover:bg-white/10 hover:text-text-light active:scale-90"
          >
            <Icon icon="lucide:x" width={16} />
          </button>
        </div>

        {/* ── Вміст ── */}
        <div className="flex flex-col gap-5 p-6">{children}</div>
      </div>
    </div>
  );
}
