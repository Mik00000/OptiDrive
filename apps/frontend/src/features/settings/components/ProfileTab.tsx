"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { Icon } from '@iconify/react';
import { ConfirmModal } from './ConfirmModal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { useAuth } from '@/contexts/AuthContext';

export const ProfileTab = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isRemovePictureModalOpen, setIsRemovePictureModalOpen] = useState(false);
  const [isSaveChangesModalOpen, setIsSaveChangesModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [isLeaveWorkspaceModalOpen, setIsLeaveWorkspaceModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const { login, user } = useAuth();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeaveWorkspace = async () => {
    try {
      setIsLeaving(true);
      const { leaveWorkspaceApi } = await import('../api');
      const res = await leaveWorkspaceApi();
      if (res.success && res.token && user) {
        login(res.token, user, true);
        setIsLeaveWorkspaceModalOpen(false);
        window.location.reload();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to leave workspace');
      setIsLeaveWorkspaceModalOpen(false);
    } finally {
      setIsLeaving(false);
    }
  };
  
  const handleUploadPictureClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6 pb-8 lg:gap-8 relative">
      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" />
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Profile Information
          </span>
          <p className="text-text-muted mt-1 text-sm">
            Update your personal details and workspace settings.
          </p>
        </div>

        <div className="border-border border-b p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
            <div className="bg-accent text-text-light relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full">
              <Icon icon="lucide:user" width="50%" height="50%" />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto">
              <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                <Button
                  variant="bordered"
                  className="w-full justify-center sm:w-auto"
                  onClick={handleUploadPictureClick}
                >
                  Upload new picture
                </Button>
                <Button
                  variant="ghost"
                  className="text-text-muted hover:text-text-light/90 w-full justify-center sm:w-auto"
                  onClick={() => setIsRemovePictureModalOpen(true)}
                >
                  Remove
                </Button>
              </div>
              <span className="text-text-muted text-center text-xs sm:text-left">
                Recommended size: 256x256px. Max 2MB.
              </span>
            </div>
          </div>
        </div>

        <div className="border-border flex flex-col gap-5 border-b p-4 sm:p-6">
          <div className="flex w-full flex-col gap-5 sm:flex-row sm:gap-6">
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="name" className="fz-13 fw-500 text-text-light">
                Full Name
              </label>
              <Input
                variant="text"
                name="name"
                id="name"
                className="rounded-lg"
                placeholder="Name"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label htmlFor="email" className="fz-13 fw-500 text-text-light">
                Email Address
              </label>
              <Input
                variant="text"
                name="email"
                id="email"
                className="rounded-lg"
                placeholder="Email"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="workspace" className="fz-13 fw-500 text-text-light">
              Workspace Name
            </label>
            <Input
              variant="text"
              name="workspace"
              id="workspace"
              className="rounded-lg"
              placeholder="Workspace Name"
            />
          </div>
        </div>

        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6">
          <Button variant="accent" className="w-full justify-center sm:w-auto" onClick={() => setIsSaveChangesModalOpen(true)}>
            Save Changes
          </Button>
        </div>
      </div>

      <div className="border-error/30 bg-error/5 flex flex-col overflow-hidden rounded-2xl border">
        <div className="flex items-center gap-2 p-4 pb-2 sm:p-6 sm:pb-4">
          <Icon
            icon="lucide:triangle-alert"
            className="text-error shrink-0"
            width="18"
            height="18"
          />
          <span className="text-error text-lg font-semibold">
            Security & Danger Zone
          </span>
        </div>
        <div className="flex flex-col">
          <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="text-text-light text-base font-medium">
                Change Password
              </span>
              <p className="text-text-muted text-sm">
                Update your password to keep your account secure.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full shrink-0 justify-center sm:w-auto"
              onClick={() => setIsChangePasswordModalOpen(true)}
            >
              Change Password
            </Button>
          </div>
          <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="text-text-light text-base font-medium">
                Delete Account
              </span>
              <p className="text-text-muted text-sm">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button
              variant="danger"
              className="w-full shrink-0 justify-center sm:w-auto"
              onClick={() => setIsDeleteAccountModalOpen(true)}
            >
              <Icon
                icon="lucide:trash-2"
                width="16"
                height="16"
                className="mr-2"
              />
              Delete Account
            </Button>
          </div>
          <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="flex flex-col gap-1">
              <span className="text-text-light text-base font-medium">
                Leave Workspace
              </span>
              <p className="text-text-muted text-sm">
                Leave the current workspace. You will be moved to your personal workspace.
              </p>
            </div>
            <Button
              variant="danger"
              className="w-full shrink-0 justify-center sm:w-auto"
              onClick={() => setIsLeaveWorkspaceModalOpen(true)}
            >
              <Icon
                icon="lucide:square-arrow-right-exit"
                width="16"
                height="16"
                className="mr-2"
              />
              Leave Workspace
            </Button>
          </div>
        </div>
      </div>
      
      <ConfirmModal
        isOpen={isRemovePictureModalOpen}
        onClose={() => setIsRemovePictureModalOpen(false)}
        onConfirm={() => {}}
        title="Remove Profile Picture"
        description="Are you sure you want to remove your profile picture? It will be replaced with a default avatar."
        confirmText="Remove"
        variant="danger"
        icon="lucide:trash-2"
      />
      
      <ConfirmModal
        isOpen={isSaveChangesModalOpen}
        onClose={() => setIsSaveChangesModalOpen(false)}
        onConfirm={() => {}}
        title="Save Changes"
        description="Are you sure you want to save the new profile settings?"
        confirmText="Save"
        variant="accent"
        icon="lucide:save"
      />
      
      <ConfirmModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onConfirm={() => {}}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action cannot be undone. All your data and files will be permanently deleted."
        confirmText="Delete Permanently"
        variant="danger"
        icon="lucide:triangle-alert"
      />
      
      <ConfirmModal
        isOpen={isLeaveWorkspaceModalOpen}
        onClose={() => setIsLeaveWorkspaceModalOpen(false)}
        onConfirm={handleLeaveWorkspace}
        title="Leave Workspace"
        description="Are you sure you want to leave this workspace? You will be moved to a personal workspace and lose access to the current team's data."
        confirmText={isLeaving ? "Leaving..." : "Leave Workspace"}
        variant="danger"
        icon="lucide:door-open"
      />
      
      
      <ConfirmModal
        isOpen={!!errorMessage}
        onClose={() => setErrorMessage('')}
        onConfirm={() => setErrorMessage('')}
        title="Error"
        description={errorMessage}
        confirmText="OK"
        cancelText="" // Will hide if we add logic, but for now we just show both or we can create a custom modal
        variant="danger"
        icon="lucide:alert-circle"
      />

      <ChangePasswordModal
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </div>
  );
};
