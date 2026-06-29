import { Router } from 'express';
import { register, login, verifyEmailController, resendVerificationController, forgotPasswordController, resetPasswordController } from '../../controllers/auth.controller';
import { loginLimiter, registerLimiter, verifyEmailLimiter, resendVerificationLimiter, globalApiLimiter } from '../../middleware/rate-limit';
import apiKeysRoutes from './api-keys.routes';
import oauthRoutes from './oauth.routes';
import mediaRoutes from './media.routes';
import foldersRoutes from './folders.routes';
import trashRoutes from './trash.routes';
import workspaceRoutes from './workspace.routes';
import workspaceUsersRoutes from './workspace-users.routes';
import rolesRoutes from './roles.routes';
import shareRoutes from './share.routes';
import webhookRoutes from './webhook.routes';

const router: Router = Router();

// Apply global API rate limit
router.use(globalApiLimiter);

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/verify-email', verifyEmailLimiter, verifyEmailController);
router.post('/resend-verification-email', resendVerificationLimiter, resendVerificationController);
router.post('/forgot-password', resendVerificationLimiter, forgotPasswordController);
router.post('/reset-password', verifyEmailLimiter, resetPasswordController);

router.use('/auth', oauthRoutes);
router.use('/api-keys', apiKeysRoutes);
router.use('/media', mediaRoutes);
router.use('/folders', foldersRoutes);
router.use('/trash', trashRoutes);
router.use('/workspace', workspaceRoutes);
router.use('/workspace-users', workspaceUsersRoutes);
router.use('/roles', rolesRoutes);
router.use('/share', shareRoutes);
router.use('/webhooks', webhookRoutes);

export default router;
