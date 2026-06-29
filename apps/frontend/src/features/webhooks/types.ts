export interface Webhook {
  id: string;
  name: string;
  url: string;
  secret: string;
  isActive: boolean;
  events: string[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    deliveries: number;
  };
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  status: number;
  success: boolean;
  payload: string;
  response: string | null;
  duration: number;
  createdAt: string;
}
