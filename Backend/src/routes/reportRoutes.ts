import { Router } from 'express';
import { ReportController } from '../controllers/reportController';
import { authenticate, authorize } from '../middleware/auth';
import { ROLES } from '../constants/roles';

const router = Router();
const reportController = new ReportController();

// Only Super Admin and Plant Admin can view reports
router.use(authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.PLANT_ADMIN));

router.get('/storage', reportController.getStorageUsage);
router.get('/active-files', reportController.getActiveFiles);
router.get('/stale-files', reportController.getStaleFiles);
router.get('/active-users', reportController.getActiveUsers);

export default router;
