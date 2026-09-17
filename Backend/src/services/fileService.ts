import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { permissionService } from './permissionService';

export class FileService {
    async uploadFile(data: {
        file: Express.Multer.File;
        uploadedBy: string;
        plantId?: string;
        departmentId?: string;
        sectionId?: string;
        folderId?: string;
        description?: string;
        category?: string;
    }) {
        const fileHash = await this.calculateFileHash(data.file.path);
        
        // Check if file with same original name exists in the same location
        const existingFile = await prisma.file.findFirst({
            where: {
                originalName: data.file.originalname,
                folderId: data.folderId || null,
                sectionId: data.sectionId || null,
                departmentId: data.departmentId || null,
                plantId: data.plantId || null,
                isDeleted: false
            }
        });

        if (existingFile) {
            // Version bump
            await prisma.fileVersion.create({
                data: {
                    fileId: existingFile.id,
                    versionNumber: existingFile.version,
                    filePath: existingFile.filePath,
                    fileSize: existingFile.fileSize,
                    originalName: existingFile.originalName,
                    fileHash: existingFile.fileHash,
                    uploadedById: existingFile.uploadedById
                }
            });
            
            return prisma.file.update({
                where: { id: existingFile.id },
                data: {
                    fileName: data.file.filename,
                    fileSize: data.file.size,
                    fileType: path.extname(data.file.originalname).slice(1),
                    mimeType: data.file.mimetype,
                    filePath: data.file.filename,
                    fileHash: fileHash,
                    version: existingFile.version + 1,
                    uploadedById: data.uploadedBy,
                    description: data.description || existingFile.description,
                    category: data.category as any || existingFile.category,
                    updatedAt: new Date()
                }
            });
        }

        const file = await prisma.file.create({
            data: {
                fileName: data.file.filename,
                originalName: data.file.originalname,
                fileSize: data.file.size,
                fileType: path.extname(data.file.originalname).slice(1),
                mimeType: data.file.mimetype,
                filePath: data.file.filename,
                fileHash: fileHash,
                plantId: data.plantId,
                departmentId: data.departmentId,
                sectionId: data.sectionId,
                folderId: data.folderId,
                uploadedById: data.uploadedBy,
                description: data.description,
                category: data.category as any || 'OTHER'
            }
        });

        return file;
    }

    async uploadFileVersion(fileId: string, fileData: Express.Multer.File, userId: string) {
        const existingFile = await prisma.file.findUnique({
            where: { id: fileId }
        });

        if (!existingFile) {
            throw new AppError('File not found', 404);
        }

        const fileHash = await this.calculateFileHash(fileData.path);

        // Backup current version
        await prisma.fileVersion.create({
            data: {
                fileId: existingFile.id,
                versionNumber: existingFile.version,
                filePath: existingFile.filePath,
                fileSize: existingFile.fileSize,
                originalName: existingFile.originalName,
                fileHash: existingFile.fileHash,
                uploadedById: existingFile.uploadedById
            }
        });

        // Update file to new version
        return prisma.file.update({
            where: { id: existingFile.id },
            data: {
                fileName: fileData.filename,
                originalName: fileData.originalname,
                fileSize: fileData.size,
                fileType: path.extname(fileData.originalname).slice(1),
                mimeType: fileData.mimetype,
                filePath: fileData.filename,
                fileHash: fileHash,
                version: existingFile.version + 1,
                uploadedById: userId,
                updatedAt: new Date()
            }
        });
    }

    async getFiles(where: any, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.file.findMany({
                where,
                skip,
                take: limit,
                include: {
                    uploadedBy: {
                        select: { id: true, fullName: true, employeeId: true }
                    },
                    plant: { select: { id: true, name: true } },
                    department: { select: { id: true, name: true } },
                    section: { select: { id: true, name: true } },
                    folder: { select: { id: true, name: true } },
                    shares: {
                        where: { isActive: true },
                        select: { id: true, permission: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.file.count({ where })
        ]);

        return { items, total };
    }

    async getFileById(id: string) {
        return prisma.file.findUnique({
            where: { id },
            include: {
                uploadedBy: { select: { id: true, fullName: true, employeeId: true, email: true } },
                plant: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
                folder: { select: { id: true, name: true } },
                shares: {
                    where: { isActive: true },
                    include: {
                        sharedWithUser: { select: { id: true, fullName: true, employeeId: true } },
                        sharedWithPlant: { select: { id: true, name: true } },
                        sharedWithDept: { select: { id: true, name: true } }
                    }
                },
                versions: {
                    orderBy: { versionNumber: 'desc' },
                    include: { uploadedBy: { select: { id: true, fullName: true } } }
                },
                accessLogs: {
                    take: 10,
                    orderBy: { accessedAt: 'desc' },
                    include: { user: { select: { id: true, fullName: true } } }
                }
            }
        });
    }

    async getFileVersions(fileId: string) {
        return prisma.fileVersion.findMany({
            where: { fileId },
            orderBy: { versionNumber: 'desc' },
            include: { uploadedBy: { select: { id: true, fullName: true, employeeId: true } } }
        });
    }

    async getFileVersionById(versionId: string) {
        return prisma.fileVersion.findUnique({
            where: { id: versionId }
        });
    }

    async restoreFileVersion(fileId: string, versionId: string, userId: string) {
        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) throw new AppError('File not found', 404);

        const version = await prisma.fileVersion.findUnique({ where: { id: versionId } });
        if (!version) throw new AppError('Version not found', 404);
        if (version.fileId !== fileId) throw new AppError('Version mismatch', 400);

        // Create new version backup from current state
        await prisma.fileVersion.create({
            data: {
                fileId: file.id,
                versionNumber: file.version,
                filePath: file.filePath,
                fileSize: file.fileSize,
                originalName: file.originalName,
                fileHash: file.fileHash,
                uploadedById: file.uploadedById
            }
        });

        // Restore file data from version, but increment version number
        return prisma.file.update({
            where: { id: fileId },
            data: {
                fileName: path.basename(version.filePath), 
                originalName: version.originalName,
                fileSize: version.fileSize,
                filePath: version.filePath,
                fileHash: version.fileHash,
                version: file.version + 1,
                uploadedById: userId,
                updatedAt: new Date()
            }
        });
    }

    async updateFile(id: string, data: any) {
        const updateData: any = { ...data };
        if (data.category) {
            updateData.category = data.category as any;
        }
        return prisma.file.update({
            where: { id },
            data: updateData
        });
    }

    async deleteFile(id: string) {
        return prisma.file.update({
            where: { id },
            data: { 
                isDeleted: true, 
                isActive: false,
                deletedAt: new Date()
            }
        });
    }

    async getDeletedFiles(where: any, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.file.findMany({
                where: { ...where, isDeleted: true },
                skip,
                take: limit,
                include: {
                    uploadedBy: { select: { id: true, fullName: true, employeeId: true } },
                    plant: { select: { id: true, name: true } },
                    department: { select: { id: true, name: true } },
                    section: { select: { id: true, name: true } },
                    folder: { select: { id: true, name: true } }
                },
                orderBy: { deletedAt: 'desc' }
            }),
            prisma.file.count({ where: { ...where, isDeleted: true } })
        ]);

        return { items, total };
    }

    async restoreFile(id: string) {
        const file = await prisma.file.findUnique({
            where: { id },
            include: { folder: true }
        });

        if (!file) {
            throw new AppError('File not found', 404);
        }

        const data: any = { 
            isDeleted: false, 
            isActive: true,
            deletedAt: null
        };

        // If the file's parent folder is also deleted, move the file to the root to prevent it from being orphaned/invisible
        if (file.folder && file.folder.isDeleted) {
            data.folderId = null;
        }

        return prisma.file.update({
            where: { id },
            data
        });
    }

    async hardDeleteFile(id: string) {
        return prisma.file.delete({
            where: { id }
        });
    }

    async moveFile(id: string, newFolderId: string | null) {
        return prisma.file.update({
            where: { id },
            data: { folderId: newFolderId }
        });
    }

    async copyFile(id: string, newFolderId: string | null, userId: string) {
        const file = await prisma.file.findUnique({ where: { id } });
        if (!file) throw new AppError('File not found', 404);

        let newFilePath = file.filePath;
        const oldAbsPath = path.join(process.cwd(), 'uploads', file.filePath);
        
        if (fs.existsSync(oldAbsPath)) {
            const ext = path.extname(file.filePath);
            newFilePath = crypto.randomBytes(16).toString('hex') + ext;
            const newAbsPath = path.join(process.cwd(), 'uploads', newFilePath);
            fs.copyFileSync(oldAbsPath, newAbsPath);
        }

        return prisma.file.create({
            data: {
                fileName: `Copy of ${file.fileName}`,
                originalName: `Copy of ${file.originalName}`,
                fileSize: file.fileSize,
                fileType: file.fileType,
                mimeType: file.mimeType,
                filePath: newFilePath,
                fileHash: file.fileHash,
                plantId: file.plantId,
                departmentId: file.departmentId,
                sectionId: file.sectionId,
                folderId: newFolderId,
                uploadedById: userId,
                description: file.description,
                category: file.category
            }
        });
    }

    async resolveEffectivePermission(userId: string, fileId: string): Promise<string> {
        const perm = await permissionService.getEffectivePermission(userId, fileId, 'FILE');
        return perm || 'NONE';
    }

    async canAccessFile(userId: string, fileId: string): Promise<boolean> {
        return permissionService.hasPermission(userId, fileId, 'FILE', 'VIEW');
    }

    async canDownloadFile(userId: string, fileId: string): Promise<boolean> {
        return permissionService.hasPermission(userId, fileId, 'FILE', 'DOWNLOAD');
    }

    async canManageFile(userId: string, fileId: string): Promise<boolean> {
        return permissionService.hasPermission(userId, fileId, 'FILE', 'MODIFY');
    }

    async canManagePlant(userId: string, plantId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true }
        });
        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'PLANT_ADMIN' && user.plantId === plantId) return true;
        return false;
    }

    private async calculateFileHash(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            stream.on('data', data => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }

    async getFileAccessLogs(fileId: string) {
        return prisma.fileAccessLog.findMany({
            where: { fileId },
            include: {
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        employeeId: true,
                        profileImage: true
                    }
                }
            },
            orderBy: { accessedAt: 'desc' }
        });
    }
}