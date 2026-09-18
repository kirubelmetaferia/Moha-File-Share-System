import { Router } from 'express';
import { FolderController } from '../controllers/folderController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';

const router = Router();
const folderController = new FolderController();

router.post('/', authenticate, requirePermission('FOLDER', 'UPLOAD'), folderController.createFolder);
router.get('/', authenticate, folderController.getFolders);
router.get('/:id', authenticate, requirePermission('FOLDER', 'VIEW'), folderController.getFolderById);
router.put('/:id', authenticate, requirePermission('FOLDER', 'MODIFY'), folderController.updateFolder);
router.delete('/:id', authenticate, requirePermission('FOLDER', 'DELETE'), folderController.deleteFolder);

export default router;
