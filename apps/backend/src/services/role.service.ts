import { prisma } from '../config/prisma';
import { Permission } from '@prisma/client';

export const createDefaultRolesForWorkspace = async (workspaceId: string) => {
  const roles = [
    {
      name: 'Owner',
      description: 'Full access to all workspace settings, billing, and team management.',
      isSystem: true,
      permissions: [
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLES,
        Permission.MANAGE_BILLING,
        Permission.UPLOAD_FILES,
        Permission.DELETE_FILES,
        Permission.MANAGE_API_KEYS,
        Permission.VIEW_ANALYTICS,
      ],
      workspaceId
    },
    {
      name: 'Admin',
      description: 'Can manage team members, roles, API keys, and workspace content. Cannot manage billing.',
      isSystem: true,
      permissions: [
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLES,
        Permission.UPLOAD_FILES,
        Permission.DELETE_FILES,
        Permission.MANAGE_API_KEYS,
        Permission.VIEW_ANALYTICS,
      ],
      workspaceId
    },
    {
      name: 'Member',
      description: 'Standard member. Can upload/delete files and view analytics.',
      isSystem: true,
      permissions: [
        Permission.UPLOAD_FILES,
        Permission.DELETE_FILES,
        Permission.VIEW_ANALYTICS,
      ],
      workspaceId
    },
    {
      name: 'Viewer',
      description: 'Read-only access. Can view analytics and files, but cannot make changes.',
      isSystem: true,
      permissions: [
        Permission.VIEW_ANALYTICS,
      ],
      workspaceId
    }
  ];

  const createdRoles = await Promise.all(
    roles.map(role => prisma.role.create({ data: role }))
  );

  return createdRoles;
};
