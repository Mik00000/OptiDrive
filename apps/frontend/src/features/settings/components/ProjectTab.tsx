"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Inputs';
import { Icon } from '@iconify/react';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { updateWorkspaceApi, deleteWorkspaceApi, leaveWorkspaceApi } from '../api';

export const ProjectTab = () => {
  const router = useRouter();
  const { user, workspaces, login } = useAuth();
  
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId);
  const isOwner = activeWorkspace?.role?.name === 'Owner';
  const isOnlyMember = activeWorkspace?.membersCount === 1;
  
  const [name, setName] = useState(activeWorkspace?.name || '');
  const [slug, setSlug] = useState(activeWorkspace?.slug || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [isSaveChangesModalOpen, setIsSaveChangesModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setSlug(activeWorkspace.slug);
    }
  }, [activeWorkspace]);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleCopyId = () => {
    if (activeWorkspace?.id) {
      navigator.clipboard.writeText(activeWorkspace.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleSaveChanges = async () => {
    if (!name.trim()) {
      setErrorMessage('Workspace Name is required');
      setIsSaveChangesModalOpen(false);
      return;
    }
    
    try {
      setIsSaving(true);
      setErrorMessage('');
      const response = await updateWorkspaceApi(
        name.trim(),
        slug.trim() || undefined
      );
      
      // Update details in AuthContext
      if (user) {
        // Trigger workspace reload in AuthContext
        const token = localStorage.getItem('optidrive_token') || '';
        login(token, { ...user }, true);
      }
      
      setIsSaveChangesModalOpen(false);
      showFeedback('Workspace preferences saved');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to save changes');
      setIsSaveChangesModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    try {
      setIsLeaving(true);
      setErrorMessage('');
      const res = await leaveWorkspaceApi();
      if (res.success && res.token && user) {
        login(res.token, { ...user, workspaceId: res.workspaceId }, true);
        setIsLeaveModalOpen(false);
        router.push('/dashboard');
        showFeedback('Workspace left successfully');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to leave workspace');
      setIsLeaveModalOpen(false);
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    try {
      setIsDeleting(true);
      setErrorMessage('');
      const res = await deleteWorkspaceApi();
      if (res.success && res.token && user) {
        // Switch workspace to the new one or null
        login(res.token, { ...user, workspaceId: res.switchWorkspaceId || undefined }, true);
        setIsDeleteModalOpen(false);
        router.push('/dashboard');
        showFeedback('Workspace deleted successfully');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.data?.error || err.response?.data?.error || err.message || 'Failed to delete workspace');
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        
        {/* Header */}
        <div className="border-border border-b px-4 py-4 sm:px-6">
          <span className="text-text-light text-lg font-semibold">
            Workspace Preferences
          </span>
          <p className="text-text-muted text-sm mt-1">
            Configure global settings and metadata for your active workspace.
          </p>
        </div>
        
        {/* Fields */}
        <div className="border-border flex flex-col gap-5 border-b p-4 sm:p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="projectName" className="fz-13 fw-500 text-text-light">
              Workspace Name
            </label>
            <Input
              variant="text"
              name="projectName"
              id="projectName"
              className="rounded-lg"
              placeholder="e.g. My Workspace"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="slug" className="fz-13 fw-500 text-text-light">
              Workspace Slug (URL Identifier)
            </label>
            <Input
              variant="text"
              name="slug"
              id="slug"
              className="rounded-lg"
              placeholder="e.g. my-workspace"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
            <p className="text-xs text-text-muted mt-1 leading-normal">
              Slugs identify your workspace uniquely. Avoid special characters. Your CDN links use this slug.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="fz-13 fw-500 text-text-light">
              Workspace ID
            </label>
            <div className="flex gap-2 items-center">
              <Input
                variant="text"
                className="rounded-lg flex-1 font-mono text-xs bg-bg/50 text-text-muted"
                value={activeWorkspace?.id || ''}
                readOnly
                disabled
              />
              <Button
                variant="bordered"
                type="button"
                onClick={handleCopyId}
                className="shrink-0 h-10 px-3 flex items-center justify-center"
              >
                <Icon
                  icon={copiedId ? "lucide:check" : "lucide:copy"}
                  className={copiedId ? "text-emerald-500" : ""}
                  width="16"
                  height="16"
                />
              </Button>
            </div>
            <p className="text-xs text-text-muted mt-1 leading-normal">
              This is the unique identifier for your workspace. You may need it for API integrations.
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="bg-bg flex items-center justify-end px-4 py-4 sm:px-6">
          <Button 
            variant="accent" 
            className="w-full sm:w-auto justify-center"
            onClick={() => setIsSaveChangesModalOpen(true)}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-error/30 bg-error/5 flex flex-col overflow-hidden rounded-2xl border">
        <div className="flex items-center gap-2 p-4 pb-2 sm:p-6 sm:pb-4">
          <Icon
            icon="lucide:triangle-alert"
            className="text-error shrink-0"
            width="18"
            height="18"
          />
          <span className="text-error text-lg font-semibold">
            Danger Zone
          </span>
        </div>

        <div className="flex flex-col">
          {isOwner ? (
            <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="text-text-light text-base font-medium">
                  Delete Workspace
                </span>
                <p className="text-text-muted text-sm">
                  Permanently delete this workspace and all its optimized media, tags, webhooks, and team settings. This action is irreversible.
                </p>
              </div>
              <Button
                variant="danger"
                className="w-full shrink-0 justify-center sm:w-auto"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Icon icon="lucide:trash-2" width={16} height={16} className="mr-2" />
                Delete Workspace
              </Button>
            </div>
          ) : (
            <div className="border-error/30 flex flex-col justify-between gap-4 border-t p-4 sm:flex-row sm:items-center sm:p-6">
              <div className="flex flex-col gap-1">
                <span className="text-text-light text-base font-medium">
                  Leave Workspace
                </span>
                <p className="text-text-muted text-sm">
                  Leave this workspace. You will lose access to its files and CDN credentials.
                </p>
              </div>
              <Button
                variant="danger"
                className="w-full shrink-0 justify-center sm:w-auto"
                onClick={() => setIsLeaveModalOpen(true)}
              >
                <Icon icon="lucide:square-arrow-right-exit" width={16} height={16} className="mr-2" />
                Leave Workspace
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={isSaveChangesModalOpen}
        onClose={() => setIsSaveChangesModalOpen(false)}
        onConfirm={handleSaveChanges}
        title="Save Workspace Preferences"
        description="Are you sure you want to update the workspace configurations?"
        confirmText={isSaving ? "Saving..." : "Save"}
        variant="accent"
        icon="lucide:save"
      />

      <ConfirmModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        onConfirm={handleLeaveWorkspace}
        title="Leave Workspace"
        description="Are you sure you want to leave this workspace? You will lose access to all its content."
        confirmText={isLeaving ? "Leaving..." : "Leave Workspace"}
        variant="danger"
        icon="lucide:door-open"
        requiredInputText="LEAVE WORKSPACE"
      />

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteWorkspace}
        title="Delete Workspace"
        description="Are you sure you want to permanently delete this workspace? All S3 storage will be wiped out and all keys revoked."
        confirmText={isDeleting ? "Deleting..." : "Delete Workspace"}
        variant="danger"
        icon="lucide:trash-2"
        requiredInputText="DELETE WORKSPACE"
      />

      <ConfirmModal
        isOpen={!!errorMessage}
        onClose={() => setErrorMessage('')}
        onConfirm={() => setErrorMessage('')}
        title="Error"
        description={errorMessage}
        confirmText="OK"
        cancelText=""
        variant="danger"
        icon="lucide:alert-circle"
      />

      {/* Toast Feedback */}
      {feedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border ${feedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-4 duration-300`}>
          <Icon icon={feedback.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} />
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}
    </div>
  );
};
