// src/controllers/fileController.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { fileUploadSchema, fileUpdateSchema } from '../validators/fileValidator';
import { successResponse, paginatedResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { FileService } from '../services/fileService';
import { permissionService } from '../services/permissionService';
import path from 'path';
import fs from 'fs';

export class FileController {
    private fileService = new FileService();

    constructor() {
        this.uploadFile = this.uploadFile.bind(this);
        this.getAllFiles = this.getAllFiles.bind(this);
        this.getFileById = this.getFileById.bind(this);
        this.downloadFile = this.downloadFile.bind(this);
        this.previewFile = this.previewFile.bind(this);
        this.updateFile = this.updateFile.bind(this);
        this.deleteFile = this.deleteFile.bind(this);
        this.getFileVersions = this.getFileVersions.bind(this);
        this.uploadFileVersion = this.uploadFileVersion.bind(this);
        this.restoreFileVersion = this.restoreFileVersion.bind(this);
        this.getRecycleBin = this.getRecycleBin.bind(this);
        this.restoreFile = this.restoreFile.bind(this);
        this.hardDeleteFile = this.hardDeleteFile.bind(this);
        this.moveFile = this.moveFile.bind(this);
        this.copyFile = this.copyFile.bind(this);
        this.getFileAccessLogs = this.getFileAccessLogs.bind(this);
    }

    async uploadFile(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                throw new AppError('No file uploaded', 400);
            }

            const validated = fileUploadSchema.parse(req.body);
            


            if (validated.departmentId) {
                const department = await prisma.department.findUnique({
                    where: { id: validated.departmentId }
                });
                
                if (department && department.plantId !== validated.plantId) {
                    throw new AppError('Department does not belong to the specified plant', 400);
                }
            }

            if (validated.folderId) {
                const canUpload = await permissionService.hasPermission(req.user!.id, validated.folderId, 'FOLDER', 'UPLOAD');
                if (!canUpload) {
                    throw new AppError('You do not have permission to upload to this folder', 403);
                }
            }

            const file = await this.fileService.uploadFile({
                file: req.file,
                uploadedBy: req.user!.id,
                plantId: validated.plantId,
                departmentId: validated.departmentId,
                folderId: validated.folderId,
                description: validated.description,
                category: validated.category
            });

            // Fire-and-forget: don't let a failed audit log break the upload
            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'UPLOAD',
                    resourceType: 'FILE',
                    resourceId: file.id,
                    details: {
                        fileName: file.fileName,
                        fileSize: file.fileSize
                    }
                }
            }).catch(err => logger.error('Audit log failed on upload:', err));

            logger.info(`File uploaded: ${file.fileName} (${file.id}) by ${req.user?.employeeId}`);
            res.status(201).json(successResponse(file, 'File uploaded successfully'));
        } catch (error) {
            next(error);
        }
    }

    async getAllFiles(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const plantId = req.query.plantId as string;
            const departmentId = req.query.departmentId as string;
            const category = req.query.category as string;
            const folderId = req.query.folderId as string;
            
            let where: any = { 
                isDeleted: false,
                isActive: true 
            };
            
            if (plantId) where.plantId = plantId;
            if (departmentId) where.departmentId = departmentId;
            if (category) where.category = category;
            
            // Allow looking for root files when folderId is explicitly null
            if (folderId === 'null') {
                where.folderId = null;
            } else if (folderId) {
                where.folderId = folderId;
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

            const folderShareFilter = {
                folder: {
                    shares: {
                        some: {
                            isActive: true,
                            OR: shareConditions,
                        },
                    },
                },
            };

            if (req.user?.role === 'PLANT_ADMIN') {
                where.OR = [
                    { plantId: req.user.plantId },
                    shareFilter,
                    folderShareFilter,
                ];
            } else if (req.user?.role === 'DEPARTMENT_HEAD') {
                where.OR = [
                    { departmentId: req.user.departmentId },
                    shareFilter,
                    folderShareFilter,
                ];
            } else if (req.user?.role === 'EMPLOYEE' || req.user?.role === 'VIEWER') {
                where.OR = [
                    { uploadedById: req.user.id },
                    shareFilter,
                    folderShareFilter,
                ];
            }

            if (req.query.search) {
                const search = req.query.search as string;
                where.fileName = { contains: search };
            }

            const result = await this.fileService.getFiles(where, page, limit);

            const itemsWithPerms = await Promise.all(
                result.items.map(async (file) => {
                    const effectivePermission = await permissionService.getEffectivePermission(req.user!.id, file.id, 'FILE');
                    return { ...file, effectivePermission: effectivePermission || 'NONE' };
                })
            );

            res.json(paginatedResponse(itemsWithPerms, result.total, page, limit));
        } catch (error) {
            next(error);
        }
    }

    async getFileById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const file = await this.fileService.getFileById(id as string);
            
            if (!file) {
                throw new AppError('File not found', 404);
            }

            const hasAccess = await this.fileService.canAccessFile(req.user!.id, file.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to view this file', 403);
            }

            res.json(successResponse(file));
        } catch (error) {
            next(error);
        }
    }

    async downloadFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const file = await this.fileService.getFileById(id as string);
            
            if (!file) {
                throw new AppError('File not found', 404);
            }

            const hasAccess = await this.fileService.canDownloadFile(req.user!.id, file.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to download this file', 403);
            }

            // Prevent path traversal
            const safeFilePath = path.basename(file.filePath);
            const absoluteFilePath = path.resolve(process.cwd(), 'uploads', safeFilePath);
            
            if (!absoluteFilePath.startsWith(path.resolve(process.cwd(), 'uploads'))) {
                throw new AppError('Invalid file path', 403);
            }

            if (!fs.existsSync(absoluteFilePath)) {
                throw new AppError('File not found on server', 404);
            }

            await prisma.fileAccessLog.create({
                data: {
                    fileId: file.id,
                    userId: req.user!.id,
                    action: 'DOWNLOAD',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            logger.info(`File downloaded: ${file.fileName} (${file.id}) by ${req.user?.employeeId}`);
            res.download(absoluteFilePath, file.originalName);
        } catch (error) {
            next(error);
        }
    }

    async getFileVersions(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) throw new AppError('File not found', 404);

            const hasAccess = await this.fileService.canAccessFile(req.user!.id, file.id);
            if (!hasAccess) throw new AppError('You do not have permission to view this file', 403);

            const versions = await this.fileService.getFileVersions(id as string);
            res.json(successResponse(versions));
        } catch (error) {
            next(error);
        }
    }

    async uploadFileVersion(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            if (!req.file) {
                throw new AppError('No file uploaded', 400);
            }

            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) {
                throw new AppError('File not found', 404);
            }

            const hasAccess = await this.fileService.canManageFile(req.user!.id, file.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to upload a new version for this file', 403);
            }

            const updatedFile = await this.fileService.uploadFileVersion(id as string, req.file, req.user!.id);

            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'UPLOAD_VERSION',
                    resourceType: 'FILE',
                    resourceId: file.id,
                    details: {
                        fileName: updatedFile.fileName,
                        newVersion: updatedFile.version
                    }
                }
            }).catch(err => logger.error('Audit log failed on version upload:', err));

            logger.info(`File version uploaded: ${updatedFile.fileName} (${updatedFile.id}) by ${req.user?.employeeId}`);
            res.status(201).json(successResponse(updatedFile, 'New version uploaded successfully'));
        } catch (error) {
            next(error);
        }
    }

    async restoreFileVersion(req: Request, res: Response, next: NextFunction) {
        try {
            const { id, versionId } = req.params;
            
            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) throw new AppError('File not found', 404);

            const hasAccess = await this.fileService.canManageFile(req.user!.id, file.id);
            if (!hasAccess) throw new AppError('You do not have permission to restore versions for this file', 403);

            const updatedFile = await this.fileService.restoreFileVersion(id as string, versionId as string, req.user!.id);
            
            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'RESTORE_VERSION',
                    resourceType: 'FILE',
                    resourceId: file.id,
                    details: { versionRestored: versionId }
                }
            }).catch(err => logger.error('Audit log failed on version restore:', err));

            logger.info(`File version restored: ${file.fileName} (${file.id}) by ${req.user?.employeeId}`);
            res.json(successResponse(updatedFile, 'File version restored successfully'));
        } catch (error) {
            next(error);
        }
    }

    async previewFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const file = await this.fileService.getFileById(id as string);
            
            if (!file) {
                throw new AppError('File not found', 404);
            }

            const hasAccess = await this.fileService.canAccessFile(req.user!.id, file.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to view this file', 403);
            }

            // Prevent path traversal
            const safeFilePath = path.basename(file.filePath);
            const absoluteFilePath = path.resolve(process.cwd(), 'uploads', safeFilePath);
            
            if (!absoluteFilePath.startsWith(path.resolve(process.cwd(), 'uploads'))) {
                throw new AppError('Invalid file path', 403);
            }

            if (!fs.existsSync(absoluteFilePath)) {
                throw new AppError('File not found on server', 404);
            }

            await prisma.fileAccessLog.create({
                data: {
                    fileId: file.id,
                    userId: req.user!.id,
                    action: 'VIEW',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });

            logger.info(`File previewed: ${file.fileName} (${file.id}) by ${req.user?.employeeId}`);
            res.sendFile(absoluteFilePath);
        } catch (error) {
            next(error);
        }
    }

    async updateFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const validated = fileUpdateSchema.parse(req.body);

            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) {
                throw new AppError('File not found', 404);
            }

            const hasAccess = await this.fileService.canManageFile(req.user!.id, file.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to update this file', 403);
            }

            const updated = await this.fileService.updateFile(id as string, validated);

            logger.info(`File updated: ${id} by ${req.user?.employeeId}`);
            res.json(successResponse(updated, 'File updated successfully'));
        } catch (error) {
            next(error);
        }
    }

    async deleteFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) {
                throw new AppError('File not found', 404);
            }

            const hasAccess = await this.fileService.canManageFile(req.user!.id, file.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to delete this file', 403);
            }

            // We only soft-delete here. The physical file remains on disk.
            await this.fileService.deleteFile(id as string);

            // Fire-and-forget: don't let a failed audit log block the response
            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'DELETE',
                    resourceType: 'FILE',
                    resourceId: file.id,
                    details: {
                        fileName: file.fileName,
                        reason: 'File deleted'
                    }
                }
            }).catch(err => logger.error('Audit log failed on delete:', err));

            logger.warn(`File deleted: ${file.fileName} (${id}) by ${req.user?.employeeId}`);
            res.json(successResponse(null, 'File deleted successfully'));
        } catch (error) {
            next(error);
        }
    }

    async getRecycleBin(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const plantId = req.query.plantId as string;
            const departmentId = req.query.departmentId as string;
            
            let where: any = {};
            if (plantId) where.plantId = plantId;
            if (departmentId) where.departmentId = departmentId;
            
            if (req.user?.role === 'PLANT_ADMIN') {
                where.OR = [
                    { plantId: req.user.plantId }
                ];
            } else if (req.user?.role === 'DEPARTMENT_HEAD') {
                where.OR = [
                    { departmentId: req.user.departmentId }
                ];
            } else if (req.user?.role === 'EMPLOYEE' || req.user?.role === 'VIEWER') {
                where.OR = [
                    { uploadedById: req.user.id }
                ];
            }

            const result = await this.fileService.getDeletedFiles(where, page, limit);
            res.json(paginatedResponse(result.items, result.total, page, limit));
        } catch (error) {
            next(error);
        }
    }

    async restoreFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) throw new AppError('File not found', 404);

            const hasAccess = await this.fileService.canManageFile(req.user!.id, file.id);
            if (!hasAccess) throw new AppError('You do not have permission to restore this file', 403);

            const restoredFile = await this.fileService.restoreFile(id as string);
            
            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'RESTORE',
                    resourceType: 'FILE',
                    resourceId: file.id,
                    details: { fileName: file.fileName }
                }
            }).catch(err => logger.error('Audit log failed on restore:', err));

            logger.info(`File restored: ${file.fileName} (${file.id}) by ${req.user?.employeeId}`);
            res.json(successResponse(restoredFile, 'File restored successfully'));
        } catch (error) {
            next(error);
        }
    }

    async hardDeleteFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) throw new AppError('File not found', 404);

            const hasAccess = await this.fileService.canManageFile(req.user!.id, file.id);
            if (!hasAccess) throw new AppError('You do not have permission to permanently delete this file', 403);
            
            if (req.user!.role !== 'SUPER_ADMIN' && file.uploadedById !== req.user!.id) {
                 throw new AppError('Only the uploader or super admin can permanently delete files', 403);
            }

            const filePath = path.join(process.cwd(), 'uploads', file.filePath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            await this.fileService.hardDeleteFile(id as string);

            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'HARD_DELETE',
                    resourceType: 'FILE',
                    resourceId: file.id,
                    details: { fileName: file.fileName }
                }
            }).catch(err => logger.error('Audit log failed on hard delete:', err));

            logger.warn(`File permanently deleted: ${file.fileName} (${id}) by ${req.user?.employeeId}`);
            res.json(successResponse(null, 'File permanently deleted'));
        } catch (error) {
            next(error);
        }
    }

    async moveFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { newFolderId } = req.body;

            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) throw new AppError('File not found', 404);

            const hasAccess = await this.fileService.canManageFile(req.user!.id, file.id);
            if (!hasAccess) throw new AppError('You do not have permission to move this file', 403);

            if (newFolderId) {
                // To move into a folder, user needs UPLOAD permission on that folder
                const canUploadToNewFolder = await permissionService.hasPermission(req.user!.id, newFolderId, 'FOLDER', 'UPLOAD');
                if (!canUploadToNewFolder) {
                     throw new AppError('You do not have permission to add files to the destination folder', 403);
                }
            }

            const movedFile = await this.fileService.moveFile(id as string, newFolderId || null);

            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'MOVE',
                    resourceType: 'FILE',
                    resourceId: file.id,
                    details: { fileName: file.fileName, newFolderId }
                }
            }).catch(err => logger.error('Audit log failed on move:', err));

            logger.info(`File moved: ${file.fileName} (${id}) to folder ${newFolderId} by ${req.user?.employeeId}`);
            res.json(successResponse(movedFile, 'File moved successfully'));
        } catch (error) {
            next(error);
        }
    }

    async copyFile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { newFolderId } = req.body;

            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) throw new AppError('File not found', 404);

            const hasAccess = await this.fileService.canDownloadFile(req.user!.id, file.id);
            if (!hasAccess) throw new AppError('You do not have permission to copy this file', 403);

            if (newFolderId) {
                const canUploadToNewFolder = await permissionService.hasPermission(req.user!.id, newFolderId, 'FOLDER', 'UPLOAD');
                if (!canUploadToNewFolder) {
                     throw new AppError('You do not have permission to add files to the destination folder', 403);
                }
            }

            const copiedFile = await this.fileService.copyFile(id as string, newFolderId || null, req.user!.id);

            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'COPY',
                    resourceType: 'FILE',
                    resourceId: copiedFile.id,
                    details: { originalFileId: file.id, newFolderId }
                }
            }).catch(err => logger.error('Audit log failed on copy:', err));

            logger.info(`File copied: ${file.fileName} (${id}) to folder ${newFolderId} by ${req.user?.employeeId}`);
            res.json(successResponse(copiedFile, 'File copied successfully'));
        } catch (error) {
            next(error);
        }
    }

    async getFileAccessLogs(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const file = await prisma.file.findUnique({ where: { id: id as string } });
            if (!file) throw new AppError('File not found', 404);

            // Access logs check relies on route-level permission (UPLOAD), 
            // but we can also add a secondary check here if needed.
            
            const logs = await this.fileService.getFileAccessLogs(id as string);
            res.json(successResponse(logs));
        } catch (error) {
            next(error);
        }
    }
}