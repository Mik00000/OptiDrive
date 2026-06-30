import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';

export const blockDuringMigration = async (
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

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { migrationStatus: true }
    });

    if (workspace && (workspace.migrationStatus === 'MIGRATING' || workspace.migrationStatus === 'REVERTING')) {
      res.status(400).json({ 
        error: 'Workspace is undergoing storage migration. Modifying media library files is temporarily blocked.' 
      });
      return;
    }

    next();
  } catch (error) {
    console.error('blockDuringMigration error:', error);
    next();
  }
};
