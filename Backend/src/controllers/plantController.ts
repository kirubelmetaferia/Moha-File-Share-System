// src/controllers/plantController.ts
import { Request, Response, NextFunction } from 'express';
import { PlantService } from '../services/plantService';
import { createPlantSchema, updatePlantSchema } from '../validators/plantValidator';
import { successResponse, paginatedResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class PlantController {
    private plantService = new PlantService();

    constructor() {
        this.createPlant = this.createPlant.bind(this);
        this.getAllPlants = this.getAllPlants.bind(this);
        this.getPlantById = this.getPlantById.bind(this);
        this.updatePlant = this.updatePlant.bind(this);
        this.deletePlant = this.deletePlant.bind(this);
        this.getPlantStats = this.getPlantStats.bind(this);
        this.searchPlants = this.searchPlants.bind(this);
        this.getAccessiblePlants = this.getAccessiblePlants.bind(this);
    }

    async createPlant(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = createPlantSchema.parse(req.body);
            
            const plant = await this.plantService.createPlant({
                ...validated,
                createdBy: req.user!.id
            });

            logger.info(`Plant created: ${plant.id} by ${req.user?.employeeId}`);
            res.status(201).json(successResponse(plant, 'Plant created successfully'));
        } catch (error: any) {
            if (error.code === 'P2002') {
                return next(new AppError('A plant with this name or code already exists', 400));
            }
            next(error);
        }
    }

    async getAllPlants(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            // Build where clause based on user role
            let where = {};
            if (req.query.scope !== 'all') {
                if (req.user?.role === 'PLANT_ADMIN') {
                    where = { id: req.user.plantId };
                } else if (req.user?.role === 'DEPARTMENT_HEAD' || req.user?.role === 'EMPLOYEE' || req.user?.role === 'VIEWER') {
                    // Department heads and employees can only see their own plant
                    where = { id: req.user.plantId };
                }
            }

            const result = await this.plantService.getPlants(where, page, limit);

            res.json(paginatedResponse(result.items, result.total, page, limit));
        } catch (error) {
            next(error);
        }
    }

    async getPlantById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const plant = await this.plantService.getPlantById(id as string);

            res.json(successResponse(plant));
        } catch (error) {
            next(error);
        }
    }

    async updatePlant(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const validated = updatePlantSchema.parse(req.body);

            // Check if user has permission
            const hasAccess = await this.plantService.canManagePlant(req.user!.id, id as string);
            if (!hasAccess) {
                throw new AppError('You do not have permission to update this plant', 403);
            }

            const updated = await this.plantService.updatePlant(id as string, validated);

            logger.info(`Plant updated: ${id} by ${req.user?.employeeId}`);
            res.json(successResponse(updated, 'Plant updated successfully'));
        } catch (error: any) {
            if (error.code === 'P2002') {
                return next(new AppError('A plant with this name or code already exists', 400));
            }
            next(error);
        }
    }

    async deletePlant(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            // Check if user has permission
            const hasAccess = await this.plantService.canManagePlant(req.user!.id, id as string);
            if (!hasAccess) {
                throw new AppError('You do not have permission to delete this plant', 403);
            }

            await this.plantService.deletePlant(id as string);

            logger.warn(`Plant deleted: ${id} by ${req.user?.employeeId}`);
            res.json(successResponse(null, 'Plant deleted successfully'));
        } catch (error) {
            next(error);
        }
    }

    async getPlantStats(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const stats = await this.plantService.getPlantStats(id as string);

            res.json(successResponse(stats));
        } catch (error) {
            next(error);
        }
    }

    async searchPlants(req: Request, res: Response, next: NextFunction) {
        try {
            const query = req.query.q as string;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            if (!query) {
                throw new AppError('Search query is required', 400);
            }

            const result = await this.plantService.searchPlants(query, page, limit);

            res.json(paginatedResponse(result.items, result.total, page, limit));
        } catch (error) {
            next(error);
        }
    }

    async getAccessiblePlants(req: Request, res: Response, next: NextFunction) {
        try {
            const plants = await this.plantService.getAccessiblePlants(req.user!.id);

            res.json(successResponse(plants));
        } catch (error) {
            next(error);
        }
    }
}