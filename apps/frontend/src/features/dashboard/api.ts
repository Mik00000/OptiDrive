import { apiClient } from '@/lib/api-client';

export interface WorkspaceStats {
  id: string;
  name: string;
  slug: string;
  plan: string;
  storageUsed: string;
  bandwidthUsed: string;
  monthlyOptimizations: number;
  totalFiles: number;
  activeApiKeys: number;
  totalOriginalBytes: string;
  totalOptimizedBytes: string;
  totalBytesSaved: string;
  limits: {
    storageBytes: string;
    bandwidthBytes: string;
    monthlyOptimizations: number;
    maxFileSize: string;
    maxApiKeys: number;
  };
  recentActivity: any[];
  analytics: { date: string, bytesSaved: number, requests: number }[];
}

export const getWorkspaceStatsApi = async (): Promise<WorkspaceStats> => {
  const response = await apiClient.get<{ data: WorkspaceStats }>('/api/internal/workspace/stats');
  return response.data;
};
