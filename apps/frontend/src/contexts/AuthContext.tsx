"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string | number;
  name: string;
  email: string;
  workspaceId?: string;
  hasPassword?: boolean;
  avatarUrl?: string | null;
}

interface WorkspaceRole {
  id: string;
  name: string;
  permissions: string[];
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isLocked?: boolean;
  membersCount?: number;
  role: WorkspaceRole;
  customS3Enabled?: boolean;
  s3AccessKeyId?: string | null;
  s3Endpoint?: string | null;
  s3BucketName?: string | null;
  s3Region?: string | null;
  s3PublicUrl?: string | null;
  migrationStatus?: string;
  migrationProgress?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  workspaces: Workspace[];
  login: (token: string, user: User, skipRedirect?: boolean) => void;
  logout: () => void;
  fetchWorkspaces: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchWorkspaces = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Workspace[] }>('/api/internal/workspace/list');
      if (response.success) {
        setWorkspaces(response.data);
      }
    } catch (error) {
      console.error('Помилка завантаження робочих просторів:', error);
    }
  };

  // Відновлення сесії з localStorage при першому рендері
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = localStorage.getItem('optidrive_token');
        const storedUser = localStorage.getItem('optidrive_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          
          try {
            const response = await apiClient.get<{ success: boolean; data: Workspace[] }>('/api/internal/workspace/list');
            if (response.success) {
              setWorkspaces(response.data);
            }
          } catch (e) {
            console.error('Не вдалося завантажити воркспейси при старті:', e);
          }

          // Dynamic profile refresh to ensure name/avatar/etc is fresh
          try {
            const profileResponse = await apiClient.get<{ success: boolean; data: User }>('/api/internal/user/profile');
            if (profileResponse.success) {
              const updatedUser = { ...parsedUser, ...profileResponse.data };
              setUser(updatedUser);
              localStorage.setItem('optidrive_user', JSON.stringify(updatedUser));
            }
          } catch (profileErr) {
            console.error('Failed to refresh user profile upon startup:', profileErr);
          }
        }
      } catch (error) {
        console.error('Помилка відновлення сесії:', error);
        localStorage.removeItem('optidrive_token');
        localStorage.removeItem('optidrive_user');
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // Handle Safari/Chrome bfcache back-navigation freezing
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setIsLoading(false);
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const login = (newToken: string, newUser: User, skipRedirect = false) => {
    localStorage.setItem('optidrive_token', newToken);
    localStorage.setItem('optidrive_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    
    fetchWorkspaces().catch(console.error);

    if (skipRedirect) return;

    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get('returnTo');
    if (returnTo && returnTo.startsWith('/')) {
      router.push(returnTo);
    } else {
      router.push('/dashboard');
    }
  };

  const logout = () => {
    apiClient.post('/api/internal/logout').catch((err) => {
      console.error('Failed to logout on backend:', err);
    });
    localStorage.removeItem('optidrive_token');
    localStorage.removeItem('optidrive_user');
    setToken(null);
    setUser(null);
    setWorkspaces([]);
    router.push('/login');
  };

  const switchWorkspace = async (workspaceId: string) => {
    try {
      const response = await apiClient.post<{ success: boolean; token: string; user: User }>('/api/internal/workspace/switch', { workspaceId });
      if (response.success) {
        localStorage.setItem('optidrive_token', response.token);
        localStorage.setItem('optidrive_user', JSON.stringify(response.user));
        setToken(response.token);
        setUser(response.user);
        
        await fetchWorkspaces();
        
        router.push('/dashboard');
        window.location.href = '/dashboard';
      }
    } catch (error) {
      throw error;
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace> => {
    try {
      const response = await apiClient.post<{ success: boolean; data: Workspace }>('/api/internal/workspace/create', { name });
      if (response.success) {
        await fetchWorkspaces();
        return response.data;
      }
      throw new Error('Failed to create workspace');
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isAuthenticated: !!token, 
      isLoading, 
      workspaces, 
      login, 
      logout, 
      fetchWorkspaces, 
      switchWorkspace,
      createWorkspace
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
