import { prisma } from '../config/database';
import { PermissionLevel, Role } from '../generated/prisma';

export class PermissionService {
    // Used ONLY to resolve the strongest permission when multiple apply
    private readonly PERMISSION_RANK: Record<PermissionLevel, number> = {
        VIEW: 1,
        DOWNLOAD: 2,
        MODIFY_ONLINE: 3,
        MODIFY: 4,
        DELETE: 5,
        UPLOAD: 6
    };

    // Explicit capability mapping for authorization (replaces fragile numeric comparison)
    private readonly CAPABILITIES: Record<PermissionLevel, PermissionLevel[]> = {
        VIEW: ['VIEW'],
        DOWNLOAD: ['VIEW', 'DOWNLOAD'],
        MODIFY_ONLINE: ['VIEW', 'MODIFY_ONLINE'],
        MODIFY: ['VIEW', 'DOWNLOAD', 'MODIFY_ONLINE', 'MODIFY'],
        DELETE: ['VIEW', 'DOWNLOAD', 'MODIFY_ONLINE', 'MODIFY', 'DELETE'],
        UPLOAD: ['VIEW', 'DOWNLOAD', 'MODIFY_ONLINE', 'MODIFY', 'DELETE', 'UPLOAD']
    };

    /**
     * Resolves the highest effective permission level for a user on a given file or folder.
     */
    async getEffectivePermission(userId: string, targetId: string, targetType: 'FILE' | 'FOLDER'): Promise<PermissionLevel | null> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, plantId: true, departmentId: true, sectionId: true }
        });

        if (!user) return null;
        if (user.role === 'SUPER_ADMIN') return 'UPLOAD';

        let maxPermValue = 0;
        let maxPermLevel: PermissionLevel | null = null;
        let overrideFound = false;

        const updateMax = (perm: PermissionLevel) => {
            const val = this.PERMISSION_RANK[perm];
            if (val > maxPermValue) {
                maxPermValue = val;
                maxPermLevel = perm;
            }
        };

        const evaluateShares = (shares: any[]): boolean => {
            let localOverrideFound = false;
            for (const share of shares) {
                if (
                    (share.sharedWithUserId && share.sharedWithUserId === user.id) ||
                    (share.sharedWithPlantId && share.sharedWithPlantId === user.plantId) ||
                    (share.sharedWithDeptId && share.sharedWithDeptId === user.departmentId) ||
                    (share.sharedWithSectionId && share.sharedWithSectionId === user.sectionId)
                ) {
                    updateMax(share.permission);
                    if (share.isOverride) {
                        localOverrideFound = true;
                    }
                }
            }
            return localOverrideFound;
        };

        if (targetType === 'FILE') {
            const file = await prisma.file.findUnique({
                where: { id: targetId },
                include: { shares: { where: { isActive: true } } }
            });
            if (!file) return null;

            if (file.uploadedById === user.id) return 'UPLOAD';

            if (user.role === 'PLANT_ADMIN' && user.plantId === file.plantId) return 'UPLOAD';
            if (user.role === 'DEPARTMENT_HEAD' && user.departmentId === file.departmentId) return 'UPLOAD';
            if (user.role === 'SECTION_HEAD' && user.sectionId === file.sectionId) return 'UPLOAD';

            overrideFound = evaluateShares(file.shares);

            if (!overrideFound) {
                let currentFolderId = file.folderId;
                while (currentFolderId && !overrideFound) {
                    const folder = await prisma.folder.findUnique({
                        where: { id: currentFolderId },
                        include: { shares: { where: { isActive: true } } }
                    });
                    if (!folder) break;

                    overrideFound = evaluateShares(folder.shares);
                    currentFolderId = folder.parentFolderId;
                }
            }
        } else {
            const targetFolder = await prisma.folder.findUnique({
                where: { id: targetId },
                include: { shares: { where: { isActive: true } } }
            });
            if (!targetFolder) return null;

            if (targetFolder.createdById === user.id) return 'UPLOAD';

            if (user.role === 'PLANT_ADMIN' && user.plantId === targetFolder.plantId) return 'UPLOAD';
            if (user.role === 'DEPARTMENT_HEAD' && user.departmentId === targetFolder.departmentId) return 'UPLOAD';
            if (user.role === 'SECTION_HEAD' && user.sectionId === targetFolder.sectionId) return 'UPLOAD';

            let currentFolderId: string | null = targetFolder.id;
            while (currentFolderId && !overrideFound) {
                const parentFolder: any = await prisma.folder.findUnique({
                    where: { id: currentFolderId },
                    include: { shares: { where: { isActive: true } } }
                });
                if (!parentFolder) break;
                
                overrideFound = evaluateShares(parentFolder.shares);
                currentFolderId = parentFolder.parentFolderId;
            }
        }

        return maxPermLevel;
    }

    async hasPermission(userId: string, targetId: string, targetType: 'FILE' | 'FOLDER', requiredPermission: PermissionLevel): Promise<boolean> {
        const effectivePerm = await this.getEffectivePermission(userId, targetId, targetType);
        if (!effectivePerm) return false;

        return this.CAPABILITIES[effectivePerm].includes(requiredPermission);
    }
}

export const permissionService = new PermissionService();
