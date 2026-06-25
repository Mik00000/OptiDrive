import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { compressImageController } from '../../controllers/v1/compression.controller';
import { getMediaFiles, deleteMediaFile, updateMediaFile, downloadMediaFile } from '../../controllers/media.controller';
import multer from 'multer';

const router: Router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

import { checkQuota } from '../../middlewares/quota.middleware';
router.use(requireAuth);

router.post('/compress', upload.single('image'), checkQuota, compressImageController);
router.get('/', getMediaFiles);
router.get('/download/:id', downloadMediaFile);
router.delete('/:id', deleteMediaFile);
router.patch('/:id', updateMediaFile);

export default router;
