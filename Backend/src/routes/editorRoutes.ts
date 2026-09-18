import { Router } from 'express';
import { EditorController } from '../controllers/editorController';
import { authenticate } from '../middleware/auth';

const router = Router();
const editorController = new EditorController();

router.get('/config/:fileId', authenticate, editorController.getConfig);
router.post('/callback', editorController.handleCallback);

export default router;
