import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';
import { ROLES } from '../constants/roles';
import multer from 'multer';

const router = Router();
const userController = new UserController();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.put('/change-password', authenticate, userController.changePassword);

// Admin routes
router.get(
    '/import-template',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    userController.downloadImportTemplate
);

router.get(
    '/bulk-export',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    userController.bulkExportUsers
);

router.post(
    '/bulk-import',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    upload.single('file'),
    userController.bulkImportUsers
);

router.post(
    '/',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    userController.createUser
);

router.get(
    '/',
    authenticate,
    userController.getAllUsers
);

router.get(
    '/:id',
    authenticate,
    userController.getUserById
);

router.put(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    userController.updateUser
);

router.post(
    '/:id/reset-password',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    userController.resetUserPassword
);

router.delete(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN),
    userController.deleteUser
);

export default router;