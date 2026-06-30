import { Router } from 'express';
import multer from 'multer';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware';
import { compressImageController } from '../../controllers/v1/compression.controller';
import { viewMediaController, viewAvatarController } from '../../controllers/v1/view.controller';
import { listMediaController, deleteMediaController } from '../../controllers/v1/media.controller';
import { listFoldersController, createFolderController, deleteFolderController } from '../../controllers/v1/folders.controller';
import { listTagsController, createTagController, updateTagController, deleteTagController } from '../../controllers/v1/tags.controller';

const router: Router = Router();

import os from 'os';

// Configure multer for temp disk storage (files are streamed to disk)
// Limits: max 10MB file size
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

// Public Endpoints to view images and avatars
router.get('/media/avatars/:filename', viewAvatarController);
router.get('/media/:workspaceId/:filename', viewMediaController);

// Protect all v1 routes below with API Key authentication
router.use(authenticateApiKey);

// Compression Endpoint
// The user sends an image via multipart/form-data with the field name 'image'
import { checkQuota } from '../../middlewares/quota.middleware';
router.post('/compress', upload.single('image'), checkQuota, compressImageController);

// Media Management Endpoints
router.get('/media', listMediaController);
router.delete('/media/:id', deleteMediaController);

// Folders Management Endpoints
router.get('/folders', listFoldersController);
router.post('/folders', createFolderController);
router.delete('/folders/:id', deleteFolderController);

// Tags Management Endpoints
router.get('/tags', listTagsController);
router.post('/tags', createTagController);
router.patch('/tags/:id', updateTagController);
router.delete('/tags/:id', deleteTagController);

// Trash Management Endpoints
import {
  listTrashV1Controller,
  restoreFileV1Controller,
  restoreFolderV1Controller,
  emptyTrashV1Controller
} from '../../controllers/v1/trash.controller';

router.get('/trash', listTrashV1Controller);
router.post('/media/:id/restore', restoreFileV1Controller);
router.post('/folders/:id/restore', restoreFolderV1Controller);
router.delete('/trash/empty', emptyTrashV1Controller);

export default router;
