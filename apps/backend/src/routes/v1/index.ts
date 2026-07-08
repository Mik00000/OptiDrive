import { Router } from 'express';
import multer from 'multer';
import { authenticateApiKey } from '../../middlewares/apiKey.middleware';
import { v1ApiLimiter, v1CompressLimiter } from '../../middleware/rate-limit';
import { compressImageController, compressImageUrlController } from '../../controllers/v1/compression.controller';
import { viewMediaController, viewAvatarController, viewWatermarkController } from '../../controllers/v1/view.controller';
import { listMediaController, deleteMediaController, getMediaDetailV1Controller, purgeMediaCacheV1Controller } from '../../controllers/v1/media.controller';
import { getWorkspaceAnalyticsV1Controller } from '../../controllers/v1/analytics.controller';
import { listFoldersController, createFolderController, deleteFolderController } from '../../controllers/v1/folders.controller';
import { listTagsController, createTagController, updateTagController, deleteTagController } from '../../controllers/v1/tags.controller';
import { getWorkspaceStatsV1Controller, getWorkspacePresetsV1Controller, getApiHealthV1Controller } from '../../controllers/v1/workspace.controller';
import { listWebhooksV1Controller, createWebhookV1Controller, deleteWebhookV1Controller } from '../../controllers/v1/webhook.controller';

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

// Public Endpoints to view images, avatars and watermarks
router.get('/media/avatars/:filename', viewAvatarController);
router.get('/media/watermarks/:filename', viewWatermarkController);
router.get('/media/:workspaceId/:filename', viewMediaController);
router.get('/ping', v1ApiLimiter, (req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

// Protect all v1 routes below with API Key authentication
router.use(authenticateApiKey);
router.use(v1ApiLimiter);

import { blockDuringMigration } from '../../middlewares/migration.middleware';
import { blockIfWorkspaceLocked } from '../../middlewares/lock.middleware';
router.use((req, res, next) => {
  if (req.method !== 'GET') {
    blockDuringMigration(req, res, (err) => {
      if (err) return next(err);
      blockIfWorkspaceLocked(req, res, next);
    });
  } else {
    next();
  }
});

// Workspace Stats, Presets, Health and Analytics Endpoints
router.get('/stats', getWorkspaceStatsV1Controller);
router.get('/presets', getWorkspacePresetsV1Controller);
router.get('/health', getApiHealthV1Controller);
router.get('/analytics', getWorkspaceAnalyticsV1Controller);

// Webhook Management Endpoints
router.get('/webhooks', listWebhooksV1Controller);
router.post('/webhooks', createWebhookV1Controller);
router.delete('/webhooks/:id', deleteWebhookV1Controller);

// Compression Endpoint
// The user sends an image via multipart/form-data with the field name 'image'
import { checkQuota } from '../../middlewares/quota.middleware';
router.post('/compress', v1CompressLimiter, upload.single('image'), checkQuota, compressImageController);
router.post('/compress/url', v1CompressLimiter, checkQuota, compressImageUrlController);

// Media Management Endpoints
router.get('/media', listMediaController);
router.get('/media/:id', getMediaDetailV1Controller);
router.post('/media/:id/purge', purgeMediaCacheV1Controller);
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
