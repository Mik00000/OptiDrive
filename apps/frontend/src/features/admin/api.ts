import { apiClient } from '@/lib/api-client';

export interface AdminEnterpriseRequest {
  id: string;
  workspaceId: string;
  contactName: string;
  contactEmail: string;
  companyName: string | null;
  expectedStorage: string;
  expectedTraffic: string;
  teamSize: string | null;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'CONTACTED' | 'CONVERTED' | 'DECLINED';
  stripePaymentLink?: string | null;
  createdAt: string;
  workspace: {
    name: string;
    plan: string;
    storageUsed: string;
    bandwidthUsed: string;
  } | null;
}

/**
 * Отримати список усіх заявок на Enterprise
 */
export const getAdminEnterpriseRequestsApi = async (): Promise<AdminEnterpriseRequest[]> => {
  const response = await apiClient.get<{ success: boolean; data: AdminEnterpriseRequest[] }>('/api/internal/admin/enterprise-requests');
  return response.data;
};

/**
 * Схвалити заявку та задати кастомні ліміти
 */
export const approveEnterpriseRequestApi = async (
  id: string,
  limits: { storageGb: number; bandwidthGb: number; optimizations: number; price: number; couponCode?: string }
): Promise<{ success: boolean; message: string; paymentLink?: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string; paymentLink?: string }>(`/api/internal/admin/enterprise-requests/${id}/approve`, limits);
  return response;
};

/**
 * Відхилити заявку
 */
export const rejectEnterpriseRequestApi = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>(`/api/internal/admin/enterprise-requests/${id}/reject`);
  return response;
};

export interface AdminIncident {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  status: 'RESOLVED' | 'INVESTIGATING' | 'MONITORING';
  description: string;
  isActive: boolean;
}

/**
 * Отримати список усіх інцидентів
 */
export const getAdminIncidentsApi = async (): Promise<AdminIncident[]> => {
  const response = await apiClient.get<{ success: boolean; data: AdminIncident[] }>('/api/internal/admin/incidents');
  return response.data;
};

/**
 * Створити інцидент
 */
export const createIncidentApi = async (incident: {
  title: string;
  status: string;
  description: string;
  isActive?: boolean;
}): Promise<{ success: boolean; data: AdminIncident }> => {
  const response = await apiClient.post<{ success: boolean; data: AdminIncident }>('/api/internal/admin/incidents', incident);
  return response;
};

/**
 * Оновити інцидент
 */
export const updateIncidentApi = async (
  id: string,
  incident: { title?: string; status?: string; description?: string; isActive?: boolean }
): Promise<{ success: boolean; data: AdminIncident }> => {
  const response = await apiClient.patch<{ success: boolean; data: AdminIncident }>(`/api/internal/admin/incidents/${id}`, incident);
  return response;
};

/**
 * Видалити інцидент
 */
export const deleteIncidentApi = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.delete<{ success: boolean; message: string }>(`/api/internal/admin/incidents/${id}`);
  return response;
};

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isBanned: boolean;
  storageUsed: string;
  bandwidthUsed: string;
  storageBonusBytes: string;
  monthlyOptimizations: number;
  enterpriseStorageBytes: string | null;
  enterpriseBandwidthBytes: string | null;
  enterpriseOptimizations: number | null;
  createdAt: string;
  members: {
    id: string;
    name: string | null;
    email: string;
  }[];
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  isBanned: boolean;
  createdAt: string;
}

export interface AdminTrafficMetric {
  time: string;
  ok: number;
  clientErr: number;
  serverErr: number;
  bytes: number;
}

/**
 * Отримати список усіх воркспейсів та користувачів
 */
export const getAdminWorkspacesAndUsersApi = async (): Promise<{ workspaces: AdminWorkspace[]; users: AdminUser[] }> => {
  const response = await apiClient.get<{ success: boolean; data: { workspaces: AdminWorkspace[]; users: AdminUser[] } }>('/api/internal/admin/workspaces');
  return response.data;
};

/**
 * Оновити обсяг бонусного сховища для воркспейсу
 */
export const updateWorkspaceBonusApi = async (id: string, bonusGb: number): Promise<{ success: boolean; data: { id: string; storageBonusBytes: string } }> => {
  const response = await apiClient.post<{ success: boolean; data: { id: string; storageBonusBytes: string } }>(`/api/internal/admin/workspaces/${id}/bonus`, { bonusGb });
  return response;
};

/**
 * Заблокувати або розблокувати воркспейс
 */
export const toggleWorkspaceBanApi = async (id: string, isBanned: boolean): Promise<{ success: boolean; data: { id: string; isBanned: boolean } }> => {
  const response = await apiClient.post<{ success: boolean; data: { id: string; isBanned: boolean } }>(`/api/internal/admin/workspaces/${id}/ban`, { isBanned });
  return response;
};

/**
 * Заблокувати або розблокувати користувача
 */
export const toggleUserBanApi = async (id: string, isBanned: boolean): Promise<{ success: boolean; data: { id: string; isBanned: boolean } }> => {
  const response = await apiClient.post<{ success: boolean; data: { id: string; isBanned: boolean } }>(`/api/internal/admin/users/${id}/ban`, { isBanned });
  return response;
};

/**
 * Очистити кеш CDN
 */
export const purgeCdnCacheApi = async (purgeRequest: { type: 'path' | 'tag'; value: string }): Promise<{ success: boolean; message: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string }>('/api/internal/admin/cdn/purge', purgeRequest);
  return response;
};

/**
 * Отримати аналітику трафіку
 */
export const getAdminTrafficAnalyticsApi = async (): Promise<AdminTrafficMetric[]> => {
  const response = await apiClient.get<{ success: boolean; data: AdminTrafficMetric[] }>('/api/internal/admin/traffic/realtime');
  return response.data;
};
