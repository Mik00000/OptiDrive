import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { PLANS, PlanType } from '@optidrive/shared';
import { generateToken } from '../utils/jwt';
import { logActivity } from '../services/activity.service';

export const getWorkspaceStats = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: { files: true }
        }
      }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // Get total savings from MediaFiles
    const savingsAgg = await prisma.mediaFile.aggregate({
      where: { workspaceId },
      _sum: {
        originalSize: true,
        optimizedSize: true
      }
    });

    const totalOriginalSize = savingsAgg._sum.originalSize || BigInt(0);
    const totalOptimizedSize = savingsAgg._sum.optimizedSize || BigInt(0);
    const totalBytesSaved = totalOriginalSize - totalOptimizedSize;

    const recentActivity = await prisma.activityLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Plan Limits
    const limits = PLANS[workspace.plan as PlanType] || PLANS.FREE;

    // Get analytics for the last 30 days (group by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const mediaFilesLast30Days = await prisma.mediaFile.findMany({
      where: {
        workspaceId,
        createdAt: { gte: thirtyDaysAgo }
      },
      select: { createdAt: true, originalSize: true, optimizedSize: true }
    });

    const analyticsMap = new Map<string, { bytesSaved: number, count: number }>();
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]!;
      analyticsMap.set(dateStr, { bytesSaved: 0, count: 0 });
    }

    for (const file of mediaFilesLast30Days) {
      const dateStr = file.createdAt.toISOString().split('T')[0]!;
      const saved = Number(file.originalSize) - Number(file.optimizedSize);
      if (analyticsMap.has(dateStr)) {
        const current = analyticsMap.get(dateStr)!;
        current.bytesSaved += saved;
        current.count += 1;
      }
    }

    const analytics = Array.from(analyticsMap.entries()).map(([date, data]) => ({
      date,
      bytesSaved: data.bytesSaved,
      requests: data.count
    }));

    const activeApiKeys = await prisma.apiKey.count({
      where: { workspaceId }
    });

    res.status(200).json({
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        plan: workspace.plan,
        storageUsed: workspace.storageUsed.toString(),
        bandwidthUsed: workspace.bandwidthUsed.toString(),
        monthlyOptimizations: workspace.monthlyOptimizations,
        totalFiles: workspace._count.files,
        activeApiKeys,
        totalOriginalBytes: totalOriginalSize.toString(),
        totalOptimizedBytes: totalOptimizedSize.toString(),
        totalBytesSaved: totalBytesSaved.toString(),
        limits: {
          storageBytes: limits.storageBytes.toString(),
          bandwidthBytes: limits.bandwidthBytes.toString(),
          monthlyOptimizations: limits.monthlyOptimizations,
          maxFileSize: limits.maxFileSize.toString(),
          maxApiKeys: limits.maxApiKeys,
          maxMembers: limits.maxMembers,
          maxCustomRoles: limits.maxCustomRoles,
        },
        recentActivity,
        analytics
      }
    });
  } catch (error) {
    console.error('getWorkspaceStats Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getUserWorkspaces = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const members = await prisma.workspaceUser.findMany({
      where: { userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            _count: { select: { members: true } }
          }
        },
        role: {
          select: {
            id: true,
            name: true,
            permissions: true
          }
        }
      }
    });

    const workspaces = members.map((m: any) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      plan: m.workspace.plan,
      membersCount: m.workspace._count.members,
      role: m.role
    }));

    res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    console.error('getUserWorkspaces Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const switchWorkspace = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { workspaceId } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!workspaceId) {
      res.status(400).json({ error: 'Workspace ID is required' });
      return;
    }

    const member = await prisma.workspaceUser.findFirst({
      where: { userId, workspaceId }
    });

    if (!member) {
      res.status(403).json({ error: 'Forbidden: You do not have access to this workspace' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { activeWorkspaceId: workspaceId }
    });

    const token = generateToken(userId, workspaceId);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        workspaceId: updatedUser.activeWorkspaceId,
        hasPassword: !!updatedUser.passwordHash
      }
    });
  } catch (error) {
    console.error('switchWorkspace Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const createWorkspace = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const { name } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    // Check if user already owns a FREE workspace
    const existingFreeWorkspace = await prisma.workspaceUser.findFirst({
      where: {
        userId,
        workspace: { plan: 'FREE' },
        role: { name: 'Owner', isSystem: true }
      }
    });

    if (existingFreeWorkspace) {
      res.status(403).json({ error: 'You already own a free workspace. Please upgrade your existing workspace or select a paid plan to create a new one.' });
      return;
    }

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

    // Use transaction to ensure workspace and initial roles/members are created together
    const newWorkspace = await prisma.$transaction(async (tx: any) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          plan: 'FREE'
        }
      });

      // Create base system roles
      const allPermissions = [
        'MANAGE_USERS', 'MANAGE_ROLES', 'MANAGE_BILLING', 
        'UPLOAD_FILES', 'DELETE_FILES', 'MANAGE_API_KEYS', 'VIEW_ANALYTICS'
      ] as any[];

      const ownerRole = await tx.role.create({
        data: { name: 'Owner', isSystem: true, permissions: allPermissions, workspaceId: workspace.id }
      });
      await tx.role.createMany({
        data: [
          { name: 'Admin', isSystem: true, permissions: allPermissions, workspaceId: workspace.id },
          { name: 'Member', isSystem: true, permissions: ['UPLOAD_FILES', 'DELETE_FILES', 'VIEW_ANALYTICS'] as any[], workspaceId: workspace.id },
          { name: 'Viewer', isSystem: true, permissions: ['VIEW_ANALYTICS'] as any[], workspaceId: workspace.id },
        ]
      });

      // Assign current user as Owner
      await tx.workspaceUser.create({
        data: {
          userId,
          workspaceId: workspace.id,
          roleId: ownerRole.id
        }
      });

      return workspace;
    });

    await logActivity(newWorkspace.id, userId, 'WORKSPACE_CREATED', `Created workspace ${name}`);

    res.status(201).json({
      success: true,
      data: {
        ...newWorkspace,
        storageUsed: newWorkspace.storageUsed.toString(),
        bandwidthUsed: newWorkspace.bandwidthUsed.toString()
      }
    });
  } catch (error) {
    console.error('createWorkspace Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getCompressionDefaults = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        defaultPreset: true,
        defaultFormat: true,
        defaultQuality: true,
        defaultStripMetadata: true,
        defaultMaxWidth: true,
        defaultMaxHeight: true,
        defaultFit: true
      }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    console.error('getCompressionDefaults Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateCompressionDefaults = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      defaultPreset,
      defaultFormat,
      defaultQuality,
      defaultStripMetadata,
      defaultMaxWidth,
      defaultMaxHeight,
      defaultFit
    } = req.body;

    const updateData: any = {};
    if (defaultPreset !== undefined) updateData.defaultPreset = String(defaultPreset);
    if (defaultFormat !== undefined) updateData.defaultFormat = String(defaultFormat);
    if (defaultQuality !== undefined) updateData.defaultQuality = Number(defaultQuality);
    if (defaultStripMetadata !== undefined) updateData.defaultStripMetadata = Boolean(defaultStripMetadata);
    if (defaultMaxWidth !== undefined) {
      updateData.defaultMaxWidth = defaultMaxWidth === null || defaultMaxWidth === '' ? null : Number(defaultMaxWidth);
    }
    if (defaultMaxHeight !== undefined) {
      updateData.defaultMaxHeight = defaultMaxHeight === null || defaultMaxHeight === '' ? null : Number(defaultMaxHeight);
    }
    if (defaultFit !== undefined) updateData.defaultFit = String(defaultFit);

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      data: {
        defaultPreset: updated.defaultPreset,
        defaultFormat: updated.defaultFormat,
        defaultQuality: updated.defaultQuality,
        defaultStripMetadata: updated.defaultStripMetadata,
        defaultMaxWidth: updated.defaultMaxWidth,
        defaultMaxHeight: updated.defaultMaxHeight,
        defaultFit: updated.defaultFit
      }
    });
  } catch (error) {
    console.error('updateCompressionDefaults Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateWorkspaceDetails = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, slug } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    const updateData: any = { name };
    if (slug) {
      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const existing = await prisma.workspace.findFirst({
        where: { slug: cleanSlug, NOT: { id: workspaceId } }
      });
      if (existing) {
        res.status(400).json({ error: 'Workspace slug is already in use' });
        return;
      }
      updateData.slug = cleanSlug;
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('updateWorkspaceDetails Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteActiveWorkspace = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    const { s3Client, BUCKET_NAME } = await import('../config/s3');
    
    const userId = req.user?.userId;
    const workspaceId = req.user?.workspaceId;

    if (!userId || !workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const membership = await prisma.workspaceUser.findFirst({
      where: {
        userId,
        workspaceId,
        role: { name: 'Owner', isSystem: true }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'Forbidden: Only the Owner can delete this workspace' });
      return;
    }

    const files = await prisma.mediaFile.findMany({
      where: { workspaceId }
    });

    for (const file of files) {
      const key = `${workspaceId}/${file.cdnUrl.split('/').pop()}`;
      try {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key
        }));
      } catch (e) {
        console.error('[DeleteWorkspace] Failed to delete S3 file:', e);
      }
    }

    const otherMembership = await prisma.workspaceUser.findFirst({
      where: {
        userId,
        NOT: { workspaceId }
      },
      include: {
        workspace: true
      }
    });

    await prisma.workspace.delete({
      where: { id: workspaceId }
    });

    if (otherMembership) {
      await prisma.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: otherMembership.workspaceId }
      });

      const token = generateToken(userId, otherMembership.workspaceId);
      res.status(200).json({ 
        success: true, 
        message: 'Workspace deleted successfully. Switched workspace.',
        token,
        switchWorkspaceId: otherMembership.workspaceId
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: null }
      });

      const token = generateToken(userId, null as any);
      res.status(200).json({ 
        success: true, 
        message: 'Workspace deleted successfully. No other workspaces available.',
        token,
        switchWorkspaceId: null
      });
    }

  } catch (error) {
    console.error('deleteActiveWorkspace Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


