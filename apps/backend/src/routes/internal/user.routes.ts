import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { getUserNotifications, updateUserNotifications } from '../../controllers/user.controller';

const router: Router = Router();

router.use(requireAuth);

router.get('/notifications', getUserNotifications);
router.put('/notifications', updateUserNotifications);

export default router;
