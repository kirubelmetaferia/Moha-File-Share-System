import { Request, Response, NextFunction } from 'express';
import { SectionService } from '../services/sectionService';
import { DepartmentService } from '../services/departmentService';
import { createSectionSchema, updateSectionSchema } from '../validators/sectionValidator';
import { successResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class SectionController {
    private sectionService = new SectionService();
    private departmentService = new DepartmentService();

    constructor() {
        this.createSection = this.createSection.bind(this);
        this.getSections = this.getSections.bind(this);
        this.getSectionById = this.getSectionById.bind(this);
        this.updateSection = this.updateSection.bind(this);
        this.deleteSection = this.deleteSection.bind(this);
    }

    async createSection(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = createSectionSchema.parse(req.body);
            const { name, departmentId, description } = validated;

            const hasAccess = await this.departmentService.canManageDepartment(req.user!.id, departmentId);
            if (!hasAccess) {
                throw new AppError('You do not have permission to manage sections in this department', 403);
            }

            const section = await this.sectionService.createSection({ name, departmentId, description });
            res.status(201).json(successResponse(section, 'Section created successfully'));
        } catch (error: any) {
            if (error.code === 'P2002') {
                return next(new AppError('A section with this name already exists in the selected department', 400));
            }
            next(error);
        }
    }

    async getSections(req: Request, res: Response, next: NextFunction) {
        try {
            const { departmentId } = req.query;
            let where: any = { isActive: true };
            if (departmentId) where.departmentId = departmentId as string;
            
            const sections = await this.sectionService.getSections(where);
            res.json(successResponse(sections));
        } catch (error) {
            next(error);
        }
    }

    async getSectionById(req: Request, res: Response, next: NextFunction) {
        try {
            const section = await this.sectionService.getSectionById(String(req.params.id));
            if (!section) throw new AppError('Section not found', 404);
            res.json(successResponse(section));
        } catch (error) {
            next(error);
        }
    }

    async updateSection(req: Request, res: Response, next: NextFunction) {
        try {
            const section = await this.sectionService.getSectionById(String(req.params.id));
            if (!section) throw new AppError('Section not found', 404);

            const hasAccess = await this.departmentService.canManageDepartment(req.user!.id, section.departmentId);
            if (!hasAccess) {
                throw new AppError('You do not have permission to update this section', 403);
            }

            const updated = await this.sectionService.updateSection(String(req.params.id), updateSectionSchema.parse(req.body));
            res.json(successResponse(updated, 'Section updated successfully'));
        } catch (error: any) {
            if (error.code === 'P2002') {
                return next(new AppError('A section with this name already exists in the selected department', 400));
            }
            next(error);
        }
    }

    async deleteSection(req: Request, res: Response, next: NextFunction) {
        try {
            const section = await this.sectionService.getSectionById(String(req.params.id));
            if (!section) throw new AppError('Section not found', 404);

            const hasAccess = await this.departmentService.canManageDepartment(req.user!.id, section.departmentId);
            if (!hasAccess) {
                throw new AppError('You do not have permission to delete this section', 403);
            }

            await this.sectionService.deleteSection(String(req.params.id));
            res.json(successResponse(null, 'Section deleted successfully'));
        } catch (error) {
            next(error);
        }
    }
}
