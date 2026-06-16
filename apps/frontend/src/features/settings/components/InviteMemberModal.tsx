"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Inputs";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Member");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
    setEmail("");
    setRole("Member");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team Member"
      icon="lucide:user-plus"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-text-muted text-sm mb-2">
          Invite new members to your workspace to collaborate on projects.
        </p>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Email Address
          </label>
          <Input
            variant="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            className="w-full"
            type="email"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Role
          </label>
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-text-light outline-none transition-colors hover:border-text-muted focus:border-accent"
          >
            <option value="Admin">Admin</option>
            <option value="Member">Member</option>
            <option value="Viewer">Viewer</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="bordered" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={!email}>
            Send Invitation
          </Button>
        </div>
      </form>
    </Modal>
  );
}
