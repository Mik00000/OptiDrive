import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { compressImageController } from '../../controllers/v1/compression.controller';
import { getMediaFiles, deleteMediaFile, updateMediaFile, downloadMediaFile, getWorkspaceTags } from '../../controllers/media.controller';
import multer from 'multer';

const router: Router = Router();

import os from 'os';

// Configure multer for temp disk storage
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

import { checkQuota } from '../../middlewares/quota.middleware';
router.use(requireAuth);

router.post('/compress', upload.single('image'), checkQuota, compressImageController);
router.get('/tags', getWorkspaceTags);
router.get('/', getMediaFiles);
router.get('/download/:id', downloadMediaFile);
router.delete('/:id', deleteMediaFile);
router.patch('/:id', updateMediaFile);

export default router;
