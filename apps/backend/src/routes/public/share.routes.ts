import { Router } from 'express';
import { getShareLinkInfo, downloadShareLink } from '../../controllers/public-share.controller';
import { globalApiLimiter } from '../../middleware/rate-limit';

const router: Router = Router();

router.use(globalApiLimiter);

router.post('/:slug', getShareLinkInfo);
router.get('/:slug/download', downloadShareLink);

export default router;
