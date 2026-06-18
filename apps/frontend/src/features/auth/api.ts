import { apiClient } from '@/lib/api-client';

export interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string | number;
    name: string;
    email: string;
    workspaceId?: string;
  };
}

/**
 * Робить POST запит для входу користувача.
 */
export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/internal/login', { email, password });
}

/**
 * Робить POST запит для реєстрації нового користувача.
 */
export async function registerApi(email: string, password: string, name: string): Promise<AuthResponse> {
  return apiClient.post<AuthResponse>('/api/internal/register', { email, password, name });
}
