import { Router } from 'express';
import { DepartmentController } from '../controllers/departmentController';
import { authenticate, authorize, requirePlantAccess } from '../middleware/auth';
import { ROLES } from '../constants/roles';
import { RequestHandler } from 'express';

const router = Router();
const departmentController = new DepartmentController();

const authMiddleware = authenticate as RequestHandler;
const authorizeMiddleware = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN) as RequestHandler;

router.post(
    '/',
    authMiddleware,
    authorizeMiddleware,
    departmentController.createDepartment as RequestHandler
);
router.get(
    '/',
    authenticate,
    departmentController.getAllDepartments
);

router.get(
    '/:id',
    authenticate,
    departmentController.getDepartmentById
);

router.put(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    departmentController.updateDepartment
);

router.delete(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN),
    departmentController.deleteDepartment
);

export default router;