"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Icon } from '@iconify/react';
import { getRolesApi, deleteRoleApi } from '../api';
import { Role, Permission, PLANS, PlanType } from '@optidrive/shared';
import { ConfirmModal } from './ConfirmModal';
import { CreateEditRoleModal } from './CreateEditRoleModal';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export const RolesTab = () => {
  const [roles, setRoles] = useState<(Role & { _count: { users: number } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | 'duplicate'>('create');
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const data = await getRolesApi();
      const sortedRoles = [...data].sort((a, b) => {
        const order: Record<string, number> = { 'Owner': 1, 'Admin': 2, 'Member': 3, 'Viewer': 4 };
        const aOrder = a.isSystem ? order[a.name] || 5 : 6;
        const bOrder = b.isSystem ? order[b.name] || 5 : 6;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return a.name.localeCompare(b.name);
      });
      setRoles(sortedRoles);
    } catch (error) {
      console.error('Failed to fetch roles', error);
      setErrorMessage('Failed to load roles. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleEditRole = (role: Role) => {
    setRoleToEdit(role);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleViewRole = (role: Role) => {
    setRoleToEdit(role);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleDuplicateRole = (role: Role) => {
    setRoleToEdit(role);
    setModalMode('duplicate');
    setIsModalOpen(true);
  };

  const handleCreateRole = () => {
    setRoleToEdit(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    setIsDeleting(true);
    try {
      await deleteRoleApi(roleToDelete.id);
      await fetchRoles();
      setRoleToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete role', error);
      setErrorMessage(error.response?.data?.error || error.message || 'Failed to delete role');
      setRoleToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const { user, workspaces } = useAuth();
  const activeWorkspace = workspaces.find((w) => w.id === user?.workspaceId);
  const plan = (activeWorkspace?.plan || 'FREE') as PlanType;
  const maxCustomRoles = PLANS[plan]?.maxCustomRoles || 0;
  const customRolesCount = roles.filter(r => !r.isSystem).length;
  const isLimitReached = customRolesCount >= maxCustomRoles;

  return (
    <div className="flex max-w-4xl flex-col gap-6 lg:gap-8 pb-8 relative">
      <div className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border">
        <div className="border-border border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-text-light text-lg font-semibold">
                Roles & Permissions
              </span>
              <span className="text-xs text-text-muted">
                ({customRolesCount} / {maxCustomRoles} Custom Roles)
              </span>
            </div>
            <p className="text-text-muted text-sm mt-1">
              Create custom roles and configure specific permissions.
            </p>
          </div>
          <Button 
            variant="primary" 
            className="w-full sm:w-auto shrink-0 justify-center" 
            onClick={handleCreateRole}
            disabled={isLimitReached}
          >
            <Icon icon="lucide:shield-plus" width="16" height="16" className="mr-2" />
            {isLimitReached ? 'Limit Reached' : 'Create Role'}
          </Button>
        </div>
        
        <div className="flex flex-col p-0">
          {isLoading ? (
            <div className="p-6 text-center text-text-muted">Loading roles...</div>
          ) : roles.length === 0 ? (
            <div className="p-6 text-center text-text-muted">No roles found.</div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="border-border flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b last:border-b-0 gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-text-light font-medium text-lg flex items-center gap-2">
                      {role.isSystem && (
                        <span title="System Role" className="flex items-center">
                          <Icon icon="lucide:lock" width="16" height="16" className="text-text-muted" />
                        </span>
                      )}
                      {role.name}
                    </span>
                    {!role.isSystem && (
                      <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                        Custom
                      </span>
                    )}
                    <Link href="/settings/team" className="group flex items-center ml-2">
                      <span className="text-text-muted text-sm bg-bg border border-border px-2.5 py-0.5 rounded-full group-hover:bg-border/50 group-hover:text-text-light transition-colors flex items-center">
                        <Icon icon="lucide:users" width="14" height="14" className="inline mr-1.5" />
                        {role._count?.users || 0} users
                        <Icon icon="lucide:chevron-right" width="14" height="14" className="ml-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                      </span>
                    </Link>
                  </div>
                  <span className="text-text-muted/90 text-sm mt-0.5">{role.description || "No description provided."}</span>
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {role.permissions.map((p) => (
                      <span key={p} className="bg-white/5 text-text-light/90 text-[10px] uppercase font-medium px-2 py-0.5 rounded border border-white/10">
                        {p.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1 self-end sm:self-auto">
                  {role.isSystem ? (
                    <>
                      <button 
                        onClick={() => handleViewRole(role)}
                        className="text-text-muted hover:text-text-light transition-colors p-2 rounded-lg hover:bg-bg"
                        title="View Details"
                      >
                        <Icon icon="lucide:eye" width="18" height="18" />
                      </button>
                      <button 
                        onClick={() => handleDuplicateRole(role)}
                        className="text-text-muted hover:text-accent transition-colors p-2 rounded-lg hover:bg-bg"
                        title="Duplicate Role"
                      >
                        <Icon icon="lucide:copy" width="18" height="18" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => handleDuplicateRole(role)}
                        className="text-text-muted hover:text-accent transition-colors p-2 rounded-lg hover:bg-bg"
                        title="Duplicate Role"
                      >
                        <Icon icon="lucide:copy" width="18" height="18" />
                      </button>
                      <button 
                        onClick={() => handleEditRole(role)}
                        className="text-text-muted hover:text-accent transition-colors p-2 rounded-lg hover:bg-bg"
                        title="Edit Role"
                      >
                        <Icon icon="lucide:edit-3" width="18" height="18" />
                      </button>
                      <button 
                        onClick={() => setRoleToDelete(role)}
                        className="text-text-muted hover:text-error transition-colors p-2 rounded-lg hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete Role"
                        disabled={role._count?.users > 0}
                      >
                        <Icon icon="lucide:trash-2" width="18" height="18" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {isModalOpen && (
        <CreateEditRoleModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={fetchRoles}
          initialData={roleToEdit}
          mode={modalMode}
        />
      )}

      <ConfirmModal
        isOpen={!!roleToDelete}
        onClose={() => setRoleToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Role"
        description={roleToDelete ? `Are you sure you want to delete the role "${roleToDelete.name}"? This action cannot be undone.` : ''}
        confirmText={isDeleting ? "Deleting..." : "Delete Role"}
        variant="danger"
        icon="lucide:alert-triangle"
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
    </div>
  );
};
