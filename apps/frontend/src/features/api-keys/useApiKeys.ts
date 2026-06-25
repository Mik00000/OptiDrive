import { useState, useEffect, useCallback } from "react";
import { type ApiKey, type Permission } from "./types";
import { apiClient } from "@/lib/api-client";

export function useApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<ApiKey[]>('/api/internal/api-keys');
      setKeys(data);
    } catch (error) {
      console.error("Failed to load keys:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialKeys() {
      try {
        const data = await apiClient.get<ApiKey[]>('/api/internal/api-keys');
        if (!ignore) {
          setKeys(data);
        }
      } catch (error) {
        if (!ignore) {
          console.error("Failed to load keys:", error);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialKeys();

    return () => {
      ignore = true;
    };
  }, []);

  const handleCopy = useCallback((id: string, token: string) => {
    navigator.clipboard.writeText(token).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleRevoke = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/api/internal/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (error) {
      console.error("Failed to revoke key:", error);
    }
  }, []);

  const handleGenerate = useCallback(async (name: string, permission: Permission) => {
    try {
      const response = await apiClient.post<{ key: ApiKey, rawToken: string }>('/api/internal/api-keys', {
        name,
        permissions: permission
      });
      
      setKeys((prev) => [response.key, ...prev]);
      
      return response.rawToken;
    } catch (error) {
      throw error;
    }
  }, []);

  return {
    keys,
    copiedId,
    isLoading,
    handleCopy,
    handleRevoke,
    handleGenerate,
    fetchKeys,
  };
}
