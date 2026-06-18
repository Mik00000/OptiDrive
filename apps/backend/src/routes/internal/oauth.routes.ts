import { Router } from 'express';
import { googleAuth, googleCallback, githubAuth, githubCallback } from '../../controllers/oauth.controller';

const router: Router = Router();

router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

export default router;
