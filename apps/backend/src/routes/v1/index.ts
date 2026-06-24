import { Router } from 'express';
import multer from 'multer';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware';
import { compressImageController } from '../../controllers/v1/compression.controller';
import { viewMediaController } from '../../controllers/v1/view.controller';
import { listMediaController, deleteMediaController } from '../../controllers/v1/media.controller';

const router: Router = Router();

// Configure multer for memory storage (file buffer is kept in memory)
// Limits: max 10MB file size
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// Public Endpoint to view images
router.get('/media/:workspaceId/:filename', viewMediaController);

// Protect all v1 routes below with API Key authentication
router.use(authenticateApiKey);

// Compression Endpoint
// The user sends an image via multipart/form-data with the field name 'image'
router.post('/compress', upload.single('image'), compressImageController);

// Media Management Endpoints
router.get('/media', listMediaController);
router.delete('/media/:id', deleteMediaController);

export default router;
