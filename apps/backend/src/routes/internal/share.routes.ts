import { Router } from 'express';
import { createShareLink, listShareLinks, deleteShareLink } from '../../controllers/share.controller';
import { requireAuth } from '../../middlewares/auth.middleware';

const router: Router = Router();

router.use(requireAuth);

router.post('/', createShareLink);
router.get('/', listShareLinks);
router.delete('/:id', deleteShareLink);

export default router;
