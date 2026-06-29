import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import { Permission } from '@prisma/client';
import crypto from 'crypto';
import { sendInvitationEmail } from '../../services/email.service';
import { generateToken } from '../../utils/jwt';
import { createDefaultRolesForWorkspace } from '../../services/role.service';
import { logActivity } from '../../services/activity.service';

// 1. Отримати всіх користувачів робочого простору
export const getWorkspaceUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;

    const members = await prisma.workspaceUser.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedUsers = members.map(m => ({
      id: m.user.id,
      email: m.user.email,
      name: m.user.name,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
      createdAt: m.user.createdAt
    }));

    res.json({ success: true, data: formattedUsers });
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

    if (!currentUserRole?.permissions.includes(Permission.MANAGE_ROLES) && !currentUserRole?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const targetMember = await prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId
        }
      },
      include: { role: true }
    });

    if (!targetMember) {
      res.status(404).json({ success: false, error: 'User not found in this workspace' });
      return;
    }

    if (targetMember.role?.name === 'Owner' && currentUserRole?.name !== 'Owner') {
      res.status(403).json({ success: false, error: 'Admins cannot change an Owner\'s role' });
      return;
    }

    const newRoleObj = await prisma.role.findFirst({
      where: { id: newRoleId, workspaceId }
    });

    if (!newRoleObj) {
      res.status(400).json({ success: false, error: 'Role not found in this workspace' });
      return;
    }

    if (newRoleObj?.name === 'Owner' && targetMember.role?.name !== 'Owner') {
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (workspace?.plan === 'FREE') {
        const existingFreeWorkspace = await prisma.workspaceUser.findFirst({
          where: {
            userId: targetUserId,
            role: { name: 'Owner' },
            workspace: { plan: 'FREE' }
          }
        });
        
        if (existingFreeWorkspace) {
          res.status(403).json({ success: false, error: 'Target user already owns a free workspace.' });
          return;
        }
      }
    }

    if (targetMember.userId === currentUserId && targetMember.role?.name === 'Owner') {
      if (newRoleObj.name !== 'Owner') {
        const ownerCount = await prisma.workspaceUser.count({
          where: { workspaceId, role: { name: 'Owner' } }
        });
        if (ownerCount <= 1) {
          res.status(400).json({ success: false, error: 'Cannot demote the last Owner of the workspace' });
          return;
        }
      }
    }

    const updatedMember = await prisma.workspaceUser.update({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId
        }
      },
      data: { roleId: newRoleId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        id: updatedMember.user.id,
        email: updatedMember.user.email,
        name: updatedMember.user.name,
        role: updatedMember.role
      }
    });
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

    const targetMember = await prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId
        }
      },
      include: { role: true, user: true }
    });

    if (!targetMember) {
      res.status(404).json({ success: false, error: 'User not found in this workspace' });
      return;
    }

    if (currentUserRole?.name === 'Admin' && (targetMember.role?.name === 'Owner' || targetMember.role?.name === 'Admin')) {
      res.status(403).json({ success: false, error: 'Admins cannot remove Owners or other Admins' });
      return;
    }

    if (targetMember.userId === currentUserId && targetMember.role?.name === 'Owner') {
      const ownerCount = await prisma.workspaceUser.count({
        where: { workspaceId, role: { name: 'Owner' } }
      });
      if (ownerCount <= 1) {
        res.status(400).json({ success: false, error: 'Cannot remove the last Owner of the workspace' });
        return;
      }
    }

    if (targetMember.userId !== currentUserId && !currentUserRole?.permissions.includes(Permission.MANAGE_USERS) && !currentUserRole?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    // Видаляємо зв'язок M2M
    await prisma.workspaceUser.delete({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId
        }
      }
    });

    // Якщо це був активний воркспейс користувача, змінюємо його
    if (targetMember.user.activeWorkspaceId === workspaceId) {
      const nextMember = await prisma.workspaceUser.findFirst({
        where: { userId: targetUserId }
      });
      if (nextMember) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { activeWorkspaceId: nextMember.workspaceId }
        });
      } else {
        const name = targetMember.user.name || targetMember.user.email.split('@')[0];
        const newWorkspace = await prisma.workspace.create({
          data: {
            name: `${name}'s Workspace`,
            slug: `personal-${targetUserId}-${Date.now()}`
          }
        });
        const roles = await createDefaultRolesForWorkspace(newWorkspace.id);
        const ownerRole = roles.find(r => r.name === 'Owner')!;
        await prisma.workspaceUser.create({
          data: {
            userId: targetUserId,
            workspaceId: newWorkspace.id,
            roleId: ownerRole.id
          }
        });
        await prisma.user.update({
          where: { id: targetUserId },
          data: { activeWorkspaceId: newWorkspace.id }
        });
      }
    }

    res.json({ success: true, message: 'User removed from workspace successfully' });
  } catch (error) {
    console.error('removeWorkspaceUser error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove user' });
  }
};

// 4. Надіслати запрошення
export const inviteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, userId: currentUserId, role: currentUserRole } = req.user!;
    const { email, roleId } = req.body;

    if (!currentUserRole?.permissions.includes(Permission.MANAGE_ROLES) && !currentUserRole?.isSystem) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    if (!email || !roleId) {
      res.status(400).json({ success: false, error: 'Invalid email or role' });
      return;
    }

    const targetRole = await prisma.role.findFirst({
      where: { id: roleId, workspaceId }
    });
    if (!targetRole) {
      res.status(400).json({ success: false, error: 'Role not found in this workspace' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    // Check Plan Limits
    const { PLANS } = await import('@optidrive/shared');
    const planLimits = PLANS[workspace.plan as keyof typeof PLANS] || PLANS.FREE;
    
    const currentMembersCount = await prisma.workspaceUser.count({ where: { workspaceId } });
    const pendingInvitesCount = await prisma.invitation.count({ where: { workspaceId, expiresAt: { gt: new Date() } } });
    
    if (currentMembersCount + pendingInvitesCount >= planLimits.maxMembers) {
      res.status(403).json({ success: false, error: `Member limit reached for your ${workspace.plan} plan (${planLimits.maxMembers} members). Please upgrade your plan.` });
      return;
    }

    const existingMember = await prisma.workspaceUser.findFirst({
      where: {
        workspaceId,
        user: { email }
      }
    });

    if (existingMember) {
      res.status(400).json({ success: false, error: 'User is already in this workspace' });
      return;
    }

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

    await logActivity(workspaceId, currentUserId, 'MEMBER_INVITED', `Invited ${email} to join the workspace`);

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
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
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

    const user = await prisma.user.findUnique({ where: { id: userId } });
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
    const { invitationId } = req.body;

    if (!invitationId) {
      res.status(400).json({ success: false, error: 'Invitation ID is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
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

    const isAlreadyMember = await prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: invitation.workspaceId
        }
      }
    });

    if (!isAlreadyMember) {
      await prisma.workspaceUser.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          roleId: invitation.roleId
        }
      });
      await logActivity(invitation.workspaceId, userId, 'MEMBER_JOINED', `User ${user.email} joined the workspace`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        activeWorkspaceId: invitation.workspaceId
      }
    });



    await prisma.invitation.delete({ where: { id: invitation.id } });

    const newToken = generateToken(userId, invitation.workspaceId);

    res.json({ 
      success: true, 
      message: 'Joined workspace successfully', 
      workspaceId: invitation.workspaceId,
      token: newToken,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        workspaceId: updatedUser.activeWorkspaceId
      }
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

    const member = await prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      },
      include: { role: true, user: true }
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }

    let shouldDeleteWorkspace = false;
    
    if (member.role?.name === 'Owner') {
      const ownerCount = await prisma.workspaceUser.count({
        where: { workspaceId, role: { name: 'Owner' } }
      });
      if (ownerCount <= 1) {
        const totalMembers = await prisma.workspaceUser.count({
          where: { workspaceId }
        });
        
        if (totalMembers === 1) {
          shouldDeleteWorkspace = true;
        } else {
          res.status(400).json({ success: false, error: 'Cannot leave workspace as you are the only owner. Transfer ownership first.' });
          return;
        }
      }
    }

    await prisma.workspaceUser.delete({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      }
    });

    await logActivity(workspaceId, userId, 'MEMBER_LEFT', `User ${member.user.email} left the workspace`);

    if (shouldDeleteWorkspace) {
      await prisma.workspace.delete({ where: { id: workspaceId } });
    }

    const nextMember = await prisma.workspaceUser.findFirst({
      where: { userId }
    });

    let activeId: string;
    if (nextMember) {
      activeId = nextMember.workspaceId;
      await prisma.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: activeId }
      });
    } else {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const displayName = user?.name || user?.email.split('@')[0] || 'Personal';
      const newWorkspace = await prisma.workspace.create({
        data: {
          name: `${displayName}'s Workspace`,
          slug: `personal-${userId}-${Date.now()}`
        }
      });
      const roles = await createDefaultRolesForWorkspace(newWorkspace.id);
      const ownerRole = roles.find(r => r.name === 'Owner')!;
      
      await prisma.workspaceUser.create({
        data: {
          userId,
          workspaceId: newWorkspace.id,
          roleId: ownerRole.id
        }
      });

      activeId = newWorkspace.id;
      await prisma.user.update({
        where: { id: userId },
        data: { activeWorkspaceId: activeId }
      });
    }

    const newToken = generateToken(userId, activeId);
    res.json({ success: true, message: 'Left workspace', token: newToken, workspaceId: activeId });
  } catch (error) {
    console.error('leaveWorkspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to leave workspace' });
  }
};

export const transferOwnership = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId, userId: currentUserId, role: currentUserRole } = req.user!;
    const { targetUserId } = req.body;

    if (!targetUserId) {
      res.status(400).json({ success: false, error: 'Target user ID is required' });
      return;
    }

    if (currentUserId === targetUserId) {
      res.status(400).json({ success: false, error: 'Cannot transfer ownership to yourself' });
      return;
    }

    if (currentUserRole?.name !== 'Owner') {
      res.status(403).json({ success: false, error: 'Only the Owner can transfer ownership' });
      return;
    }

    const targetMember = await prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: { userId: targetUserId, workspaceId }
      }
    });

    if (!targetMember) {
      res.status(404).json({ success: false, error: 'Target user is not a member of this workspace' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (workspace?.plan === 'FREE') {
      const existingFreeWorkspace = await prisma.workspaceUser.findFirst({
        where: {
          userId: targetUserId,
          role: { name: 'Owner' },
          workspace: { plan: 'FREE' }
        }
      });
      
      if (existingFreeWorkspace) {
        res.status(403).json({ success: false, error: 'Target user already owns a free workspace.' });
        return;
      }
    }

    const ownerRole = await prisma.role.findFirst({
      where: { workspaceId, name: 'Owner', isSystem: true }
    });

    const adminRole = await prisma.role.findFirst({
      where: { workspaceId, name: 'Admin', isSystem: true }
    });

    if (!ownerRole || !adminRole) {
      res.status(500).json({ success: false, error: 'Critical workspace roles not found' });
      return;
    }

    await prisma.$transaction([
      prisma.workspaceUser.update({
        where: { userId_workspaceId: { userId: targetUserId, workspaceId } },
        data: { roleId: ownerRole.id }
      }),
      prisma.workspaceUser.update({
        where: { userId_workspaceId: { userId: currentUserId, workspaceId } },
        data: { roleId: adminRole.id }
      })
    ]);

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (targetUser) {
      await logActivity(workspaceId, currentUserId, 'OWNERSHIP_TRANSFERRED', `Transferred ownership to ${targetUser.email}`);
    }

    res.json({ success: true, message: 'Ownership transferred successfully' });
  } catch (error) {
    console.error('transferOwnership error:', error);
    res.status(500).json({ success: false, error: 'Failed to transfer ownership' });
  }
};
