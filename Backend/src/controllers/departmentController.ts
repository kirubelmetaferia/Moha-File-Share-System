// src/controllers/departmentController.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createDepartmentSchema, updateDepartmentSchema } from '../validators/departmentValidator';
import { successResponse, paginatedResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { DepartmentService } from '../services/departmentService';

export class DepartmentController {
    private departmentService = new DepartmentService();

    constructor() {
        this.createDepartment = this.createDepartment.bind(this);
        this.getAllDepartments = this.getAllDepartments.bind(this);
        this.getDepartmentById = this.getDepartmentById.bind(this);
        this.updateDepartment = this.updateDepartment.bind(this);
        this.deleteDepartment = this.deleteDepartment.bind(this);
    }

    async createDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = createDepartmentSchema.parse(req.body);
            
            const hasAccess = await this.departmentService.canManagePlant(
                req.user!.id, 
                validated.plantId
            );
            
            if (!hasAccess) {
                throw new AppError('You do not have permission to create departments in this plant', 403);
            }

            const department = await this.departmentService.createDepartment({
                ...validated,
                createdBy: req.user!.id
            });

            logger.info(`Department created: ${department.id} in plant ${department.plantId} by ${req.user?.employeeId}`);
            res.status(201).json(successResponse(department, 'Department created successfully'));
        } catch (error: any) {
            if (error.code === 'P2002') {
                return next(new AppError('A department with this name already exists in the selected plant', 400));
            }
            next(error);
        }
    }

    async getAllDepartments(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const plantId = req.query.plantId as string;
            
            let where: any = { isActive: true };
            
            if (plantId) {
                where.plantId = plantId;
            }
            
            if (req.query.scope !== 'all') {
                if (req.user?.role === 'PLANT_ADMIN') {
                    where.plantId = req.user.plantId;
                }
                
                if (req.user?.role === 'DEPARTMENT_HEAD') {
                    where.id = req.user.departmentId;
                }
            }

            const result = await this.departmentService.getDepartments(where, page, limit);

            res.json(paginatedResponse(result.items, result.total, page, limit));
        } catch (error) {
            next(error);
        }
    }

    async getDepartmentById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const department = await this.departmentService.getDepartmentById(id as string);
            
            if (!department) {
                throw new AppError('Department not found', 404);
            }

            res.json(successResponse(department));
        } catch (error) {
            next(error);
        }
    }

    async updateDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const validated = updateDepartmentSchema.parse(req.body);

            const department = await prisma.department.findUnique({ 
                where: { id: id as string },
                include: { plant: true }
            });
            
            if (!department) {
                throw new AppError('Department not found', 404);
            }

            const hasAccess = await this.departmentService.canManageDepartment(
                req.user!.id, 
                department.plantId
            );
            
            if (!hasAccess) {
                throw new AppError('You do not have permission to update this department', 403);
            }

            const updated = await this.departmentService.updateDepartment(id as string, validated);

            logger.info(`Department updated: ${id} by ${req.user?.employeeId}`);
            res.json(successResponse(updated, 'Department updated successfully'));
        } catch (error: any) {
            if (error.code === 'P2002') {
                return next(new AppError('A department with this name already exists in the selected plant', 400));
            }
            next(error);
        }
    }

    async deleteDepartment(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const department = await prisma.department.findUnique({ 
                where: { id: id as string },
                include: { plant: true }
            });
            
            if (!department) {
                throw new AppError('Department not found', 404);
            }

            const hasAccess = await this.departmentService.canManageDepartment(
                req.user!.id, 
                department.plantId
            );
            
            if (!hasAccess) {
                throw new AppError('You do not have permission to delete this department', 403);
            }

            await this.departmentService.deleteDepartment(id as string);

            logger.warn(`Department deleted: ${id} by ${req.user?.employeeId}`);
            res.json(successResponse(null, 'Department deleted successfully'));
        } catch (error) {
            next(error);
        }
    }
}