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
    // Грейс-період: підписка вважається оплаченою протягом 3-х днів після початку прострочення платежу
    const hasActiveGracePeriod = (
      (workspace.subscriptionStatus === 'past_due' || workspace.subscriptionStatus === 'unpaid') &&
      workspace.gracePeriodStartedAt &&
      (Date.now() - new Date(workspace.gracePeriodStartedAt).getTime() < 3 * 24 * 60 * 60 * 1000)
    );
    const isSubscriptionPaid = workspace.plan === 'FREE' || workspace.subscriptionStatus === 'active' || !!hasActiveGracePeriod;
    const limits: any = { ...((isSubscriptionPaid ? PLANS[workspace.plan as PlanType] : PLANS.FREE) || PLANS.FREE) };

    if (workspace.plan === 'ENTERPRISE' && isSubscriptionPaid) {
      if (workspace.enterpriseStorageBytes !== null) {
        limits.storageBytes = workspace.enterpriseStorageBytes;
      }
      if (workspace.enterpriseBandwidthBytes !== null) {
        limits.bandwidthBytes = workspace.enterpriseBandwidthBytes;
      }
      if (workspace.enterpriseOptimizations !== null) {
        limits.monthlyOptimizations = workspace.enterpriseOptimizations;
      }
    }

    // Get analytics for the last 30 days (group by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const logsLast30Days = await prisma.analyticsLog.findMany({
      where: {
        workspaceId,
        timestamp: { gte: thirtyDaysAgo }
      },
      select: { statusCode: true, timestamp: true, bytesSaved: true }
    });

    const analyticsMap = new Map<string, { bytesSaved: number, success: number, error: number }>();
    // Initialize last 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date(thirtyDaysAgo);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]!;
      analyticsMap.set(dateStr, { bytesSaved: 0, success: 0, error: 0 });
    }

    let totalSuccessCount = 0;
    let totalErrorCount = 0;

    for (const log of logsLast30Days) {
      const dateStr = log.timestamp.toISOString().split('T')[0]!;
      const isSuccess = log.statusCode >= 200 && log.statusCode < 300;
      
      if (isSuccess) totalSuccessCount++;
      else if (log.statusCode >= 400) totalErrorCount++;

      if (analyticsMap.has(dateStr)) {
        const current = analyticsMap.get(dateStr)!;
        current.bytesSaved += Number(log.bytesSaved);
        if (isSuccess) current.success++;
        else current.error++;
      }
    }

    const analytics = Array.from(analyticsMap.entries()).map(([date, data]) => ({
      date,
      bytesSaved: data.bytesSaved,
      requests: data.success + data.error,
      successRequests: data.success,
      errorRequests: data.error
    }));

    const totalRequests = totalSuccessCount + totalErrorCount;
    const successRate = totalRequests > 0 ? (totalSuccessCount / totalRequests) * 100 : 100;

    const activeApiKeys = await prisma.apiKey.count({
      where: { workspaceId }
    });

    const formatStats = await prisma.mediaFile.groupBy({
      by: ['format'],
      where: { workspaceId, isDeleted: false },
      _count: {
        id: true
      },
      _sum: {
        originalSize: true,
        optimizedSize: true
      }
    });

    const formatDistribution = formatStats.map((f) => ({
      format: f.format,
      count: f._count.id,
      originalSize: f._sum.originalSize?.toString() || '0',
      optimizedSize: f._sum.optimizedSize?.toString() || '0'
    }));

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
        analytics,
        formatDistribution,
        successRate,
        totalSuccessCount,
        totalErrorCount
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
            customS3Enabled: true,
            s3AccessKeyId: true,
            s3Endpoint: true,
            s3BucketName: true,
            s3Region: true,
            s3PublicUrl: true,
            migrationStatus: true,
            migrationProgress: true,
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
      customS3Enabled: m.workspace.customS3Enabled,
      s3AccessKeyId: m.workspace.s3AccessKeyId,
      s3Endpoint: m.workspace.s3Endpoint,
      s3BucketName: m.workspace.s3BucketName,
      s3Region: m.workspace.s3Region,
      s3PublicUrl: m.workspace.s3PublicUrl,
      migrationStatus: m.workspace.migrationStatus,
      migrationProgress: m.workspace.migrationProgress,
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

    res.cookie('optidrive_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

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

    // Log Activity
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Updated compression settings (Preset: ${updated.defaultPreset}, Format: ${updated.defaultFormat}, Quality: ${updated.defaultQuality}%)`,
        workspaceId,
        userId: req.user?.userId || null,
      }
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

    const { 
      name, 
      slug,
      customS3Enabled,
      s3AccessKeyId,
      s3SecretAccessKey,
      s3Endpoint,
      s3BucketName,
      s3Region,
      s3PublicUrl
    } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    const currentWorkspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        plan: true,
        customS3Enabled: true,
        s3AccessKeyId: true,
        s3SecretAccessKey: true,
        s3Endpoint: true,
        s3BucketName: true,
        s3Region: true,
        s3PublicUrl: true
      }
    });

    if (customS3Enabled === true && currentWorkspace?.plan !== 'ENTERPRISE') {
      res.status(403).json({ error: 'Custom S3 Storage is only available on ENTERPRISE plans' });
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

    let startReversion = false;

    if (customS3Enabled === false && currentWorkspace?.customS3Enabled === true) {
      updateData.migrationStatus = 'REVERTING';
      updateData.migrationProgress = '0%';
      startReversion = true;
    } else if (customS3Enabled === true && currentWorkspace?.customS3Enabled === false) {
      const filesCount = await prisma.mediaFile.count({
        where: { workspaceId, isDeleted: false }
      });

      if (filesCount > 0) {
        updateData.customS3Enabled = false;
        updateData.migrationStatus = 'MIGRATION_REQUIRED';
        updateData.migrationProgress = `0/${filesCount} (0%)`;
      } else {
        updateData.customS3Enabled = true;
        updateData.migrationStatus = 'COMPLETED';
      }

      if (s3AccessKeyId !== undefined) updateData.s3AccessKeyId = s3AccessKeyId;
      if (s3SecretAccessKey !== undefined) updateData.s3SecretAccessKey = s3SecretAccessKey;
      if (s3Endpoint !== undefined) updateData.s3Endpoint = s3Endpoint;
      if (s3BucketName !== undefined) updateData.s3BucketName = s3BucketName;
      if (s3Region !== undefined) updateData.s3Region = s3Region;
      if (s3PublicUrl !== undefined) updateData.s3PublicUrl = s3PublicUrl;
    } else {
      if (customS3Enabled !== undefined) updateData.customS3Enabled = Boolean(customS3Enabled);
      if (s3AccessKeyId !== undefined) updateData.s3AccessKeyId = s3AccessKeyId;
      if (s3SecretAccessKey !== undefined) updateData.s3SecretAccessKey = s3SecretAccessKey;
      if (s3Endpoint !== undefined) updateData.s3Endpoint = s3Endpoint;
      if (s3BucketName !== undefined) updateData.s3BucketName = s3BucketName;
      if (s3Region !== undefined) updateData.s3Region = s3Region;
      if (s3PublicUrl !== undefined) updateData.s3PublicUrl = s3PublicUrl;
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        customS3Enabled: true,
        s3AccessKeyId: true,
        s3Endpoint: true,
        s3BucketName: true,
        s3Region: true,
        s3PublicUrl: true,
        migrationStatus: true,
        migrationProgress: true
      }
    });

    // Clear client cache so new credentials take effect immediately
    const { clearWorkspaceS3Cache } = await import('../config/s3');
    clearWorkspaceS3Cache(workspaceId);

    if (startReversion) {
      runBackgroundReversion(workspaceId, currentWorkspace).catch((err) => {
        console.error(`[Reversion] Background reversion failed for workspace ${workspaceId}:`, err);
      });
    }

    // Log Activity
    const s3Desc = updated.customS3Enabled ? `Enabled Custom S3 Storage (Bucket: ${updated.s3BucketName || 'N/A'})` : 'Disabled Custom S3 Storage (BYOS)';
    await prisma.activityLog.create({
      data: {
        type: 'SETTING_CHANGED',
        description: `Updated workspace details (Name: ${updated.name}, Slug: ${updated.slug}, Storage: ${s3Desc})`,
        workspaceId,
        userId: req.user?.userId || null,
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
    const userId = req.user?.userId;
    const workspaceId = req.user?.workspaceId;

    if (!userId || !workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { getS3ConfigForWorkspace } = await import('../config/s3');
    const { client, bucketName } = await getS3ConfigForWorkspace(workspaceId);

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

    const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    const chunkSize = 1000;
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      const objects = chunk.map(file => ({
        Key: `${workspaceId}/${file.cdnUrl.split('/').pop()}`
      }));
      
      try {
        await client.send(new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: { Objects: objects, Quiet: true }
        }));
      } catch (e) {
        console.error('[DeleteWorkspace] Failed to delete S3 files chunk:', e);
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
      res.cookie('optidrive_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
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
      res.cookie('optidrive_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });
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

export const testS3Connection = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    const { s3AccessKeyId, s3SecretAccessKey, s3Endpoint, s3BucketName, s3Region } = req.body;

    let finalAccessKeyId = s3AccessKeyId;
    let finalSecretAccessKey = s3SecretAccessKey;
    let finalBucketName = s3BucketName;
    let finalEndpoint = s3Endpoint;
    let finalRegion = s3Region;

    if (workspaceId && (!finalAccessKeyId || !finalSecretAccessKey || !finalBucketName)) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          s3AccessKeyId: true,
          s3SecretAccessKey: true,
          s3BucketName: true,
          s3Endpoint: true,
          s3Region: true
        }
      });
      if (workspace) {
        if (!finalAccessKeyId) finalAccessKeyId = workspace.s3AccessKeyId;
        if (!finalSecretAccessKey) finalSecretAccessKey = workspace.s3SecretAccessKey;
        if (!finalBucketName) finalBucketName = workspace.s3BucketName;
        if (!finalEndpoint) finalEndpoint = workspace.s3Endpoint;
        if (!finalRegion) finalRegion = workspace.s3Region;
      }
    }

    if (!finalAccessKeyId || !finalSecretAccessKey || !finalBucketName) {
      res.status(400).json({ error: 'Missing S3 credentials' });
      return;
    }

    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    const s3Config: any = {
      region: finalRegion || 'auto',
      credentials: {
        accessKeyId: finalAccessKeyId.trim(),
        secretAccessKey: finalSecretAccessKey.trim(),
      },
    };
    if (finalEndpoint && finalEndpoint.trim()) {
      s3Config.endpoint = finalEndpoint.trim();
    }

    const client = new S3Client(s3Config);
    
    // 1. Verify list permission
    await client.send(new ListObjectsV2Command({
      Bucket: finalBucketName.trim(),
      MaxKeys: 1
    }));

    // 2. Verify write & delete permission
    const testKey = `.optidrive-connection-test-${Date.now()}.txt`;
    const { PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
    
    await client.send(new PutObjectCommand({
      Bucket: finalBucketName.trim(),
      Key: testKey,
      Body: 'OptiDrive Connection Test',
      ContentType: 'text/plain'
    }));

    await client.send(new DeleteObjectCommand({
      Bucket: finalBucketName.trim(),
      Key: testKey
    }));

    res.status(200).json({ success: true, message: 'Connection successful (Read & Write permissions verified)' });
  } catch (err: any) {
    console.error('[S3 Test] Connection failed:', err);
    res.status(400).json({ success: false, error: err.message || 'Connection failed' });
  }
};

const runBackgroundMigration = async (workspaceId: string, workspaceConfig: any) => {
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const { s3Client: defaultS3Client, BUCKET_NAME: defaultBucketName } = await import('../config/s3');
  
  try {
    // Зчитуємо всі активні файли воркспейсу
    const files = await prisma.mediaFile.findMany({
      where: { workspaceId, isDeleted: false }
    });

    if (files.length === 0) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          migrationStatus: 'COMPLETED',
          migrationProgress: '0/0 (100%)'
        }
      });
      return;
    }

    // Ініціалізуємо клієнт для кастомного сховища
    const s3Config: any = {
      region: workspaceConfig.s3Region || 'auto',
      credentials: {
        accessKeyId: workspaceConfig.s3AccessKeyId,
        secretAccessKey: workspaceConfig.s3SecretAccessKey,
      },
    };
    if (workspaceConfig.s3Endpoint) {
      s3Config.endpoint = workspaceConfig.s3Endpoint;
    }
    const customClient = new S3Client(s3Config);

    console.log(`[Migration] Starting parallel migration of ${files.length} files for workspace: ${workspaceId}`);

    let migratedCount = 0;
    const batchSize = 15;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(batch.map(async (file) => {
        const urlParts = file.cdnUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const folderName = urlParts[urlParts.length - 2];
        const fileKey = `${folderName}/${filename}`;

        try {
          // 1. Скачуємо файл з дефолтного бакету R2
          const getCmd = new GetObjectCommand({
            Bucket: defaultBucketName,
            Key: fileKey
          });
          const r2Response = await defaultS3Client.send(getCmd);
          
          if (r2Response.Body) {
            const chunks = [];
            for await (const chunk of r2Response.Body as any) {
              chunks.push(chunk);
            }
            const fileBuffer = Buffer.concat(chunks);

            // 2. Завантажуємо файл у новий кастомний бакет
            const contentTypeMap: Record<string, string> = {
              'webp': 'image/webp',
              'avif': 'image/avif',
              'jpeg': 'image/jpeg',
              'jpg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'svg': 'image/svg+xml',
            };
            const fileFormat = file.format.toLowerCase();

            await customClient.send(new PutObjectCommand({
              Bucket: workspaceConfig.s3BucketName,
              Key: fileKey,
              Body: fileBuffer,
              ContentType: contentTypeMap[fileFormat] || 'application/octet-stream',
              CacheControl: 'public, max-age=31536000',
            }));

            // 3. Оновлюємо CDN URL у базі даних (якщо вказано custom public CDN url)
            let newCdnUrl = '';
            if (workspaceConfig.s3PublicUrl) {
              newCdnUrl = `${workspaceConfig.s3PublicUrl}/${fileKey}`;
            } else {
              const apiBase = process.env.API_URL || 'http://localhost:3001';
              newCdnUrl = `${apiBase}/api/v1/media/${fileKey}`;
            }

            await prisma.mediaFile.update({
              where: { id: file.id },
              data: { cdnUrl: newCdnUrl }
            });

            // 4. Видаляємо оригінальний файл із дефолтного R2 бакету
            await defaultS3Client.send(new DeleteObjectCommand({
              Bucket: defaultBucketName,
              Key: fileKey
            }));
          }
        } catch (fileErr) {
          console.error(`[Migration] Failed to migrate file ${file.id} (${file.name}):`, fileErr);
        }
      }));

      migratedCount += batch.length;
      const progressPercent = Math.round((migratedCount / files.length) * 100);
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          migrationProgress: `${migratedCount}/${files.length} (${progressPercent}%)`
        }
      });
    }

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        customS3Enabled: true,
        migrationStatus: 'COMPLETED'
      }
    });

    console.log(`[Migration] Successfully completed migration of ${migratedCount} files for workspace: ${workspaceId}`);
  } catch (error) {
    console.error(`[Migration] Fatal error in migration for workspace: ${workspaceId}`, error);
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        migrationStatus: 'FAILED'
      }
    });
  }
};

const runBackgroundReversion = async (workspaceId: string, workspaceConfig: any) => {
  const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const { s3Client: defaultS3Client, BUCKET_NAME: defaultBucketName } = await import('../config/s3');
  
  try {
    const files = await prisma.mediaFile.findMany({
      where: { workspaceId, isDeleted: false }
    });

    if (files.length === 0) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          customS3Enabled: false,
          s3AccessKeyId: null,
          s3SecretAccessKey: null,
          s3Endpoint: null,
          s3BucketName: null,
          s3Region: null,
          s3PublicUrl: null,
          migrationStatus: 'NONE',
          migrationProgress: null
        }
      });
      return;
    }

    const s3Config: any = {
      region: workspaceConfig.s3Region || 'auto',
      credentials: {
        accessKeyId: workspaceConfig.s3AccessKeyId,
        secretAccessKey: workspaceConfig.s3SecretAccessKey,
      },
    };
    if (workspaceConfig.s3Endpoint) {
      s3Config.endpoint = workspaceConfig.s3Endpoint;
    }
    const customClient = new S3Client(s3Config);

    console.log(`[Reversion] Starting parallel reversion of ${files.length} files for workspace: ${workspaceId}`);

    let revertedCount = 0;
    const batchSize = 15;

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);

      await Promise.all(batch.map(async (file) => {
        const urlParts = file.cdnUrl.split('/');
        const filename = urlParts[urlParts.length - 1];
        const folderName = urlParts[urlParts.length - 2];
        const fileKey = `${folderName}/${filename}`;

        try {
          // 1. Скачуємо файл з кастомного сховища
          const customResponse = await customClient.send(new GetObjectCommand({
            Bucket: workspaceConfig.s3BucketName,
            Key: fileKey
          }));

          if (customResponse.Body) {
            const chunks = [];
            for await (const chunk of customResponse.Body as any) {
              chunks.push(chunk);
            }
            const fileBuffer = Buffer.concat(chunks);

            // 2. Завантажуємо файл у стандартний бакет R2
            const contentTypeMap: Record<string, string> = {
              'webp': 'image/webp',
              'avif': 'image/avif',
              'jpeg': 'image/jpeg',
              'jpg': 'image/jpeg',
              'png': 'image/png',
              'gif': 'image/gif',
              'svg': 'image/svg+xml',
            };
            const fileFormat = file.format.toLowerCase();

            await defaultS3Client.send(new PutObjectCommand({
              Bucket: defaultBucketName,
              Key: fileKey,
              Body: fileBuffer,
              ContentType: contentTypeMap[fileFormat] || 'application/octet-stream',
              CacheControl: 'public, max-age=31536000',
            }));

            // 3. Оновлюємо CDN URL у базі даних (повертаємо стандартний локальний проксі-шлях)
            const apiBase = process.env.API_URL || 'http://localhost:3001';
            const newCdnUrl = `${apiBase}/api/v1/media/${fileKey}`;

            await prisma.mediaFile.update({
              where: { id: file.id },
              data: { cdnUrl: newCdnUrl }
            });

            // 4. Видаляємо файл із кастомного бакету
            await customClient.send(new DeleteObjectCommand({
              Bucket: workspaceConfig.s3BucketName,
              Key: fileKey
            }));
          }
        } catch (fileErr) {
          console.error(`[Reversion] Failed to revert file ${file.id} (${file.name}):`, fileErr);
        }
      }));

      revertedCount += batch.length;
      const progressPercent = Math.round((revertedCount / files.length) * 100);
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: {
          migrationProgress: `${revertedCount}/${files.length} (${progressPercent}%)`
        }
      });
    }

    // Вимикаємо кастомне сховище після успішного реверсу
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        customS3Enabled: false,
        s3AccessKeyId: null,
        s3SecretAccessKey: null,
        s3Endpoint: null,
        s3BucketName: null,
        s3Region: null,
        s3PublicUrl: null,
        migrationStatus: 'NONE',
        migrationProgress: null
      }
    });

    console.log(`[Reversion] Successfully completed reversion of ${revertedCount} files for workspace: ${workspaceId}`);
  } catch (error) {
    console.error(`[Reversion] Fatal error in reversion for workspace: ${workspaceId}`, error);
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        migrationStatus: 'FAILED'
      }
    });
  }
};

export const startWorkspaceMigration = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        plan: true,
        customS3Enabled: true,
        s3AccessKeyId: true,
        s3SecretAccessKey: true,
        s3Endpoint: true,
        s3BucketName: true,
        s3Region: true,
        s3PublicUrl: true,
        migrationStatus: true
      }
    });

    if (!workspace || workspace.plan !== 'ENTERPRISE') {
      res.status(403).json({ error: 'Migration is only available for Enterprise workspaces.' });
      return;
    }

    if (workspace.migrationStatus === 'MIGRATING') {
      res.status(400).json({ error: 'Migration is already in progress.' });
      return;
    }

    if (!workspace.s3AccessKeyId || !workspace.s3SecretAccessKey || !workspace.s3BucketName) {
      res.status(400).json({ error: 'S3 credentials are not fully configured.' });
      return;
    }

    // 1. Перевірка доступу перед запуском міграції
    const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const s3Config: any = {
      region: workspace.s3Region || 'auto',
      credentials: {
        accessKeyId: workspace.s3AccessKeyId,
        secretAccessKey: workspace.s3SecretAccessKey,
      },
    };
    if (workspace.s3Endpoint) {
      s3Config.endpoint = workspace.s3Endpoint;
    }

     const client = new S3Client(s3Config);
     try {
       // 1. Verify list
       await client.send(new ListObjectsV2Command({
         Bucket: workspace.s3BucketName,
         MaxKeys: 1
       }));

       // 2. Verify write & delete
       const testKey = `.optidrive-connection-test-${Date.now()}.txt`;
       const { PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
       await client.send(new PutObjectCommand({
         Bucket: workspace.s3BucketName,
         Key: testKey,
         Body: 'OptiDrive Connection Test',
         ContentType: 'text/plain'
       }));
       await client.send(new DeleteObjectCommand({
         Bucket: workspace.s3BucketName,
         Key: testKey
       }));
     } catch (pingErr: any) {
       res.status(400).json({ error: `Could not connect or write to S3 bucket. Ensure credentials have both Read and Write permissions. Error: ${pingErr.message}` });
       return;
     }

    // 2. Встановлюємо статус MIGRATING
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        migrationStatus: 'MIGRATING',
        migrationProgress: '0%'
      }
    });

    // 3. Запускаємо фоновий процес міграції
    runBackgroundMigration(workspaceId, workspace).catch((err) => {
      console.error(`[Migration] Background migration for workspaceId ${workspaceId} failed:`, err);
    });

    res.status(200).json({ success: true, message: 'Migration started in the background.' });
  } catch (error) {
    console.error('startWorkspaceMigration Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const getWorkspaceAuditLogs = async (req: Request & { user?: any }, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { plan: true }
    });

    if (!workspace) {
      res.status(404).json({ error: 'Workspace not found' });
      return;
    }

    // 1. Block access for non-Enterprise plan
    if (workspace.plan !== 'ENTERPRISE') {
      res.status(403).json({
        code: 'REQUIRES_ENTERPRISE',
        error: 'Audit logs are only available on the Enterprise plan. Please upgrade to unlock security auditing.'
      });
      return;
    }

    // 2. Read query filters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    const userId = req.query.userId as string;
    const search = req.query.search as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const skip = (page - 1) * limit;

    const whereCondition: any = {
      workspaceId
    };

    if (type) {
      whereCondition.type = type;
    }

    if (userId) {
      whereCondition.userId = userId;
    }

    if (search) {
      whereCondition.description = {
        contains: search,
        mode: 'insensitive'
      };
    }

    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) {
        whereCondition.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereCondition.createdAt.lte = end;
      }
    }

    const [logs, totalCount] = await prisma.$transaction([
      prisma.activityLog.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true
            }
          }
        }
      }),
      prisma.activityLog.count({
        where: whereCondition
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        logs,
        pagination: {
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
          page,
          limit
        }
      }
    });
  } catch (error) {
    console.error('getWorkspaceAuditLogs Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


