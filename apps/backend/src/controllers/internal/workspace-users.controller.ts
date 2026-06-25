import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import { Permission } from '@prisma/client';
import crypto from 'crypto';
import { sendInvitationEmail } from '../../services/email.service';
import { generateToken } from '../../utils/jwt';
import { createDefaultRolesForWorkspace } from '../../services/role.service';

// 1. Отримати всіх користувачів робочого простору
export const getWorkspaceUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;

    const users = await prisma.user.findMany({
      where: { workspaceId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('getWorkspaceUsers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

// 2. Змінити роль користувача
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, userId: currentUserId, role: currentUserRole } = req.user!;
    const targetUserId = req.params.targetUserId as string;
    const { roleId: newRoleId } = req.body;

    if (!newRoleId) {
      res.status(400).json({ success: false, error: 'Invalid role provided' });
      return;
    }

    // Тільки OWNER або ADMIN можуть змінювати ролі (перевірено мідлварою, але тут додаткова логіка)
    if (!currentUserRole?.permissions.includes(Permission.MANAGE_ROLES) && !currentUserRole?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    // Знайдемо цільового користувача
    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, workspaceId },
      include: { role: true }
    });

    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found in this workspace' });
      return;
    }

    // OWNER не може бути змінений ADMIN-ом
    if (targetUser.role?.name === 'Owner' && currentUserRole?.name !== 'Owner') {
      res.status(403).json({ success: false, error: 'Admins cannot change an Owner\'s role' });
      return;
    }

    // Забороняємо OWNER-у змінювати свою роль, якщо він останній OWNER (треба окрема логіка)
    if (targetUser.id === currentUserId && targetUser.role?.name === 'Owner') {
      const newRoleObj = await prisma.role.findUnique({ where: { id: newRoleId } });
      if (newRoleObj?.name !== 'Owner') {
      const ownerCount = await prisma.user.count({
        where: { workspaceId, role: { name: 'Owner' } }
      });
      if (ownerCount <= 1) {
        res.status(400).json({ success: false, error: 'Cannot demote the last Owner of the workspace' });
        return;
      }
    }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { roleId: newRoleId },
      select: { id: true, email: true, name: true, role: { select: { id: true, name: true } } }
    });

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user role' });
  }
};

// 3. Видалити користувача з робочого простору
export const removeWorkspaceUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, userId: currentUserId, role: currentUserRole } = req.user!;
    const targetUserId = req.params.targetUserId as string;

    const targetUser = await prisma.user.findFirst({
      where: { id: targetUserId, workspaceId },
      include: { role: true }
    });

    if (!targetUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Логіка: ADMIN не може видалити OWNER-а або іншого ADMIN-а (чи можна? для безпеки ні)
    if (currentUserRole?.name === 'Admin' && (targetUser.role?.name === 'Owner' || targetUser.role?.name === 'Admin')) {
      res.status(403).json({ success: false, error: 'Admins cannot remove Owners or other Admins' });
      return;
    }

    // Останній OWNER не може видалити себе
    if (targetUser.id === currentUserId && targetUser.role?.name === 'Owner') {
      const ownerCount = await prisma.user.count({
        where: { workspaceId, role: { name: 'Owner' } }
      });
      if (ownerCount <= 1) {
        res.status(400).json({ success: false, error: 'Cannot remove the last Owner of the workspace' });
        return;
      }
    }
    // Якщо це ми самі виходимо з простору, то дозволяємо
    // Якщо ні, то видаляти може тільки OWNER або ADMIN
    if (targetUser.id !== currentUserId && !currentUserRole?.permissions.includes(Permission.MANAGE_USERS) && !currentUserRole?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    await prisma.user.delete({
      where: { id: targetUserId }
    });

    res.json({ success: true, message: 'User removed from workspace successfully' });
  } catch (error) {
    console.error('removeWorkspaceUser error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove user' });
  }
};

// 4. Надіслати запрошення
export const inviteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, role: currentUserRole } = req.user!;
    const { email, roleId } = req.body;

    if (!currentUserRole?.permissions.includes(Permission.MANAGE_ROLES) && !currentUserRole?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    if (!email || !roleId) {
      res.status(400).json({ success: false, error: 'Invalid email or role' });
      return;
    }

    const existingUser = await prisma.user.findFirst({
      where: { email, workspaceId }
    });

    if (existingUser) {
      res.status(400).json({ success: false, error: 'User is already in this workspace' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await prisma.invitation.upsert({
      where: {
        email_workspaceId: { email, workspaceId }
      },
      update: { token, roleId, expiresAt },
      create: { email, workspaceId, token, roleId, expiresAt }
    });

    await sendInvitationEmail(email, workspace!.name);

    res.json({ success: true, message: 'Invitation sent successfully', data: invitation });
  } catch (error) {
    console.error('inviteUser error:', error);
    res.status(500).json({ success: false, error: 'Failed to invite user' });
  }
};


// 5. Отримати активні запрошення для поточного користувача
export const getPendingInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const invitations = await prisma.invitation.findMany({
      where: { 
        email: user.email,
        expiresAt: { gt: new Date() }
      },
      include: {
        workspace: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({ success: true, data: invitations });
  } catch (error) {
    console.error('getPendingInvitations error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending invitations' });
  }
};

// 6. Відхилити запрошення
export const rejectInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.user!;
    const { invitationId } = req.body;

    if (!invitationId) {
      res.status(400).json({ success: false, error: 'Invitation ID is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    
    if (!invitation || invitation.email !== user.email) {
      res.status(404).json({ success: false, error: 'Invitation not found or unauthorized' });
      return;
    }

    await prisma.invitation.delete({ where: { id: invitationId } });
    
    res.json({ success: true, message: 'Invitation rejected' });
  } catch (error) {
    console.error('rejectInvitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject invitation' });
  }
};

// 7. Прийняти запрошення
export const acceptInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, workspaceId: currentWorkspaceId } = req.user!;
    const { invitationId, confirmLeave } = req.body;

    if (!invitationId) {
      res.status(400).json({ success: false, error: 'Invitation ID is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId }
    });

    if (!invitation || invitation.expiresAt < new Date()) {
      res.status(400).json({ success: false, error: 'Invalid or expired invitation' });
      return;
    }

    if (user.email !== invitation.email) {
      res.status(403).json({ success: false, error: 'This invitation is for a different email address' });
      return;
    }

    // Якщо це не новий користувач (створений більше години тому) або його поточний простір не порожній
    if (!confirmLeave) {
      const currentWorkspaceFiles = await prisma.mediaFile.count({ where: { workspaceId: currentWorkspaceId } });
      const currentWorkspaceKeys = await prisma.apiKey.count({ where: { workspaceId: currentWorkspaceId } });
      const userAge = Date.now() - new Date(user.createdAt).getTime();
      const isOldUser = userAge > 1000 * 60 * 60; // 1 година

      if (isOldUser || currentWorkspaceFiles > 0 || currentWorkspaceKeys > 0) {
        res.status(400).json({ 
          success: false, 
          error: 'Ви маєте існуючий робочий простір з даними. Підтвердіть, що хочете покинути його.', 
          requiresConfirmation: true 
        });
        return;
      }
    }
    const oldWorkspaceId = user.workspaceId;

    // Оновлюємо workspaceId та role користувача
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        workspaceId: invitation.workspaceId,
        roleId: invitation.roleId
      }
    });

    // Видаляємо старий робочий простір, якщо він став порожнім
    if (oldWorkspaceId !== invitation.workspaceId) {
      const remainingUsers = await prisma.user.count({ where: { workspaceId: oldWorkspaceId } });
      if (remainingUsers === 0) {
        await prisma.workspace.delete({ where: { id: oldWorkspaceId } });
      }
    }

    // Видаляємо використане запрошення
    await prisma.invitation.delete({ where: { id: invitation.id } });

    // Генеруємо НОВИЙ токен, бо в старому зашитий старий workspaceId!
    const newToken = generateToken(userId, invitation.workspaceId);

    res.json({ 
      success: true, 
      message: 'Joined workspace successfully', 
      workspaceId: invitation.workspaceId,
      token: newToken,
      user: updatedUser
    });
  } catch (error) {
    console.error('acceptInvitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept invitation' });
  }
};


// 8. Покинути робочий простір
export const leaveWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, workspaceId } = req.user!;

    const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    if (user.role?.name === 'Owner') {
      const ownerCount = await prisma.user.count({
        where: { workspaceId, role: { name: 'Owner' } }
      });
      if (ownerCount <= 1) {
        res.status(400).json({ success: false, error: 'Cannot leave workspace as you are the only owner' });
        return;
      }
    }
    const newWorkspace = await prisma.workspace.create({
      data: {
        name: `${user.name || 'Personal'} Workspace`,
        slug: `personal-${user.id}-${Date.now()}`
      }
    });

    const roles = await createDefaultRolesForWorkspace(newWorkspace.id);
    const ownerRole = roles.find(r => r.name === 'Owner');

    await prisma.user.update({
      where: { id: userId },
      data: {
        workspaceId: newWorkspace.id,
        roleId: ownerRole ? ownerRole.id : null
      }
    });

    const newToken = generateToken(userId, newWorkspace.id);

    res.json({ success: true, message: 'Left workspace', token: newToken });
  } catch (error) {
    console.error('leaveWorkspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to leave workspace' });
  }
};
