import { Router } from 'express';
import { FileController } from '../controllers/fileController';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/authorize';
import { uploadSingle } from '../middleware/upload';

const router = Router();
const fileController = new FileController();

router.post(
    '/upload',
    authenticate,
    uploadSingle,
    requirePermission('FOLDER', 'UPLOAD'),
    fileController.uploadFile
);

router.get(
    '/',
    authenticate,
    fileController.getAllFiles
);

router.get(
    '/recycle-bin',
    authenticate,
    fileController.getRecycleBin
);

router.get(
    '/:id',
    authenticate,
    requirePermission('FILE', 'VIEW'),
    fileController.getFileById
);

router.get(
    '/:id/download',
    authenticate,
    requirePermission('FILE', 'DOWNLOAD'),
    fileController.downloadFile
);

router.get(
    '/:id/preview',
    authenticate,
    requirePermission('FILE', 'VIEW'),
    fileController.previewFile
);

router.put(
    '/:id',
    authenticate,
    requirePermission('FILE', 'MODIFY'),
    fileController.updateFile
);

router.delete(
    '/:id',
    authenticate,
    requirePermission('FILE', 'DELETE'),
    fileController.deleteFile
);

router.get(
    '/:id/versions',
    authenticate,
    requirePermission('FILE', 'VIEW'),
    fileController.getFileVersions
);

router.post(
    '/:id/versions',
    authenticate,
    uploadSingle,
    requirePermission('FILE', 'MODIFY'),
    fileController.uploadFileVersion
);

router.post(
    '/:id/versions/:versionId/restore',
    authenticate,
    requirePermission('FILE', 'MODIFY'),
    fileController.restoreFileVersion
);

router.post(
    '/:id/restore',
    authenticate,
    requirePermission('FILE', 'DELETE'),
    fileController.restoreFile
);

router.delete(
    '/:id/hard',
    authenticate,
    requirePermission('FILE', 'DELETE'),
    fileController.hardDeleteFile
);

router.post(
    '/:id/move',
    authenticate,
    requirePermission('FILE', 'MODIFY'),
    fileController.moveFile
);

router.post(
    '/:id/copy',
    authenticate,
    requirePermission('FILE', 'DOWNLOAD'),
    fileController.copyFile
);

router.get(
    '/:id/activity',
    authenticate,
    requirePermission('FILE', 'UPLOAD'), // Only share/full control permissions can view activity
    fileController.getFileAccessLogs
);

export default router;