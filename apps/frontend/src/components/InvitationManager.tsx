"use client";

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';

interface Invitation {
  id: string;
  workspace: {
    id: string;
    name: string;
  };
  role: string;
}

export function InvitationManager() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentInvite, setCurrentInvite] = useState<Invitation | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, token, user } = useAuth();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const res = await apiClient.get<{ data: Invitation[] }>('/api/internal/workspace-users/pending-invitations');
      if (res.data && res.data.length > 0) {
        setInvitations(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch invitations', e);
    }
  };

  const handleAccept = async (invitationId: string, confirmLeave = false) => {
    setLoading(true);
    try {
      const res = await apiClient.post<{ success: boolean, token?: string, user?: any }>('/api/internal/workspace-users/accept-invitation', {
        invitationId,
        confirmLeave
      });

      if (res.success && res.token && res.user && token && user) {
        // Update auth context
        login(res.token, res.user, true);
        
        // Remove accepted invitation from list
        setInvitations(invs => invs.filter(i => i.id !== invitationId));
        setShowConfirmModal(false);
        setCurrentInvite(null);
        
        // Reload page to refresh all dashboard data with new workspace
        window.location.reload();
      }
    } catch (error: any) {
      if (error.data?.requiresConfirmation || error.response?.data?.requiresConfirmation) {
        setCurrentInvite(invitations.find(i => i.id === invitationId) || null);
        setShowConfirmModal(true);
      } else {
        alert(error.message || 'Failed to accept invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (invitationId: string) => {
    setLoading(true);
    try {
      await apiClient.post('/api/internal/workspace-users/reject-invitation', { invitationId });
      setInvitations(invs => invs.filter(i => i.id !== invitationId));
      setShowRejectConfirm(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // If we have a confirm modal
  if (showConfirmModal && currentInvite) {
    return (
      <Modal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Change Workspace"
        icon="lucide:alert-triangle"
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            Are you sure you want to leave your current workspace and switch to <strong>{currentInvite.workspace.name}</strong>? 
            You will lose access to data in your current workspace.
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="bordered" onClick={() => setShowConfirmModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="accent" onClick={() => handleAccept(currentInvite.id, true)} disabled={loading}>
              {loading ? 'Please wait...' : 'Yes, Switch Workspace'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Reject Confirmation
  if (showRejectConfirm && invitations.length > 0) {
    const invite = invitations[0];
    return (
      <Modal
        isOpen={true}
        onClose={() => setShowRejectConfirm(false)}
        title="Decline Invitation"
        icon="lucide:user-x"
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            Are you sure you want to decline the invitation to join <strong>{invite.workspace.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 mt-2">
            <Button variant="bordered" onClick={() => setShowRejectConfirm(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => handleReject(invite.id)} disabled={loading}>
              {loading ? 'Please wait...' : 'Yes, Decline'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  // Show normal invitation modal
  if (invitations.length > 0 && !showConfirmModal && !showRejectConfirm) {
    const invite = invitations[0]; // Show first invitation
    return (
      <Modal
        isOpen={true}
        onClose={() => setShowRejectConfirm(true)}
        title="New Invitation!"
        icon="lucide:mail"
      >
        <div className="flex flex-col gap-4">
          <p className="text-text-muted text-sm">
            You have been invited to join the <strong>{invite.workspace.name}</strong> workspace.
            Would you like to accept this invitation?
          </p>
          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-2">
            <Button variant="ghost" className="text-text-muted hover:text-text-light opacity-70" onClick={() => setShowRejectConfirm(true)} disabled={loading}>
              Decline
            </Button>
            <Button variant="primary" onClick={() => handleAccept(invite.id, false)} disabled={loading}>
              {loading ? 'Please wait...' : 'Accept Invitation'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return null;
}
