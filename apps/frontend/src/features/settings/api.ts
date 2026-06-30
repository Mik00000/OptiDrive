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
  const response = await apiClient.post<{ success: boolean, message: string, token: string, workspaceId: string }>('/api/internal/workspace-users/leave');
  return response;
};

export const transferOwnershipApi = async (targetUserId: string) => {
  const response = await apiClient.post<{ success: boolean, message: string }>('/api/internal/workspace-users/transfer-ownership', { targetUserId });
  return response;
};

export interface CompressionDefaults {
  defaultPreset: string;
  defaultFormat: string;
  defaultQuality: number;
  defaultStripMetadata: boolean;
  defaultMaxWidth: number | null;
  defaultMaxHeight: number | null;
  defaultFit: string;
}

export const getCompressionDefaultsApi = async () => {
  const response = await apiClient.get<{ data: CompressionDefaults }>('/api/internal/workspace/compression-defaults');
  return response.data;
};

export const updateCompressionDefaultsApi = async (defaults: Partial<CompressionDefaults>) => {
  const response = await apiClient.put<{ data: CompressionDefaults }>('/api/internal/workspace/compression-defaults', defaults);
  return response.data;
};

export interface UserNotificationPreferences {
  emailWeeklySummary: boolean;
  emailQuotaWarnings: boolean;
  emailSecurityAlerts: boolean;
  emailBillingAlerts: boolean;
}

export const getUserNotificationsApi = async () => {
  const response = await apiClient.get<{ data: UserNotificationPreferences }>('/api/internal/user/notifications');
  return response.data;
};

export const updateUserNotificationsApi = async (preferences: UserNotificationPreferences) => {
  const response = await apiClient.put<{ data: UserNotificationPreferences }>('/api/internal/user/notifications', preferences);
  return response.data;
};

