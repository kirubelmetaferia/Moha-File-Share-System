import { Router } from 'express';
import { SectionController } from '../controllers/sectionController';
import { authenticate, authorize } from '../middleware/auth';
import { ROLES } from '../constants/roles';

const router = Router();
const sectionController = new SectionController();

router.post(
    '/',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    sectionController.createSection
);

router.get(
    '/',
    authenticate,
    sectionController.getSections
);

router.get(
    '/:id',
    authenticate,
    sectionController.getSectionById
);

router.put(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    sectionController.updateSection
);

router.delete(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN, ROLES.DEPARTMENT_HEAD),
    sectionController.deleteSection
);

export default router;
