import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  getEnterpriseRequests,
  approveEnterpriseRequest,
  rejectEnterpriseRequest,
} from '../../controllers/admin.controller';

const router: Router = Router();

// Усі адмінські роути потребують авторизації
router.use(requireAuth);

router.get('/enterprise-requests', getEnterpriseRequests);
router.post('/enterprise-requests/:id/approve', approveEnterpriseRequest);
router.post('/enterprise-requests/:id/reject', rejectEnterpriseRequest);

export default router;
