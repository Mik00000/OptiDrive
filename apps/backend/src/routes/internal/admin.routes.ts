import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  getEnterpriseRequests,
  approveEnterpriseRequest,
  rejectEnterpriseRequest,
  getAdminIncidents,
  createIncident,
  updateIncident,
  deleteIncident,
  getWorkspacesAndUsers,
  updateWorkspaceBonus,
  toggleWorkspaceBan,
  toggleUserBan,
  purgeCdnCache,
  getTrafficAnalytics,
} from '../../controllers/admin.controller';

const router: Router = Router();

// Усі адмінські роути потребують авторизації
router.use(requireAuth);

router.get('/enterprise-requests', getEnterpriseRequests);
router.post('/enterprise-requests/:id/approve', approveEnterpriseRequest);
router.post('/enterprise-requests/:id/reject', rejectEnterpriseRequest);

router.get('/incidents', getAdminIncidents);
router.post('/incidents', createIncident);
router.patch('/incidents/:id', updateIncident);
router.delete('/incidents/:id', deleteIncident);

// Нові адмінські маршрути управління
router.get('/workspaces', getWorkspacesAndUsers);
router.post('/workspaces/:id/bonus', updateWorkspaceBonus);
router.post('/workspaces/:id/ban', toggleWorkspaceBan);
router.post('/users/:id/ban', toggleUserBan);
router.post('/cdn/purge', purgeCdnCache);
router.get('/traffic/realtime', getTrafficAnalytics);

export default router;
