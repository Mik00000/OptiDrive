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

export interface UserProfileData {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}

export interface UpdateProfileResponse {
  success: boolean;
  requiresEmailVerification?: boolean;
  pendingEmail?: string;
  message?: string;
  data?: UserProfileData;
}

export const updateUserProfileApi = async (name: string, email: string): Promise<UpdateProfileResponse> => {
  const response = await apiClient.put<UpdateProfileResponse>('/api/internal/user/profile', { name, email });
  return response;
};

export const confirmEmailChangeApi = async (code: string): Promise<{ success: boolean; data: UserProfileData }> => {
  const response = await apiClient.post<{ success: boolean; data: UserProfileData }>('/api/internal/user/confirm-email-change', { code });
  return response;
};

export const uploadAvatarApi = async (file: File) => {
  const formData = new FormData();
  formData.append('avatar', file);
  const response = await apiClient.post<{ success: boolean; data: UserProfileData }>('/api/internal/user/avatar', formData);
  return response.data;
};

export const deleteAvatarApi = async () => {
  const response = await apiClient.delete<{ data: UserProfileData }>('/api/internal/user/avatar');
  return response.data;
};

export const deleteUserAccountApi = async () => {
  const response = await apiClient.delete<{ success: boolean, message: string }>('/api/internal/user/account');
  return response;
};

export interface WorkspaceUpdateData {
  id: string;
  name: string;
  slug: string;
}

export const updateWorkspaceApi = async (name: string, slug?: string) => {
  const response = await apiClient.put<{ data: WorkspaceUpdateData }>('/api/internal/workspace/update', { name, slug });
  return response.data;
};

export const deleteWorkspaceApi = async () => {
  const response = await apiClient.delete<{ success: boolean, message: string, token: string, switchWorkspaceId: string | null }>('/api/internal/workspace/delete');
  return response;
};

export const changePasswordApi = async (currentPassword: string, newPassword: string) => {
  const response = await apiClient.put<{ success: boolean, message: string }>('/api/internal/user/change-password', {
    currentPassword,
    newPassword
  });
  return response;
};

