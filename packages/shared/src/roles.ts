export const Permission = {
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_ROLES: 'MANAGE_ROLES',
  MANAGE_BILLING: 'MANAGE_BILLING',
  UPLOAD_FILES: 'UPLOAD_FILES',
  DELETE_FILES: 'DELETE_FILES',
  MANAGE_API_KEYS: 'MANAGE_API_KEYS',
  VIEW_ANALYTICS: 'VIEW_ANALYTICS',
  MANAGE_WORKSPACE: 'MANAGE_WORKSPACE'
} as const;

export type Permission = typeof Permission[keyof typeof Permission];

export interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissions: Permission[];
  workspaceId: string;
}
