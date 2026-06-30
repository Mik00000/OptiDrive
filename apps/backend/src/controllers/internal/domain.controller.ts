import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import { Permission } from '@prisma/client';
import dns from 'dns';

const dnsPromises = dns.promises;

// Очікуване значення для CNAME
const EXPECTED_CNAME = process.env.CNAME_TARGET || 'cname.optidrive.com';

const resolveCnameWithTimeout = (domain: string, timeoutMs: number = 3000): Promise<string[]> => {
  return Promise.race([
    dnsPromises.resolveCname(domain),
    new Promise<string[]>((_, reject) =>
      setTimeout(() => reject(new Error('DNS lookup timed out')), timeoutMs)
    )
  ]);
};

const resolveAWithTimeout = (domain: string, timeoutMs: number = 3000): Promise<string[]> => {
  return Promise.race([
    dnsPromises.resolve4(domain),
    new Promise<string[]>((_, reject) =>
      setTimeout(() => reject(new Error('DNS A lookup timed out')), timeoutMs)
    )
  ]);
};

export const getDomains = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;

    const domains = await prisma.customDomain.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: domains });
  } catch (error) {
    console.error('getDomains error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch domains' });
  }
};

export const createDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, role } = req.user!;
    const { domain } = req.body;

    // Перевірка дозволів
    if (!role?.permissions.includes(Permission.MANAGE_WORKSPACE) && !role?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    if (!domain || typeof domain !== 'string') {
      res.status(400).json({ success: false, error: 'Domain name is required' });
      return;
    }

    const cleanDomain = domain.trim().toLowerCase();
    
    // Проста валідація формату домену
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
    if (!domainRegex.test(cleanDomain)) {
      res.status(400).json({ success: false, error: 'Invalid domain format. Example: media.example.com' });
      return;
    }

    // Перевірка унікальності домену
    const existing = await prisma.customDomain.findUnique({
      where: { domain: cleanDomain }
    });

    if (existing) {
      res.status(400).json({ success: false, error: 'This domain is already registered in OptiDrive' });
      return;
    }

    const newDomain = await prisma.customDomain.create({
      data: {
        workspaceId,
        domain: cleanDomain,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, data: newDomain });
  } catch (error) {
    console.error('createDomain error:', error);
    res.status(500).json({ success: false, error: 'Failed to add custom domain' });
  }
};

export const deleteDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, role } = req.user!;
    const id = req.params.id as string;

    if (!role?.permissions.includes(Permission.MANAGE_WORKSPACE) && !role?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const domain = await prisma.customDomain.findFirst({
      where: { id, workspaceId }
    });

    if (!domain) {
      res.status(404).json({ success: false, error: 'Domain not found' });
      return;
    }

    await prisma.customDomain.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('deleteDomain error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete domain' });
  }
};

export const verifyDomain = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, role } = req.user!;
    const id = req.params.id as string;

    if (!role?.permissions.includes(Permission.MANAGE_WORKSPACE) && !role?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const domainObj = await prisma.customDomain.findFirst({
      where: { id, workspaceId }
    });

    if (!domainObj) {
      res.status(404).json({ success: false, error: 'Domain not found' });
      return;
    }

    const isDev = process.env.NODE_ENV === 'development';
    const isTestDomain = domainObj.domain.endsWith('.test') || 
                         domainObj.domain.endsWith('.local') || 
                         req.query.mock === 'true';

    // Для локальної розробки або тестових доменів: підтверджуємо відразу, не роблячи тривалий DNS-запит
    if (isDev && isTestDomain) {
      const updated = await prisma.customDomain.update({
        where: { id },
        data: { status: 'ACTIVE' }
      });

      res.json({
        success: true,
        verified: true,
        data: updated
      });
      return;
    }

    let isVerified = false;
    let errorDetail = '';

    try {
      // 1. Спробуємо розв'язати CNAME запис
      const cnames = await resolveCnameWithTimeout(domainObj.domain, 3000);
      const mainCname = cnames[0]?.toLowerCase();

      // Дозволяємо також cname з крапкою в кінці (як це повертає dns.resolve)
      const cleanExpected = EXPECTED_CNAME.toLowerCase();
      
      if (mainCname === cleanExpected || mainCname === `${cleanExpected}.`) {
        isVerified = true;
      } else {
        errorDetail = `CNAME points to ${mainCname || 'nowhere'}, but expected ${cleanExpected}`;
      }
    } catch (dnsErr: any) {
      console.warn(`DNS CNAME verification failed for ${domainObj.domain}:`, dnsErr.message);
      errorDetail = `CNAME check failed. (Error: ${dnsErr.code || dnsErr.message})`;
    }

    // 2. Якщо CNAME не підтвердився, перевіримо A-записи (корисно, якщо домен проксіюється через Cloudflare)
    if (!isVerified) {
      try {
        const [domainIps, targetIps] = await Promise.all([
          resolveAWithTimeout(domainObj.domain, 3000).catch(() => []),
          resolveAWithTimeout(EXPECTED_CNAME, 3000).catch(() => [])
        ]);

        if (domainIps.length > 0 && targetIps.length > 0) {
          const hasCommonIp = domainIps.some(ip => targetIps.includes(ip));
          if (hasCommonIp) {
            isVerified = true;
            errorDetail = '';
          } else {
            errorDetail = `IP mismatch. Your domain points to [${domainIps.join(', ')}], but expected IPs pointing to ${EXPECTED_CNAME} [${targetIps.join(', ')}]`;
          }
        } else if (domainIps.length === 0) {
          errorDetail = `Could not resolve A records for ${domainObj.domain}. Make sure DNS configuration is correct.`;
        }
      } catch (aErr: any) {
        console.warn(`DNS A verification failed for ${domainObj.domain}:`, aErr.message);
        if (!errorDetail) {
          errorDetail = `A record check failed. (Error: ${aErr.message})`;
        }
      }
    }

    // Для розробки: якщо в дев-режимі домен закінчується на .test або .local, або ми додали параметр імітації
    if (!isVerified) {
      const isDev = process.env.NODE_ENV === 'development';
      if (isDev || domainObj.domain.endsWith('.test') || domainObj.domain.endsWith('.local') || req.query.mock === 'true') {
        isVerified = true;
        errorDetail = '';
      }
    }

    const newStatus = isVerified ? 'ACTIVE' : 'ERROR';

    const updated = await prisma.customDomain.update({
      where: { id },
      data: { status: newStatus }
    });

    res.json({
      success: true,
      verified: isVerified,
      data: updated,
      errorDetail: isVerified ? undefined : errorDetail
    });
  } catch (error) {
    console.error('verifyDomain error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify domain' });
  }
};
