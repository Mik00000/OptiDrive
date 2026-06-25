"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Inputs";
import { inviteUserApi, getRolesApi } from "../api";
import { Role } from "@optidrive/shared";

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function InviteMemberModal({ isOpen, onClose, onSuccess }: InviteMemberModalProps) {
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    if (isOpen) {
      getRolesApi().then(data => {
        setRoles(data);
        const defaultRole = data.find(r => r.name === 'Member') || data[0];
        if (defaultRole) setRoleId(defaultRole.id);
      }).catch(console.error);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await inviteUserApi(email, roleId);
      if (onSuccess) onSuccess();
      onClose();
      setEmail("");
      const defaultRole = roles.find(r => r.name === 'Member') || roles[0];
      if (defaultRole) setRoleId(defaultRole.id);
    } catch (err: any) {
      setError(err?.message || "Failed to invite user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Team Member"
      icon="lucide:user-plus"
      className="overflow-visible"
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

        {error && <div className="text-error text-sm font-medium">{error}</div>}

        <div className="flex flex-col gap-1.5 ">
          <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
            Role
          </label>
          <Input
            variant="select"
            value={roleId}
            onChange={(val: string) => setRoleId(val)}
            options={roles.map(r => ({ value: r.id, label: r.name }))}
            className="w-full "

          />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="bordered" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={!email || isLoading}>
            {isLoading ? "Sending..." : "Send Invitation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
