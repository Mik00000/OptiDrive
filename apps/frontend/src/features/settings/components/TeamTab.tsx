"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { InviteMemberModal } from './InviteMemberModal';
import { getWorkspaceUsersApi, removeWorkspaceUserApi, transferOwnershipApi, WorkspaceUser } from '../api';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

export const TeamTab = () => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [members, setMembers] = useState<WorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToRemove, setUserToRemove] = useState<WorkspaceUser | null>(null);
  const [userToTransfer, setUserToTransfer] = useState<WorkspaceUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const { user, workspaces } = useAuth();
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId);
  const isOwner = activeWorkspace?.role?.name === 'Owner';

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const data = await getWorkspaceUsersApi();
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch members', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleRemoveClick = (member: WorkspaceUser) => {
    setUserToRemove(member);
  };

  const confirmRemove = async () => {
    if (!userToRemove) return;
    setIsRemoving(true);
    try {
      await removeWorkspaceUserApi(userToRemove.id);
      fetchMembers();
      setUserToRemove(null);
      showFeedback('User removed successfully');
    } catch (error: any) {
      console.error('Failed to remove user', error);
      showFeedback(error.data?.error || error.response?.data?.error || error.message || 'Failed to remove user', 'error');
      setUserToRemove(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const confirmTransfer = async () => {
    if (!userToTransfer) return;
    setIsTransferring(true);
    try {
      await transferOwnershipApi(userToTransfer.id);
      setUserToTransfer(null);
      showFeedback('Ownership transferred successfully');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error: any) {
      console.error('Failed to transfer ownership', error);
      showFeedback(error.data?.error || error.response?.data?.error || error.message || 'Failed to transfer ownership', 'error');
      setUserToTransfer(null);
      setIsTransferring(false);
    }
  };

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <span className="text-text-light text-lg font-semibold">
              Team Members
            </span>
            <p className="text-text-muted text-sm mt-1">
              Manage who has access to this project.
            </p>
          </div>
          <Button variant="primary" className="w-full sm:w-auto shrink-0 justify-center" onClick={() => setIsInviteModalOpen(true)}>
            <Icon icon="lucide:user-plus" width="16" height="16" className="mr-2" />
            Invite Member
          </Button>
        </div>
        
        <div className="flex flex-col p-0">
          {isLoading ? (
            <div className="p-6 text-center text-text-muted">Loading members...</div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-text-muted">No members found.</div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="border-border flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b last:border-b-0 gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-accent/20 text-accent flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold">
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-text-light font-medium">{member.name || "User"}</span>
                    <span className="text-text-muted text-sm">{member.email}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span className="bg-bg border-border text-text-muted border px-2 py-1 rounded text-xs font-medium uppercase tracking-wide">
                    {member.role?.name || 'Unknown'}
                  </span>
                  {isOwner && member.id !== user?.id && (
                    <button 
                      onClick={() => setUserToTransfer(member)}
                      className="text-text-muted hover:text-accent transition-colors p-1"
                      title="Transfer Ownership"
                    >
                      <Icon icon="lucide:arrow-right-left" width="18" height="18" />
                    </button>
                  )}
                  {member.id !== user?.id && (
                    <button 
                      onClick={() => handleRemoveClick(member)}
                      className="text-text-muted hover:text-error transition-colors p-1"
                      title="Remove User"
                    >
                      <Icon icon="lucide:x" width="18" height="18" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <InviteMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onSuccess={() => {
          fetchMembers();
          showFeedback('Invitation sent successfully!');
        }}
      />

      <ConfirmModal
        isOpen={!!userToRemove}
        onClose={() => setUserToRemove(null)}
        onConfirm={confirmRemove}
        title="Remove Team Member"
        description={userToRemove ? `Are you sure you want to remove ${userToRemove.name || userToRemove.email} from the workspace? They will lose access to all projects and files.` : ''}
        confirmText={isRemoving ? "Removing..." : "Remove Member"}
        variant="danger"
        icon="lucide:user-minus"
        requiredInputText={userToRemove ? `REMOVE ${userToRemove.name?.toUpperCase() || 'USER'}` : undefined}
      />

      <ConfirmModal
        isOpen={!!userToTransfer}
        onClose={() => setUserToTransfer(null)}
        onConfirm={confirmTransfer}
        title="Transfer Ownership"
        description={userToTransfer ? `Are you sure you want to transfer ownership to ${userToTransfer.name || userToTransfer.email}? You will be demoted to an Admin and lose owner privileges.` : ''}
        confirmText={isTransferring ? "Transferring..." : "Transfer Ownership"}
        variant="danger"
        icon="lucide:alert-triangle"
        requiredInputText="TRANSFER OWNERSHIP"
      />

      {/* Toast Feedback */}
      {actionFeedback && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border ${actionFeedback.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} animate-in fade-in slide-in-from-top-4 duration-300`}>
          <Icon icon={actionFeedback.type === 'success' ? 'lucide:check-circle' : 'lucide:alert-circle'} width={18} />
          <span className="text-sm font-medium">{actionFeedback.message}</span>
        </div>
      )}
    </div>
  );
};
