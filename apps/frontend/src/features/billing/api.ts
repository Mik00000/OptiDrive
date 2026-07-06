import { apiClient } from '@/lib/api-client';

export interface BillingStatus {
  plan: string;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  gracePeriodStartedAt?: string | null;
}

/**
 * Отримати статус підписки поточного воркспейсу
 */
export const getBillingStatusApi = async (): Promise<BillingStatus> => {
  const response = await apiClient.get<{ success: boolean; data: BillingStatus }>('/api/internal/billing/status');
  return response.data;
};

/**
 * Створити Stripe Checkout Session для підписки PRO
 */
export const createCheckoutSessionApi = async (): Promise<string> => {
  const response = await apiClient.post<{ success: boolean; url: string }>('/api/internal/billing/create-checkout-session');
  return response.url;
};

/**
 * Створити Stripe Customer Portal Session для управління підпискою
 */
export const createPortalSessionApi = async (): Promise<string> => {
  const response = await apiClient.post<{ success: boolean; url: string }>('/api/internal/billing/create-portal-session');
  return response.url;
};

export interface EnterpriseRequestInput {
  contactName: string;
  contactEmail: string;
  companyName?: string;
  expectedStorage: string;
  expectedTraffic: string;
  expectedOptimizations?: string;
  teamSize?: string;
  message?: string;
}

export interface EnterpriseRequestStatus {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'CONTACTED' | 'CONVERTED' | 'DECLINED';
  createdAt: string;
  contactName: string;
  contactEmail: string;
  approvedStorageGb?: number | null;
  approvedBandwidthGb?: number | null;
  approvedOptimizations?: number | null;
  approvedPrice?: number | null;
  stripePaymentLink?: string | null;
}

/**
 * Створити запит на тарифний план Enterprise
 */
export const createEnterpriseRequestApi = async (data: EnterpriseRequestInput): Promise<{ success: boolean; message: string; requestId: string }> => {
  const response = await apiClient.post<{ success: boolean; message: string; requestId: string }>('/api/internal/billing/enterprise-request', data);
  return response;
};

/**
 * Отримати статус останнього Enterprise-запиту воркспейсу
 */
export const getEnterpriseRequestStatusApi = async (): Promise<EnterpriseRequestStatus | null> => {
  const response = await apiClient.get<{ success: boolean; data: EnterpriseRequestStatus | null }>('/api/internal/billing/enterprise-request/status');
  return response.data;
};

/**
 * Скасувати Enterprise-запит та повернути воркспейс на безкоштовний тариф (FREE)
 */
export const cancelEnterpriseRequestApi = async (): Promise<{ success: boolean; message: string }> => {
  return apiClient.post<{ success: boolean; message: string }>('/api/internal/billing/cancel-enterprise-request');
};

export interface InvoiceItem {
  id: string;
  number: string;
  amountPaid: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  date: number; // UNIX timestamp
  hostedInvoiceUrl: string | null;
}

/**
 * Отримати історію платежів (інвойсів)
 */
export const getInvoiceHistoryApi = async (): Promise<InvoiceItem[]> => {
  const response = await apiClient.get<{ success: boolean; invoices: InvoiceItem[] }>('/api/internal/billing/invoices');
  return response.invoices;
};

export interface UsageAlertSettings {
  storageWarningThreshold: number;
  bandwidthWarningThreshold: number;
  optimizationsWarningThreshold: number;
  storageAlertsEnabled: boolean;
  bandwidthAlertsEnabled: boolean;
  optimizationsAlertsEnabled: boolean;
}

/**
 * Отримати налаштування сповіщень про ліміти
 */
export const getUsageAlertSettingsApi = async (): Promise<UsageAlertSettings> => {
  const response = await apiClient.get<{ success: boolean; data: UsageAlertSettings }>('/api/internal/billing/usage-alerts');
  return response.data;
};

/**
 * Оновити налаштування сповіщень про ліміти
 */
export const updateUsageAlertSettingsApi = async (settings: UsageAlertSettings): Promise<{ success: boolean; message: string }> => {
  return apiClient.post<{ success: boolean; message: string }>('/api/internal/billing/usage-alerts', settings);
};

