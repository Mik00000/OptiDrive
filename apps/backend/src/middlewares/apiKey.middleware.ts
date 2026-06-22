import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { KeyPermission } from '@prisma/client';

export interface ApiRequest extends Request {
  workspaceId?: string;
  apiKeyId?: string;
  permissions?: KeyPermission;
}

export const authenticateApiKey = async (req: ApiRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: Missing or invalid API key' });
      return;
    }

    const rawToken = authHeader.split(' ')[1];
    if (!rawToken) {
      res.status(401).json({ error: 'Unauthorized: API key not provided' });
      return;
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { tokenHash }
    });

    if (!apiKey) {
      res.status(401).json({ error: 'Unauthorized: Invalid API key' });
      return;
    }

    // Update lastUsedAt in the background
    prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    }).catch(err => console.error('Failed to update apiKey lastUsedAt', err));

    req.workspaceId = apiKey.workspaceId;
    req.apiKeyId = apiKey.id;
    req.permissions = apiKey.permissions;

    next();
  } catch (error) {
    console.error('API Key Authentication Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
