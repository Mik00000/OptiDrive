import { Request, Response, NextFunction } from 'express';
import { isWorkspaceLocked } from '../utils/workspace-status';

export const blockIfWorkspaceLocked = async (
  req: Request & { user?: any; workspaceId?: string },
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId || req.workspaceId;
    if (!workspaceId) {
      next();
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

    next();
  } catch (error) {
    console.error('blockIfWorkspaceLocked error:', error);
    next();
  }
};
