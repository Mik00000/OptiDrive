"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string | number;
  name: string;
  email: string;
  workspaceId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Відновлення сесії з localStorage при першому рендері
  useEffect(() => {
    // Оновлюємо стейт асинхронно, щоб уникнути cascading renders
    setTimeout(() => {
      try {
        const storedToken = localStorage.getItem('optidrive_token');
        const storedUser = localStorage.getItem('optidrive_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Помилка відновлення сесії:', error);
        // Очищаємо пошкоджені дані
        localStorage.removeItem('optidrive_token');
        localStorage.removeItem('optidrive_user');
      } finally {
        setIsLoading(false);
      }
    }, 0);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('optidrive_token', newToken);
    localStorage.setItem('optidrive_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('optidrive_token');
    localStorage.removeItem('optidrive_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout }}>
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
