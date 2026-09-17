import { Router } from 'express';
import { CloudImportController } from '../controllers/cloudImportController';
import { authenticate } from '../middleware/auth';

const router = Router();
const cloudImportController = new CloudImportController();

router.post('/google', authenticate, cloudImportController.importFromGoogle);

export default router;
