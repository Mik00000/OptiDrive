import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../config/prisma';
import { Permission } from '@prisma/client';

export const requirePermissions = (requiredPermissions: Permission[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        return;
      }

      const { userId, workspaceId } = req.user;

      const user = await prisma.user.findUnique({
        where: { id: userId, workspaceId },
        include: { role: true }
      });

      if (!user || !user.role) {
        res.status(403).json({ error: 'Forbidden: User or role not found' });
        return;
      }

      const hasPermission = requiredPermissions.every(p => user.role!.permissions.includes(p));

      // Special case: if user has a system role 'Owner' they have all permissions
      const isOwner = user.role.isSystem && user.role.name === 'Owner';

      if (!isOwner && !hasPermission) {
        res.status(403).json({ error: `Forbidden: Requires permissions: ${requiredPermissions.join(', ')}` });
        return;
      }

      req.user.role = user.role;

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ error: 'Internal Server Error during role verification' });
    }
  };
};
