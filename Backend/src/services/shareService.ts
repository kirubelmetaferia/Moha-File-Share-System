import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { permissionService } from './permissionService';

export class ShareService {
    async createShares(data: {
        fileId?: string;
        folderId?: string;
        sharedBy: string;
        targets: { type: 'USER' | 'PLANT' | 'DEPARTMENT' | 'SECTION', id: string }[];
        permission?: string;
        expiresAt?: string;
    }) {
        if (!data.fileId && !data.folderId) {
            throw new AppError('Either fileId or folderId must be provided', 400);
        }

        // Verify the file or folder exists
        let resourceName = '';
        if (data.fileId) {
            const file = await prisma.file.findUnique({ where: { id: data.fileId } });
            if (!file) throw new AppError('File not found', 404);
            resourceName = file.fileName;
        } else if (data.folderId) {
            const folder = await prisma.folder.findUnique({ where: { id: data.folderId } });
            if (!folder) throw new AppError('Folder not found', 404);
            resourceName = folder.name;
        }

        const createdShares = [];

        for (const target of data.targets) {
            // Check if a share already exists for this specific target
            const existingShare = await prisma.fileShare.findFirst({
                where: {
                    fileId: data.fileId || null,
                    folderId: data.folderId || null,
                    sharedWithUserId: target.type === 'USER' ? target.id : undefined,
                    sharedWithPlantId: target.type === 'PLANT' ? target.id : undefined,
                    sharedWithDeptId: target.type === 'DEPARTMENT' ? target.id : undefined,
                    sharedWithSectionId: target.type === 'SECTION' ? target.id : undefined,
                    isActive: true
                }
            });

            if (!existingShare) {
                const share = await prisma.fileShare.create({
                    data: {
                        fileId: data.fileId || null,
                        folderId: data.folderId || null,
                        sharedBy: data.sharedBy,
                        sharedWithUserId: target.type === 'USER' ? target.id : undefined,
                        sharedWithPlantId: target.type === 'PLANT' ? target.id : undefined,
                        sharedWithDeptId: target.type === 'DEPARTMENT' ? target.id : undefined,
                        sharedWithSectionId: target.type === 'SECTION' ? target.id : undefined,
                        permission: data.permission as any || 'VIEW',
                        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
                    },
                    include: {
                        file: { select: { id: true, fileName: true, originalName: true } },
                        folder: { select: { id: true, name: true } },
                        sharedWithUser: { select: { id: true, fullName: true, email: true } },
                        sharedWithPlant: { select: { id: true, name: true, code: true } },
                        sharedWithDept: { select: { id: true, name: true, code: true } },
                        sharedWithSection: { select: { id: true, name: true } }
                    }
                });
                createdShares.push(share);
            } else if (existingShare.permission !== (data.permission || 'VIEW')) {
                const updatedShare = await prisma.fileShare.update({
                    where: { id: existingShare.id },
                    data: {
                        permission: data.permission as any || 'VIEW',
                        expiresAt: data.expiresAt ? new Date(data.expiresAt) : existingShare.expiresAt
                    },
                    include: {
                        file: { select: { id: true, fileName: true, originalName: true } },
                        folder: { select: { id: true, name: true } },
                        sharedWithUser: { select: { id: true, fullName: true, email: true } },
                        sharedWithPlant: { select: { id: true, name: true, code: true } },
                        sharedWithDept: { select: { id: true, name: true, code: true } },
                        sharedWithSection: { select: { id: true, name: true } }
                    }
                });
                createdShares.push(updatedShare);
            }
        }

        return createdShares;
    }

    async getShares(where: any, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.fileShare.findMany({
                where,
                skip,
                take: limit,
                include: {
                    file: {
                        select: {
                            id: true,
                            fileName: true,
                            originalName: true,
                            fileSize: true,
                            uploadedBy: {
                                select: {
                                    fullName: true,
                                    employeeId: true
                                }
                            }
                        }
                    },
                    folder: {
                        select: {
                            id: true,
                            name: true,
                            createdBy: {
                                select: {
                                    fullName: true,
                                    employeeId: true
                                }
                            }
                        }
                    },
                    sharedWithUser: {
                        select: {
                            id: true,
                            fullName: true,
                            employeeId: true,
                            email: true
                        }
                    },
                    sharedWithPlant: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    sharedWithDept: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    sharedWithSection: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.fileShare.count({ where })
        ]);

        return { items, total };
    }

    async getShareById(id: string) {
        return prisma.fileShare.findUnique({
            where: { id },
            include: {
                file: {
                    include: {
                        uploadedBy: {
                            select: {
                                id: true,
                                fullName: true,
                                employeeId: true
                            }
                        }
                    }
                },
                folder: {
                    select: {
                        id: true,
                        name: true,
                        createdBy: {
                            select: {
                                fullName: true,
                                employeeId: true
                            }
                        }
                    }
                },
                sharedWithUser: {
                    select: {
                        id: true,
                        fullName: true,
                        employeeId: true,
                        email: true
                    }
                },
                sharedWithPlant: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                },
                sharedWithDept: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                },
                sharedWithSection: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });
    }

    async updateShare(id: string, data: {
        permission?: string;
        expiresAt?: Date;
    }) {
        return prisma.fileShare.update({
            where: { id },
            data: {
                permission: data.permission as any,
                expiresAt: data.expiresAt
            }
        });
    }

    async revokeShare(id: string) {
        return prisma.fileShare.update({
            where: { id },
            data: { 
                isActive: false 
            }
        });
    }

    async canShareFile(userId: string, fileId?: string, folderId?: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true, departmentId: true }
        });

        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;

        if (fileId) {
            const file = await prisma.file.findUnique({
                where: { id: fileId },
                select: { uploadedById: true, plantId: true, departmentId: true }
            });
            if (!file) return false;
            if (file.uploadedById === userId) return true;
            if (user.role === 'PLANT_ADMIN' && user.plantId === file.plantId) return true;
            if (user.role === 'DEPARTMENT_HEAD' && user.departmentId === file.departmentId) return true;
            
            // Check if user has UPLOAD (Share/Full Control) permission on the file
            const hasUploadPerm = await permissionService.hasPermission(userId, fileId, 'FILE', 'UPLOAD');
            if (hasUploadPerm) return true;
        } else if (folderId) {
            const folder = await prisma.folder.findUnique({
                where: { id: folderId },
                select: { createdById: true, plantId: true, departmentId: true }
            });
            if (!folder) return false;
            if (folder.createdById === userId) return true;
            if (user.role === 'PLANT_ADMIN' && user.plantId === folder.plantId) return true;
            if (user.role === 'DEPARTMENT_HEAD' && user.departmentId === folder.departmentId) return true;
            
            // Check if user has UPLOAD (Share/Full Control) permission on the folder
            const hasUploadPerm = await permissionService.hasPermission(userId, folderId, 'FOLDER', 'UPLOAD');
            if (hasUploadPerm) return true;
        }

        return false;
    }

    async canManageShare(userId: string, shareId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true, departmentId: true }
        });

        const share = await prisma.fileShare.findUnique({
            where: { id: shareId },
            include: {
                file: {
                    select: {
                        uploadedById: true,
                        plantId: true,
                        departmentId: true
                    }
                },
                folder: {
                    select: {
                        createdById: true,
                        plantId: true,
                        departmentId: true
                    }
                }
            }
        });

        if (!user || !share) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (share.sharedBy === userId) return true;
        if (share.file && user.role === 'PLANT_ADMIN' && user.plantId === share.file.plantId) return true;
        if (share.folder && user.role === 'PLANT_ADMIN' && user.plantId === share.folder.plantId) return true;

        return false;
    }

    async canAccessShare(userId: string, shareId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true, departmentId: true, sectionId: true }
        });

        const share = await prisma.fileShare.findUnique({
            where: { id: shareId }
        });

        if (!user || !share) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (share.sharedBy === userId) return true;
        if (share.sharedWithUserId === userId) return true;
        if (share.sharedWithPlantId && share.sharedWithPlantId === user.plantId) return true;
        if (share.sharedWithDeptId && share.sharedWithDeptId === user.departmentId) return true;
        if (share.sharedWithSectionId && share.sharedWithSectionId === user.sectionId) return true;

        return false;
    }

    async createShareNotifications(shareId: string) {
        const share = await prisma.fileShare.findUnique({
            where: { id: shareId },
            include: {
                file: true,
                folder: true,
                sharedWithUser: true,
                sharedWithPlant: {
                    include: {
                        users: {
                            where: { isActive: true },
                            select: { id: true }
                        }
                    }
                },
                sharedWithDept: {
                    include: {
                        users: {
                            where: { isActive: true },
                            select: { id: true }
                        }
                    }
                },
                sharedWithSection: {
                    include: {
                        users: {
                            where: { isActive: true },
                            select: { id: true }
                        }
                    }
                }
            }
        });

        if (!share) return;

        let userIds: string[] = [];

        // Add specific user
        if (share.sharedWithUserId) {
            userIds.push(share.sharedWithUserId);
        }

        // Add all users in plant
        if (share.sharedWithPlantId && share.sharedWithPlant) {
            userIds.push(...share.sharedWithPlant.users.map(u => u.id));
        }

        // Add all users in department
        if (share.sharedWithDeptId && share.sharedWithDept) {
            userIds.push(...share.sharedWithDept.users.map(u => u.id));
        }

        // Add all users in section
        if (share.sharedWithSectionId && share.sharedWithSection) {
            userIds.push(...share.sharedWithSection.users.map(u => u.id));
        }

        // Remove duplicates
        userIds = [...new Set(userIds)];

        const resourceName = share.file ? share.file.fileName : (share.folder ? share.folder.name : 'A resource');
        const link = share.file ? `/files/${share.file.id}` : `/folders/${share.folder?.id}`;

        // Create notifications
        const notifications = userIds.map(userId => ({
            userId,
            title: share.file ? 'New File Shared' : 'New Folder Shared',
            message: `${resourceName} has been shared with you`,
            type: 'FILE_SHARED' as any,
            link: link
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({
                data: notifications
            });
        }
    }
}