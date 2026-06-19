import { apiClient } from '@/lib/api-client';

export interface AuthResponse {
  success: boolean;
  token?: string;
  requiresVerification?: boolean;
  user: {
    id: string | number;
    name: string;
    email: string;
    workspaceId?: string;
  };
}

export interface RegisterResponse {
  success: boolean;
  requiresVerification: boolean;
  user: {
    id: string | number;
    name: string;
    email: string;
    workspaceId?: string;
  };
}

export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/internal/login', { email, password });
}

export async function registerApi(email: string, password: string, name: string): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse>('/api/internal/register', { email, password, name });
}

export async function verifyEmailApi(email: string, code: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/internal/verify-email', { email, code });
}

export async function resendVerificationEmailApi(email: string): Promise<{ success: boolean }> {
  return apiClient.post<{ success: boolean }>('/api/internal/resend-verification-email', { email });
}

export async function forgotPasswordApi(email: string): Promise<{ success: boolean, message: string }> {
  return apiClient.post<{ success: boolean, message: string }>('/api/internal/forgot-password', { email });
}

export async function resetPasswordApi(token: string, newPassword: string): Promise<{ success: boolean, message: string }> {
  return apiClient.post<{ success: boolean, message: string }>('/api/internal/reset-password', { token, newPassword });
}
