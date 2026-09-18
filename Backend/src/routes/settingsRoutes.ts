import { Router } from 'express';
import { SettingsController } from '../controllers/settingsController';
import { authenticate } from '../middleware/auth';

const router = Router();
const settingsController = new SettingsController();

router.get('/', authenticate, settingsController.getSettings);
router.put('/:key', authenticate, settingsController.updateSetting);

export default router;
