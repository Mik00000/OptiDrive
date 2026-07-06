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
  limits: { storageGb: number; bandwidthGb: number; optimizations: number; price: number }
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
