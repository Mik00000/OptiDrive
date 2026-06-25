export type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE';

export interface PlanLimits {
  storageBytes: number;
  bandwidthBytes: number;
  monthlyOptimizations: number;
  maxFileSize: number;
  maxApiKeys: number;
  maxMembers: number;
  maxCustomRoles: number;
}

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export const PLANS: Record<PlanType, PlanLimits> = {
  FREE: {
    storageBytes: 1 * GB,
    bandwidthBytes: 10 * GB,
    monthlyOptimizations: 500,
    maxFileSize: 5 * MB,
    maxApiKeys: 1,
    maxMembers: 2,
    maxCustomRoles: 0,
  },
  PRO: {
    storageBytes: 50 * GB,
    bandwidthBytes: 500 * GB,
    monthlyOptimizations: 10000,
    maxFileSize: 20 * MB,
    maxApiKeys: 10,
    maxMembers: 10,
    maxCustomRoles: 5,
  },
  ENTERPRISE: {
    storageBytes: 250 * GB,
    bandwidthBytes: 2000 * GB, // 2 TB
    monthlyOptimizations: 100000,
    maxFileSize: 50 * MB,
    maxApiKeys: 50,
    maxMembers: 999999, // practically unlimited
    maxCustomRoles: 999999,
  },
};
