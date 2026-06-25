import { prisma } from '../config/prisma';
import { ActivityType } from '@prisma/client';

export const logActivity = async (
  workspaceId: string,
  userId: string | null,
  type: ActivityType,
  description: string
) => {
  try {
    await prisma.activityLog.create({
      data: {
        workspaceId,
        userId,
        type,
        description
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};
