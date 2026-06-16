"use client";

import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Inputs";
import { useState } from "react";

interface UpdatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UpdatePaymentModal({ isOpen, onClose }: UpdatePaymentModalProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Update Payment Method"
      icon="lucide:credit-card"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Name on Card
          </label>
          <Input
            variant="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Card Number
          </label>
          <div className="relative">
            <Input
              variant="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="0000 0000 0000 0000"
              className="w-full pl-10"
            />
            <Icon icon="lucide:credit-card" width={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Expiry Date
            </label>
            <Input
              variant="text"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
              placeholder="MM/YY"
              className="w-full"
            />
          </div>
          <div className="flex flex-col gap-1.5 flex-1">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              CVC
            </label>
            <Input
              variant="text"
              value={cvc}
              onChange={(e) => setCvc(e.target.value)}
              placeholder="123"
              className="w-full"
              type="password"
              maxLength={4}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="bordered" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={!cardNumber || !expiry || !cvc || !name}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}
