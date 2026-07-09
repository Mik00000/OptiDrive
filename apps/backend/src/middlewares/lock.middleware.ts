import { Request, Response, NextFunction } from 'express';
import { isWorkspaceLocked } from '../utils/workspace-status';
import { prisma } from '../config/prisma';

export const blockIfWorkspaceLocked = async (
  req: Request & { user?: any; workspaceId?: string },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId || req.workspaceId;
    const userId = req.user?.userId;

    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isBanned: true }
      });
      if (user?.isBanned) {
        res.status(403).json({
          code: 'USER_BANNED',
          error: 'Your user account has been suspended by the administrator due to system violations.'
        });
        return;
      }
    }

    if (workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { isBanned: true }
      });
      if (workspace?.isBanned) {
        res.status(403).json({
          code: 'WORKSPACE_BANNED',
          error: 'This workspace has been suspended by the administrator.'
        });
        return;
      }

      const locked = await isWorkspaceLocked(workspaceId);
      if (locked) {
        res.status(403).json({ 
          code: 'WORKSPACE_LOCKED',
          error: 'This workspace is locked because you have exceeded the limit of 1 FREE workspace. Please upgrade to PRO or delete your other FREE workspace.' 
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error('blockIfWorkspaceLocked error:', error);
    next();
  }
};
