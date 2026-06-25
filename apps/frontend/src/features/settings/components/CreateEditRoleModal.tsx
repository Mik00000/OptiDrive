"use client";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Input } from "@/components/Inputs";
import { createRoleApi, updateRoleApi } from "../api";
import { Role, Permission } from "@optidrive/shared";

interface CreateEditRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData: Role | null;
  mode: 'create' | 'edit' | 'view' | 'duplicate';
}

const AVAILABLE_PERMISSIONS = Object.values(Permission);

export function CreateEditRoleModal({ isOpen, onClose, onSuccess, initialData, mode }: CreateEditRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isDuplicate = mode === 'duplicate';

  useEffect(() => {
    if (isOpen) {
      if (initialData && mode !== 'create') {
        setName(isDuplicate ? `${initialData.name} (Copy)` : initialData.name);
        setDescription(initialData.description || "");
        setSelectedPermissions(initialData.permissions);
      } else {
        setName("");
        setDescription("");
        setSelectedPermissions([]);
      }
      setError("");
    }
  }, [isOpen, initialData, mode]);

  const handleTogglePermission = (permission: Permission) => {
    if (isView) return;
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (selectedPermissions.length === 0) {
      setError("Please select at least one permission");
      setIsLoading(false);
      return;
    }

    try {
      if (isEdit) {
        await updateRoleApi(initialData!.id, name, description, selectedPermissions);
      } else {
        await createRoleApi(name, description, selectedPermissions);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.error || `Failed to ${isEdit ? 'update' : 'create'} role`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isView ? "View Role" : isEdit ? "Edit Role" : "Create Custom Role"}
      icon={isView ? "lucide:eye" : isEdit ? "lucide:edit-3" : "lucide:shield-plus"}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <p className="text-text-muted/90 text-sm -mt-2">
          {isView ? "Viewing details and permissions for this role." : isEdit ? "Update this role's name, description, and permissions." : "Define a custom role by combining specific permissions."}
        </p>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Role Name
            </label>
            <Input
              variant="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Content Editor"
              className="w-full disabled:opacity-70"
              required
              maxLength={30}
              disabled={isView}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this role do?"
              className="w-full rounded-xl border border-border bg-bg px-3.5 py-2.5 text-sm font-medium text-text-light outline-none transition-colors hover:border-text-muted focus:border-accent resize-none min-h-[80px] disabled:opacity-70 disabled:cursor-not-allowed"
              maxLength={150}
              disabled={isView}
            />
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase flex justify-between">
              <span>Permissions</span>
              <span className="text-[10px] bg-bg px-1.5 py-0.5 rounded border border-border">{selectedPermissions.length} selected</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 max-h-[250px] overflow-y-auto pr-1">
              {AVAILABLE_PERMISSIONS.map(permission => {
                const isSelected = selectedPermissions.includes(permission);
                return (
                  <button
                    key={permission}
                    type="button"
                    onClick={() => handleTogglePermission(permission)}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                      isSelected 
                        ? 'bg-accent/10 border-accent/30' 
                        : 'bg-bg border-border'
                    } ${!isView && !isSelected ? 'hover:border-text-muted' : ''} ${isView ? 'cursor-default opacity-90' : ''}`}
                    disabled={isView}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      isSelected ? 'bg-accent border-accent' : 'border-border'
                    }`}>
                      {isSelected && <Icon icon="lucide:check" width="12" height="12" className="text-black" />}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-text-light'}`}>
                        {permission.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && <div className="text-error text-sm font-medium bg-error/10 p-3 rounded-xl border border-error/20">{error}</div>}

        <div className="flex justify-end gap-3 mt-2 border-t border-border pt-4">
          {isView ? (
            <Button type="button" variant="primary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button type="button" variant="bordered" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={!name || isLoading}>
                {isLoading ? "Saving..." : (isEdit ? "Save Changes" : "Create Role")}
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
