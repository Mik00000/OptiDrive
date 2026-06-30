"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { InviteMemberModal } from './InviteMemberModal';
import { getWorkspaceUsersApi, removeWorkspaceUserApi, transferOwnershipApi, updateUserRoleApi, getRolesApi, WorkspaceUser } from '../api';
import { ConfirmModal } from './ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { PLANS, PlanType, Role, Permission } from '@optidrive/shared';
import { UserAvatar } from '@/components/UserAvatar';
import { Modal } from '@/components/Modal';

type RoleWithCount = Role & { _count: { users: number } };

export const TeamTab = () => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [members, setMembers] = useState<WorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userToRemove, setUserToRemove] = useState<WorkspaceUser | null>(null);
  const [userToTransfer, setUserToTransfer] = useState<WorkspaceUser | null>(null);
  const [userToChangeRole, setUserToChangeRole] = useState<WorkspaceUser | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [availableRoles, setAvailableRoles] = useState<RoleWithCount[]>([]);
  const [actionFeedback, setActionFeedback] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showFeedback = (message: string, type: 'success' | 'error' = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const { user, workspaces } = useAuth();
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId);
  const isOwner = activeWorkspace?.role?.name === 'Owner';
  const canManageRoles = isOwner || activeWorkspace?.role?.permissions?.includes(Permission.MANAGE_ROLES);

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

  const fetchRoles = async () => {
    try {
      const data = await getRolesApi();
      setAvailableRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchRoles();
  }, []);

  const handleRemoveClick = (member: WorkspaceUser) => {
    setUserToRemove(member);
  };

  const handleChangeRoleClick = (member: WorkspaceUser) => {
    setUserToChangeRole(member);
    setSelectedRoleId(member.role?.id || '');
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

  const confirmChangeRole = async () => {
    if (!userToChangeRole || !selectedRoleId) return;
    setIsChangingRole(true);
    try {
      await updateUserRoleApi(userToChangeRole.id, selectedRoleId);
      fetchMembers();
      setUserToChangeRole(null);
      showFeedback('Role updated successfully');
    } catch (error: any) {
      console.error('Failed to change role', error);
      showFeedback(error.data?.error || error.message || 'Failed to change role', 'error');
    } finally {
      setIsChangingRole(false);
    }
  };

  const plan = (activeWorkspace?.plan || 'FREE') as PlanType;
  const maxMembers = PLANS[plan]?.maxMembers || 2;
  const isLimitReached = members.length >= maxMembers;

  // Фільтруємо ролі для вибору (не показуємо Owner якщо поточний юзер не Owner)
  const selectableRoles = isOwner
    ? availableRoles
    : availableRoles.filter(r => r.name !== 'Owner');

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-text-light text-lg font-semibold">
                Team Members
              </span>
              <span className="text-xs text-text-muted">
                ({members.length} / {maxMembers} Members)
              </span>
            </div>
            <p className="text-text-muted text-sm mt-1">
              Manage who has access to this workspace.
            </p>
          </div>
          <Button 
            variant="primary" 
            className="w-full sm:w-auto shrink-0 justify-center" 
            onClick={() => setIsInviteModalOpen(true)}
            disabled={isLimitReached}
          >
            <Icon icon="lucide:user-plus" width="16" height="16" className="mr-2" />
            {isLimitReached ? 'Limit Reached' : 'Invite Member'}
          </Button>
        </div>
        
        <div className="flex flex-col p-0">
          {isLoading ? (
            <div className="p-6 text-center text-text-muted flex items-center justify-center gap-2">
              <Icon icon="lucide:loader-2" className="animate-spin" width={20} />
              Loading members...
            </div>
          ) : members.length === 0 ? (
            <div className="p-6 text-center text-text-muted">No members found.</div>
          ) : (
            members.map((member) => {
              const isSelf = member.id === user?.id;
              const isTargetOwner = member.role?.name === 'Owner';
              // Можна змінити роль якщо: є право + не самому собі + не власнику (якщо сам не Owner)
              const canChangeThisRole = canManageRoles && !isSelf && !(isTargetOwner && !isOwner);

              return (
                <div key={member.id} className="border-border flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 border-b last:border-b-0 gap-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={member.name} avatarUrl={member.avatarUrl} size={40} />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-text-light font-medium">{member.name || "User"}</span>
                        {isSelf && (
                          <span className="text-[10px] bg-accent/15 text-accent border border-accent/25 px-1.5 py-0.5 rounded font-medium">You</span>
                        )}
                      </div>
                      <span className="text-text-muted text-sm">{member.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <span className="bg-bg border-border text-text-muted border px-2 py-1 rounded text-xs font-medium uppercase tracking-wide">
                      {member.role?.name || 'Unknown'}
                    </span>
                    {canChangeThisRole && (
                      <button
                        onClick={() => handleChangeRoleClick(member)}
                        className="text-text-muted hover:text-accent transition-colors p-1.5 rounded-lg hover:bg-accent/10"
                        title="Change Role"
                      >
                        <Icon icon="lucide:shield-check" width="16" height="16" />
                      </button>
                    )}
                    {isOwner && !isSelf && (
                      <button 
                        onClick={() => setUserToTransfer(member)}
                        className="text-text-muted hover:text-accent transition-colors p-1.5 rounded-lg hover:bg-accent/10"
                        title="Transfer Ownership"
                      >
                        <Icon icon="lucide:arrow-right-left" width="16" height="16" />
                      </button>
                    )}
                    {!isSelf && (
                      <button 
                        onClick={() => handleRemoveClick(member)}
                        className="text-text-muted hover:text-error transition-colors p-1.5 rounded-lg hover:bg-error/10"
                        title="Remove User"
                      >
                        <Icon icon="lucide:x" width="16" height="16" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
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

      {/* Change Role Modal */}
      <Modal
        isOpen={!!userToChangeRole}
        onClose={() => setUserToChangeRole(null)}
        title="Change Role"
        icon="lucide:shield-check"
      >
        <div className="flex flex-col gap-4">
          {userToChangeRole && (
            <div className="flex items-center gap-3 p-3 bg-bg rounded-xl border border-border">
              <UserAvatar name={userToChangeRole.name} avatarUrl={userToChangeRole.avatarUrl} size={36} />
              <div>
                <p className="text-text-light font-medium text-sm">{userToChangeRole.name || 'User'}</p>
                <p className="text-text-muted text-xs">{userToChangeRole.email}</p>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wide text-text-muted uppercase">
              New Role
            </label>
            <div className="grid grid-cols-1 gap-2">
              {selectableRoles.map(role => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selectedRoleId === role.id
                      ? 'bg-accent/10 border-accent/30'
                      : 'bg-bg border-border hover:border-text-muted/50'
                  }`}
                >
                  <div className={`h-4 w-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-all ${
                    selectedRoleId === role.id ? 'border-accent' : 'border-border'
                  }`}>
                    {selectedRoleId === role.id && (
                      <div className="h-2 w-2 rounded-full bg-accent" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-sm font-medium ${selectedRoleId === role.id ? 'text-accent' : 'text-text-light'}`}>
                      {role.name}
                    </span>
                    {role.description && (
                      <span className="text-xs text-text-muted leading-normal">{role.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="bordered" onClick={() => setUserToChangeRole(null)} disabled={isChangingRole}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={confirmChangeRole}
              disabled={isChangingRole || !selectedRoleId || selectedRoleId === userToChangeRole?.role?.id}
            >
              {isChangingRole ? 'Updating...' : 'Update Role'}
            </Button>
          </div>
        </div>
      </Modal>

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
