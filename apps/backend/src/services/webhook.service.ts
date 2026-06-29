import { prisma } from '../config/prisma';
import axios from 'axios';
import crypto from 'crypto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: any;
}

export const triggerWebhooks = async (
  workspaceId: string,
  event: string,
  data: any
): Promise<void> => {
  // Запуск у фоні (не блокуємо основний потік відповіді користувачу)
  setImmediate(async () => {
    try {
      const webhooks = await prisma.webhook.findMany({
        where: {
          workspaceId,
          isActive: true,
          events: {
            has: event,
          },
        },
      });

      if (webhooks.length === 0) {
        return;
      }

      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const payloadString = JSON.stringify(payload);

      for (const webhook of webhooks) {
        // Обчислюємо підпис HMAC-SHA256 для верифікації запиту на стороні отримувача
        const signature = crypto
          .createHmac('sha256', webhook.secret)
          .update(payloadString)
          .digest('hex');

        const startTime = Date.now();
        let status = 0;
        let responseBody = '';
        let success = false;

        try {
          const response = await axios.post(webhook.url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-OptiDrive-Signature': `sha256=${signature}`,
              'X-OptiDrive-Event': event,
            },
            timeout: 10000, // 10 секунд таймаут
          });

          status = response.status;
          responseBody = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
          success = status >= 200 && status < 300;
        } catch (error: any) {
          if (error.response) {
            status = error.response.status;
            responseBody = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data);
          } else {
            status = 500;
            responseBody = error.message || 'Unknown network error';
          }
          success = false;
        } finally {
          const duration = Date.now() - startTime;

          // Зберігаємо історію доставки вебхука
          await prisma.webhookDelivery.create({
            data: {
              webhookId: webhook.id,
              event,
              status,
              success,
              payload: payloadString,
              response: responseBody.slice(0, 1000), // Обмежуємо розмір відповіді
              duration,
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to trigger webhooks:', err);
    }
  });
};
