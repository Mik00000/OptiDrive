import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { prisma } from '../../config/prisma';
import { Permission } from '@prisma/client';

export const getRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;

    const roles = await prisma.role.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { users: true } }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ success: true, data: roles });
  } catch (error) {
    console.error('getRoles error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch roles' });
  }
};

export const createRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const { name, description, permissions } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ success: false, error: 'Role name is required' });
      return;
    }

    if (!Array.isArray(permissions)) {
      res.status(400).json({ success: false, error: 'Permissions must be an array' });
      return;
    }

    // validate permissions
    const validPermissions = Object.values(Permission);
    const isValid = permissions.every(p => validPermissions.includes(p));
    if (!isValid) {
      res.status(400).json({ success: false, error: 'Invalid permissions provided' });
      return;
    }

    const existingRole = await prisma.role.findUnique({
      where: { name_workspaceId: { name, workspaceId } }
    });

    if (existingRole) {
      res.status(400).json({ success: false, error: 'Role with this name already exists' });
      return;
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions,
        workspaceId,
        isSystem: false
      }
    });

    res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error('createRole error:', error);
    res.status(500).json({ success: false, error: 'Failed to create role' });
  }
};

export const updateRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const { roleId } = req.params;
    const { name, description, permissions } = req.body;

    const role = await prisma.role.findUnique({
      where: { id: roleId as string, workspaceId }
    });

    if (!role) {
      res.status(404).json({ success: false, error: 'Role not found' });
      return;
    }

    if (role.isSystem) {
      res.status(403).json({ success: false, error: 'Cannot modify system roles' });
      return;
    }

    const updatedRole = await prisma.role.update({
      where: { id: roleId as string },
      data: {
        name: name !== undefined ? name : role.name,
        description: description !== undefined ? description : role.description,
        permissions: permissions !== undefined ? permissions : role.permissions,
      }
    });

    res.json({ success: true, data: updatedRole });
  } catch (error) {
    console.error('updateRole error:', error);
    res.status(500).json({ success: false, error: 'Failed to update role' });
  }
};

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { workspaceId } = req.user!;
    const { roleId } = req.params;

    const role = await prisma.role.findUnique({
      where: { id: roleId as string, workspaceId },
      include: { _count: { select: { users: true, invitations: true } } }
    });

    if (!role) {
      res.status(404).json({ success: false, error: 'Role not found' });
      return;
    }

    if (role.isSystem) {
      res.status(403).json({ success: false, error: 'Cannot delete system roles' });
      return;
    }

    if (role._count.users > 0 || role._count.invitations > 0) {
      res.status(400).json({ success: false, error: 'Cannot delete role that is in use by users or invitations' });
      return;
    }

    await prisma.role.delete({
      where: { id: roleId as string }
    });

    res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('deleteRole error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete role' });
  }
};
