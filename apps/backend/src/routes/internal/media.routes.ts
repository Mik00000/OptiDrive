import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import { compressImageController } from '../../controllers/v1/compression.controller';
import { getMediaFiles, deleteMediaFile, updateMediaFile } from '../../controllers/media.controller';
import multer from 'multer';

const router: Router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

router.use(requireAuth);

router.post('/compress', upload.single('image'), compressImageController);
router.get('/', getMediaFiles);
router.delete('/:id', deleteMediaFile);
router.patch('/:id', updateMediaFile);

export default router;
