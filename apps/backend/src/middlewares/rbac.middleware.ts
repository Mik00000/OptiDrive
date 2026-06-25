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

      const member = await prisma.workspaceUser.findUnique({
        where: {
          userId_workspaceId: {
            userId,
            workspaceId
          }
        },
        include: { role: true }
      });

      if (!member || !member.role) {
        res.status(403).json({ error: 'Forbidden: User is not a member of this workspace or has no assigned role' });
        return;
      }

      const hasPermission = requiredPermissions.every(p => member.role.permissions.includes(p));

      // Special case: if user has a system role 'Owner' they have all permissions
      const isOwner = member.role.isSystem && member.role.name === 'Owner';

      if (!isOwner && !hasPermission) {
        res.status(403).json({ error: `Forbidden: Requires permissions: ${requiredPermissions.join(', ')}` });
        return;
      }

      req.user.role = member.role;

      next();
    } catch (error) {
      console.error('RBAC Middleware Error:', error);
      res.status(500).json({ error: 'Internal Server Error during role verification' });
    }
  };
};
