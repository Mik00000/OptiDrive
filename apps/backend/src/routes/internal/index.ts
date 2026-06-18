import { Router } from 'express';
import { register, login } from '../../controllers/auth.controller';
import apiKeysRoutes from './api-keys.routes';
import oauthRoutes from './oauth.routes';

const router: Router = Router();

router.post('/register', register);
router.post('/login', login);

router.use('/auth', oauthRoutes);
router.use('/api-keys', apiKeysRoutes);

export default router;
