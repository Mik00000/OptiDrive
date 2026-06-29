import { useState, useEffect, useCallback } from "react";
import { type Webhook, type WebhookDelivery } from "./types";
import { apiClient } from "@/lib/api-client";

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get<{ success: boolean; data: Webhook[] }>('/api/internal/webhooks');
      if (response.success) {
        setWebhooks(response.data);
      }
    } catch (error) {
      console.error("Failed to load webhooks:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleCreate = useCallback(async (name: string, url: string, events: string[]) => {
    try {
      const response = await apiClient.post<{ success: boolean; data: Webhook }>('/api/internal/webhooks', {
        name,
        url,
        events
      });
      if (response.success) {
        setWebhooks((prev) => [response.data, ...prev]);
        return response.data;
      }
    } catch (error) {
      console.error("Failed to create webhook:", error);
      throw error;
    }
  }, []);

  const handleUpdate = useCallback(async (id: string, updates: Partial<Webhook>) => {
    try {
      const response = await apiClient.patch<{ success: boolean; data: Webhook }>(`/api/internal/webhooks/${id}`, updates);
      if (response.success) {
        setWebhooks((prev) => prev.map((w) => w.id === id ? response.data : w));
        return response.data;
      }
    } catch (error) {
      console.error("Failed to update webhook:", error);
      throw error;
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const response = await apiClient.delete<{ success: boolean; message: string }>(`/api/internal/webhooks/${id}`);
      if (response.success) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete webhook:", error);
      throw error;
    }
  }, []);

  const handleTest = useCallback(async (id: string) => {
    setIsTesting(id);
    try {
      const response = await apiClient.post<{ success: boolean; status: number; duration: number }>((`/api/internal/webhooks/${id}/test`));
      return response;
    } catch (error) {
      console.error("Failed to test webhook:", error);
      throw error;
    } finally {
      setIsTesting(null);
    }
  }, []);

  const fetchDeliveries = useCallback(async (id: string): Promise<WebhookDelivery[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: WebhookDelivery[] }>(`/api/internal/webhooks/${id}/deliveries`);
      if (response.success) {
        return response.data;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch webhook deliveries:", error);
      return [];
    }
  }, []);

  return {
    webhooks,
    isLoading,
    isTesting,
    fetchWebhooks,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleTest,
    fetchDeliveries
  };
}
