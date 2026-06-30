import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middlewares/auth.middleware';
import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, BUCKET_NAME } from '../config/s3';
import { extname } from 'path';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';

export const getUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailWeeklySummary: true,
        emailQuotaWarnings: true,
        emailSecurityAlerts: true,
        emailBillingAlerts: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('getUserNotifications Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const updateUserNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const {
      emailWeeklySummary,
      emailQuotaWarnings,
      emailSecurityAlerts,
      emailBillingAlerts
    } = req.body;

    const updateData: any = {};
    if (emailWeeklySummary !== undefined) updateData.emailWeeklySummary = Boolean(emailWeeklySummary);
    if (emailQuotaWarnings !== undefined) updateData.emailQuotaWarnings = Boolean(emailQuotaWarnings);
    if (emailSecurityAlerts !== undefined) updateData.emailSecurityAlerts = Boolean(emailSecurityAlerts);
    if (emailBillingAlerts !== undefined) updateData.emailBillingAlerts = Boolean(emailBillingAlerts);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        emailWeeklySummary: true,
        emailQuotaWarnings: true,
        emailSecurityAlerts: true,
        emailBillingAlerts: true
      }
    });

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('updateUserNotifications Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

import { sendEmailChangeVerificationEmail } from '../services/email.service';
import crypto from 'crypto';

export const updateUserProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, email } = req.body;

    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatarUrl: true }
    });

    if (!currentUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const emailChanged = email.toLowerCase() !== currentUser.email.toLowerCase();

    if (emailChanged) {
      // Перевіряємо чи email вже зайнятий
      const existing = await prisma.user.findFirst({
        where: { email: email.toLowerCase(), NOT: { id: userId } }
      });
      if (existing) {
        res.status(400).json({ error: 'Email address is already in use' });
        return;
      }

      // Генеруємо код верифікації
      const code = crypto.randomInt(100000, 999999).toString();
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 хвилин

      await prisma.user.update({
        where: { id: userId },
        data: {
          name: name.trim(),
          pendingEmail: email.toLowerCase(),
          pendingEmailCode: code,
          pendingEmailCodeExpiry: expiry
        }
      });

      // Відправляємо код на НОВУ адресу
      sendEmailChangeVerificationEmail(email.toLowerCase(), code).catch(console.error);

      res.status(200).json({
        success: true,
        requiresEmailVerification: true,
        pendingEmail: email.toLowerCase(),
        message: 'Verification code sent to your new email address'
      });
    } else {
      // Email не змінився — просто оновлюємо ім'я
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name: name.trim() },
        select: { id: true, name: true, email: true, avatarUrl: true }
      });

      res.status(200).json({ success: true, data: updatedUser });
    }
  } catch (error) {
    console.error('updateUserProfile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const confirmEmailChange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { code } = req.body;
    if (!code) {
      res.status(400).json({ error: 'Verification code is required' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        pendingEmail: true, pendingEmailCode: true, pendingEmailCodeExpiry: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.pendingEmail || !user.pendingEmailCode) {
      res.status(400).json({ error: 'No pending email change request found' });
      return;
    }

    if (user.pendingEmailCode !== code) {
      res.status(400).json({ error: 'Invalid verification code' });
      return;
    }

    if (user.pendingEmailCodeExpiry && user.pendingEmailCodeExpiry < new Date()) {
      res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        pendingEmailCode: null,
        pendingEmailCodeExpiry: null
      },
      select: { id: true, name: true, email: true, avatarUrl: true }
    });

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('confirmEmailChange Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  const tempPath = req.file?.path;
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'No avatar file provided' });
      return;
    }

    const { originalname, mimetype } = req.file;
    const fileExt = extname(originalname) || '.png';
    const fileKey = `avatars/${userId}-${Date.now()}${fileExt}`;

    // Read buffer from disk
    const buffer = await fs.readFile(tempPath!);

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: buffer,
      ContentType: mimetype,
      CacheControl: 'public, max-age=31536000',
    });

    await s3Client.send(uploadCommand);

    let avatarUrl = '';
    if (process.env.R2_PUBLIC_URL) {
      avatarUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;
    } else {
      const apiBase = process.env.API_URL || 'http://localhost:3001';
      avatarUrl = `${apiBase}/api/v1/media/avatars/${fileKey.replace('avatars/', '')}`;
    }

    // Get previous user to delete old avatar from S3 if it exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true }
    });

    if (user?.avatarUrl) {
      const oldKey = user.avatarUrl.split('.com/').pop()?.split('/api/v1/media/').pop();
      if (oldKey && (oldKey.startsWith('avatars/') || user.avatarUrl.includes('/avatars/'))) {
        const cleanOldKey = oldKey.includes('avatars/') ? oldKey : `avatars/${oldKey}`;
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: cleanOldKey
          }));
        } catch (e) {
          console.error('[Avatar] Failed to delete old avatar:', e);
        }
      }
    }

    // Update in database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      }
    });

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('uploadAvatar Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    if (tempPath) {
      await fs.unlink(tempPath).catch(() => {});
    }
  }
};

export const deleteAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatarUrl: true }
    });

    if (user?.avatarUrl) {
      const oldKey = user.avatarUrl.split('.com/').pop()?.split('/api/v1/media/').pop();
      if (oldKey && (oldKey.startsWith('avatars/') || user.avatarUrl.includes('/avatars/'))) {
        const cleanOldKey = oldKey.includes('avatars/') ? oldKey : `avatars/${oldKey}`;
        try {
          await s3Client.send(new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: cleanOldKey
          }));
        } catch (e) {
          console.error('[Avatar] Failed to delete avatar from storage:', e);
        }
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true
      }
    });

    res.status(200).json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('deleteAvatar Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const ownedWorkspaces = await prisma.workspaceUser.findMany({
      where: {
        userId,
        role: { name: 'Owner', isSystem: true }
      }
    });

    const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

    for (const ow of ownedWorkspaces) {
      const files = await prisma.mediaFile.findMany({
        where: { workspaceId: ow.workspaceId }
      });

      const chunkSize = 1000;
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize);
        const objects = chunk.map(file => ({
          Key: `${ow.workspaceId}/${file.cdnUrl.split('/').pop()}`
        }));
        try {
          await s3Client.send(new DeleteObjectsCommand({
            Bucket: BUCKET_NAME,
            Delete: { Objects: objects, Quiet: true }
          }));
        } catch (e) {
          console.error('[DeleteAccount] S3 files chunk delete error:', e);
        }
      }

      await prisma.workspace.delete({
        where: { id: ow.workspaceId }
      });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('deleteAccount Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (!user.passwordHash) {
      res.status(400).json({ error: 'User registered via OAuth provider. Password cannot be changed this way.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('changePassword Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
