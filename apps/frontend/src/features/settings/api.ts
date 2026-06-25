import { apiClient } from '@/lib/api-client';
import { Role, Permission } from '@optidrive/shared';

export interface WorkspaceUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: { id: string, name: string };
  createdAt: string;
}

export const getRolesApi = async () => {
  const response = await apiClient.get<{ data: (Role & { _count: { users: number } })[] }>('/api/internal/roles');
  return response.data;
};

export const createRoleApi = async (name: string, description: string | undefined, permissions: Permission[]) => {
  const response = await apiClient.post<{ data: Role }>('/api/internal/roles', { name, description, permissions });
  return response.data;
};

export const updateRoleApi = async (roleId: string, name?: string, description?: string, permissions?: Permission[]) => {
  const response = await apiClient.patch<{ data: Role }>(`/api/internal/roles/${roleId}`, { name, description, permissions });
  return response.data;
};

export const deleteRoleApi = async (roleId: string) => {
  const response = await apiClient.delete<{ message: string }>(`/api/internal/roles/${roleId}`);
  return response.message;
};

export const getWorkspaceUsersApi = async () => {
  const response = await apiClient.get<{ data: WorkspaceUser[] }>('/api/internal/workspace-users');
  return response.data;
};

export const inviteUserApi = async (email: string, roleId: string) => {
  const response = await apiClient.post<{ message: string }>('/api/internal/workspace-users/invite', { email, roleId });
  return response.message;
};

export const removeWorkspaceUserApi = async (userId: string) => {
  const response = await apiClient.delete<{ message: string }>(`/api/internal/workspace-users/${userId}`);
  return response.message;
};

export const updateUserRoleApi = async (userId: string, roleId: string) => {
  const response = await apiClient.patch<{ data: WorkspaceUser }>(`/api/internal/workspace-users/${userId}/role`, { roleId });
  return response.data;
};

export const leaveWorkspaceApi = async () => {
  const response = await apiClient.post<{ success: boolean, message: string, token: string }>('/api/internal/workspace-users/leave');
  return response;
};
