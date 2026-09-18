import { Router } from 'express';
import { PlantController } from '../controllers/plantController';
import { authenticate, authorize } from '../middleware/auth';
import { ROLES } from '../constants/roles';

const router = Router();
const plantController = new PlantController();

// Create — SUPER_ADMIN only
router.post(
    '/',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    plantController.createPlant
);

// List — all authenticated users (controller scopes results by role)
router.get(
    '/',
    authenticate,
    plantController.getAllPlants
);

// Search — all authenticated users
router.get(
    '/search',
    authenticate,
    plantController.searchPlants
);

// Accessible plants for the requesting user
router.get(
    '/accessible',
    authenticate,
    plantController.getAccessiblePlants
);

// Get by ID — all authenticated users
router.get(
    '/:id',
    authenticate,
    plantController.getPlantById
);

// Stats for a specific plant
router.get(
    '/:id/stats',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.PLANT_ADMIN),
    plantController.getPlantStats
);

// Update — SUPER_ADMIN and PLANT_ADMIN
router.put(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN, ROLES.PLANT_ADMIN),
    plantController.updatePlant
);

// Delete — SUPER_ADMIN only
router.delete(
    '/:id',
    authenticate,
    authorize(ROLES.SUPER_ADMIN),
    plantController.deletePlant
);

export default router;