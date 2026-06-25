import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

import { Permission, Role } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: { 
    userId: string; 
    workspaceId: string; 
    role?: Role;
  };
}

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized: Malformed token' });
    return;
  }

  try {
    const decoded = verifyToken(token);
    
    req.user = decoded; 
    
    next(); 
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};