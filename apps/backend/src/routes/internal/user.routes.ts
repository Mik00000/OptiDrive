import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middlewares/auth.middleware';
import { 
  getUserNotifications, 
  updateUserNotifications,
  updateUserProfile,
  confirmEmailChange,
  uploadAvatar,
  deleteAvatar,
  deleteAccount,
  changePassword
} from '../../controllers/user.controller';

const router: Router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

router.use(requireAuth);

router.get('/notifications', getUserNotifications);
router.put('/notifications', updateUserNotifications);
router.put('/profile', updateUserProfile);
router.post('/confirm-email-change', confirmEmailChange);
router.post('/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/avatar', deleteAvatar);
router.delete('/account', deleteAccount);
router.put('/change-password', changePassword);

export default router;
