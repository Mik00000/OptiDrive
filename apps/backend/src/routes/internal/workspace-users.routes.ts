import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { requirePermissions } from '../../middlewares/rbac.middleware';
import { getWorkspaceUsers, updateUserRole, removeWorkspaceUser, inviteUser, acceptInvitation, getPendingInvitations, rejectInvitation, leaveWorkspace } from '../../controllers/internal/workspace-users.controller';
import { Permission } from '@prisma/client';

const router: Router = Router();

// Всі роути тут вимагають аутентифікації
router.use(requireAuth);

// Отримати список користувачів робочого простору (доступно всім)
router.get(
  '/', 
  getWorkspaceUsers
);

// Змінити роль користувача
router.patch(
  '/:targetUserId/role', 
  requirePermissions([Permission.MANAGE_ROLES]), 
  updateUserRole
);

// Видалити користувача з робочого простору
// Дозволяємо доступ всім, оскільки користувач може видалити сам себе (вийти з простору)
// Безпосередня перевірка дозволів знаходиться в самому контролері
router.delete(
  '/:targetUserId', 
  removeWorkspaceUser
);

// Запросити користувача
router.post(
  '/invite',
  requirePermissions([Permission.MANAGE_USERS]),
  inviteUser
);

// Отримати активні запрошення поточного користувача
router.get(
  '/pending-invitations',
  getPendingInvitations
);

// Прийняти запрошення
// Для прийняття не вимагаємо ролей, достатньо бути авторизованим
router.post(
  '/accept-invitation',
  acceptInvitation
);

// Відхилити запрошення
router.post(
  '/reject-invitation',
  rejectInvitation
);

// Покинути робочий простір
router.post(
  '/leave',
  leaveWorkspace
);

export default router;
