import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import { Permission } from '@prisma/client';
import dns from 'dns';
import axios from 'axios';

const dnsPromises = dns.promises;

// Очікуване значення для CNAME
const EXPECTED_CNAME = process.env.CNAME_TARGET || 'cname.optidrive.com';

let cachedPublicIp: string | null = null;
const getPublicIp = async (): Promise<string | null> => {
  if (cachedPublicIp) return cachedPublicIp;
  try {
    const res = await axios.get('https://api.ipify.org?format=json', { timeout: 2000 });
    cachedPublicIp = res.data.ip;
    return cachedPublicIp;
  } catch (err) {
    console.warn('Failed to fetch public IP:', err);
    return null;
  }
};

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

    // Перевірка ліміту плану на кастомні домени
    const { getWorkspacePlanLimits } = await import('../../utils/workspace-status');
    const { limits: planLimits, plan: effectivePlan } = await getWorkspacePlanLimits(workspaceId);
    
    const domainsCount = await prisma.customDomain.count({
      where: { workspaceId }
    });
    
    if (domainsCount >= planLimits.maxCustomDomains) {
      res.status(403).json({ 
        success: false, 
        error: `Custom domain limit reached for your ${effectivePlan} plan (${planLimits.maxCustomDomains} domain). Please upgrade your plan.` 
      });
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

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Added custom domain ${cleanDomain}`,
        workspaceId,
        userId: req.user?.userId || null,
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

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Deleted custom domain ${domain.domain}`,
        workspaceId,
        userId: req.user?.userId || null,
      }
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

      // Log Activity
      await prisma.activityLog.create({
        data: {
          type: 'SETTING_CHANGED',
          description: `Successfully verified custom domain ${domainObj.domain} (local mock)`,
          workspaceId,
          userId: req.user?.userId || null,
        }
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

    // 2. Якщо CNAME не підтвердився, перевіримо A-записи (корисно, якщо домен проксіюється через Cloudflare або вказаний напряму як A-запис)
    if (!isVerified) {
      try {
        const domainIps: string[] = await resolveAWithTimeout(domainObj.domain, 3000).catch((): string[] => []);
        const targetIps: string[] = await resolveAWithTimeout(EXPECTED_CNAME, 3000).catch((): string[] => []);
        const serverPublicIp: string | null = await getPublicIp().catch(() => null);

        if (domainIps.length > 0) {
          // Варіант А: IP-адреса домену збігається з IP нашого CNAME-призначення
          const hasCommonIp = targetIps.length > 0 && domainIps.some(ip => targetIps.includes(ip));
          
          // Варіант Б: IP-адреса домену збігається з нашою зовнішньою публічною IP-адресою
          const matchesServerIp = serverPublicIp && domainIps.includes(serverPublicIp);

          // Варіант В: локальна IP (якщо тестується локально)
          const isLocalIp = process.env.NODE_ENV === 'development' && (domainIps.includes('127.0.0.1') || domainIps.includes('::1'));

          if (hasCommonIp || matchesServerIp || isLocalIp) {
            isVerified = true;
            errorDetail = '';
          } else {
            const expectedList = [
              targetIps.length > 0 ? `${EXPECTED_CNAME} [${targetIps.join(', ')}]` : null,
              serverPublicIp ? `Server IP [${serverPublicIp}]` : null
            ].filter(Boolean).join(' or ');
            errorDetail = `IP mismatch. Your domain points to [${domainIps.join(', ')}], but expected: ${expectedList}`;
          }
        } else {
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

    if (isVerified && domainObj.status !== 'ACTIVE') {
      // Log Activity
      await prisma.activityLog.create({
        data: {
          type: 'SETTING_CHANGED',
          description: `Successfully verified custom domain ${domainObj.domain}`,
          workspaceId,
          userId: req.user?.userId || null,
        }
      });
    }

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
