import { Request, Response, NextFunction } from 'express';
import { FolderService } from '../services/folderService';
import { successResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { permissionService } from '../services/permissionService';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
export class FolderController {
    private folderService = new FolderService();

    constructor() {
        this.createFolder = this.createFolder.bind(this);
        this.getFolders = this.getFolders.bind(this);
        this.getFolderById = this.getFolderById.bind(this);
        this.updateFolder = this.updateFolder.bind(this);
        this.deleteFolder = this.deleteFolder.bind(this);
    }

    async createFolder(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description, plantId, departmentId, sectionId, parentFolderId } = req.body;
            if (!name) {
                throw new AppError('Name is required', 400);
            }
            if (parentFolderId) {
                const canUpload = await permissionService.hasPermission(req.user!.id, parentFolderId, 'FOLDER', 'UPLOAD');
                if (!canUpload) {
                    throw new AppError('You do not have permission to create folders in this location', 403);
                }
            }

            const folder = await this.folderService.createFolder({
                name, description, plantId, departmentId, sectionId, parentFolderId, createdById: req.user!.id
            });

            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'CREATE',
                    resourceType: 'FOLDER',
                    resourceId: folder.id,
                    details: { name: folder.name }
                }
            }).catch(err => logger.error('Audit log failed:', err));

            res.status(201).json(successResponse(folder, 'Folder created successfully'));
        } catch (error) {
            next(error);
        }
    }

    async getFolders(req: Request, res: Response, next: NextFunction) {
        try {
            const { plantId, departmentId, sectionId, parentFolderId } = req.query;
            let where: any = {};
            if (plantId) where.plantId = plantId;
            if (departmentId) where.departmentId = departmentId;
            if (sectionId) where.sectionId = sectionId;
            
            // If parentFolderId is explicitly passed as null or undefined string, handle it
            if (parentFolderId === 'null') {
                where.parentFolderId = null;
            } else if (parentFolderId) {
                where.parentFolderId = parentFolderId;
            }

            const shareConditions: any[] = [
                { sharedWithUserId: req.user?.id },
            ];
            if (req.user?.departmentId) {
                shareConditions.push({ sharedWithDeptId: req.user.departmentId });
            }
            if (req.user?.plantId) {
                shareConditions.push({ sharedWithPlantId: req.user.plantId });
            }
            if (req.user?.sectionId) {
                shareConditions.push({ sharedWithSectionId: req.user.sectionId });
            }

            const shareFilter = {
                shares: {
                    some: {
                        isActive: true,
                        OR: shareConditions,
                    },
                },
            };

            if (req.user?.role === 'PLANT_ADMIN') {
                where.OR = [
                    { plantId: req.user.plantId },
                    shareFilter,
                ];
            } else if (req.user?.role === 'DEPARTMENT_HEAD') {
                where.OR = [
                    { departmentId: req.user.departmentId },
                    shareFilter,
                ];
            } else if (req.user?.role === 'EMPLOYEE' || req.user?.role === 'VIEWER') {
                where.OR = [
                    { createdById: req.user.id },
                    shareFilter,
                ];
            }
            
            const folders = await this.folderService.getFolders(where);

            const foldersWithPerms = await Promise.all(
                folders.map(async (folder) => {
                    const effectivePermission = await permissionService.getEffectivePermission(req.user!.id, folder.id, 'FOLDER');
                    return { ...folder, effectivePermission: effectivePermission || 'NONE' };
                })
            );

            res.json(successResponse(foldersWithPerms));
        } catch (error) {
            next(error);
        }
    }

    async getFolderById(req: Request, res: Response, next: NextFunction) {
        try {
            const folder = await this.folderService.getFolderById(req.params.id as string);
            if (!folder) throw new AppError('Folder not found', 404);
            res.json(successResponse(folder));
        } catch (error) {
            next(error);
        }
    }

    async updateFolder(req: Request, res: Response, next: NextFunction) {
        try {
            const folder = await this.folderService.updateFolder(req.params.id as string, req.body);
            
            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'UPDATE',
                    resourceType: 'FOLDER',
                    resourceId: folder.id,
                    details: { name: folder.name }
                }
            }).catch(err => logger.error('Audit log failed:', err));

            res.json(successResponse(folder, 'Folder updated successfully'));
        } catch (error) {
            next(error);
        }
    }

    async deleteFolder(req: Request, res: Response, next: NextFunction) {
        try {
            await this.folderService.deleteFolder(req.params.id as string);
            
            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'DELETE',
                    resourceType: 'FOLDER',
                    resourceId: req.params.id as string,
                    details: { folderId: req.params.id as string }
                }
            }).catch(err => logger.error('Audit log failed:', err));

            res.json(successResponse(null, 'Folder deleted successfully'));
        } catch (error) {
            next(error);
        }
    }
}
