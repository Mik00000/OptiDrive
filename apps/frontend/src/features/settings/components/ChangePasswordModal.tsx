"use client";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Inputs";
import { useState } from "react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // імітація збереження пароля
    onClose();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Password"
      icon="lucide:lock"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Current Password
          </label>
          <Input
            variant="text"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full"
            placeholder="Enter current password"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            New Password
          </label>
          <Input
            variant="text"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full"
            placeholder="Enter new password"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Confirm New Password
          </label>
          <Input
            variant="text"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full"
            placeholder="Repeat new password"
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="bordered" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          >
            Change Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
