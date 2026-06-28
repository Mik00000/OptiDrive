import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.middleware';
import {
  getTrashItems,
  restoreFile,
  restoreFolder,
  restoreBulk,
  deleteFilePermanently,
  deleteFolderPermanently,
  deleteBulkPermanently,
  emptyTrash
} from '../../controllers/trash.controller';

const router: Router = Router();

router.use(requireAuth);

router.get('/', getTrashItems);
router.post('/media/:id/restore', restoreFile);
router.post('/folders/:id/restore', restoreFolder);
router.post('/restore-bulk', restoreBulk);
router.delete('/media/:id/permanent', deleteFilePermanently);
router.delete('/folders/:id/permanent', deleteFolderPermanently);
router.post('/delete-bulk', deleteBulkPermanently);
router.delete('/empty', emptyTrash);

export default router;
