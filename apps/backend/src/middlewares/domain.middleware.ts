import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export interface DomainRequest extends Request {
  customDomain?: {
    id: string;
    domain: string;
    workspaceId: string;
  };
}

const SYSTEM_DOMAINS = [
  'localhost',
  'optidrive.com',
  'api.optidrive.com',
  'optidrive.app',
  'api.optidrive.app',
  'localhost:3001',
  'localhost:3000'
];

export const detectCustomDomain = async (req: DomainRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const host = ((req.headers['x-forwarded-host'] as string) || req.headers.host)?.toLowerCase();

    if (!host) {
      next();
      return;
    }

    // Очистимо хост від порту (якщо є, наприклад, localhost:3001)
    const cleanHost = (host.split(':')[0] || '') as string;

    // Додаємо конфігуровані домени платформи з env
    const apiHost = process.env.API_URL ? new URL(process.env.API_URL as string).hostname.toLowerCase() : '';
    const frontendHost = process.env.FRONTEND_URL ? new URL(process.env.FRONTEND_URL as string).hostname.toLowerCase() : '';

    const isSystem = SYSTEM_DOMAINS.includes(cleanHost) || 
                     cleanHost === apiHost || 
                     cleanHost === frontendHost;

    if (isSystem) {
      next();
      return;
    }

    // Шукаємо кастомний домен у базі даних
    const customDomain = await prisma.customDomain.findUnique({
      where: { domain: cleanHost },
      select: {
        id: true,
        domain: true,
        workspaceId: true,
        status: true
      }
    });

    if (customDomain && customDomain.status === 'ACTIVE') {
      req.customDomain = {
        id: customDomain.id,
        domain: customDomain.domain,
        workspaceId: customDomain.workspaceId
      };
      console.log(`[DomainMiddleware] Request routed via Custom Domain: ${cleanHost} -> Workspace: ${customDomain.workspaceId}`);
    }

    next();
  } catch (error) {
    console.error('Error in detectCustomDomain middleware:', error);
    next();
  }
};
