import { Router } from 'express';
import { getShareLinkInfo, downloadShareLink } from '../../controllers/public-share.controller';
import { shareLinkLimiter } from '../../middleware/rate-limit';

const router: Router = Router();

router.use(shareLinkLimiter);

router.post('/:slug', getShareLinkInfo);
router.get('/:slug/download', downloadShareLink);

export default router;
