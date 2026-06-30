"use client";

import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Inputs";
import { useState } from "react";
import { changePasswordApi } from "../api";
import { Icon } from "@iconify/react";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      
      const response = await changePasswordApi(currentPassword, newPassword);
      
      if (response.success) {
        setSuccessMsg("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        // Закриваємо модалку після короткої затримки, щоб користувач встиг прочитати успішне повідомлення
        setTimeout(() => {
          onClose();
          setSuccessMsg("");
        }, 1500);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.data?.error || err.response?.data?.error || err.message || "Failed to change password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setErrorMsg("");
    setSuccessMsg("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Change Password"
      icon="lucide:lock"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
            <Icon icon="lucide:alert-circle" width="18" className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
            <Icon icon="lucide:check-circle" width="18" className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

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
            disabled={isLoading || !!successMsg}
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
            disabled={isLoading || !!successMsg}
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
            disabled={isLoading || !!successMsg}
          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button 
            type="button" 
            variant="bordered" 
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary"
            disabled={isLoading || !!successMsg || !currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
          >
            {isLoading ? "Updating..." : "Change Password"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
