import { apiClient } from '@/lib/api-client';

export interface BillingStatus {
  plan: string;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
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
