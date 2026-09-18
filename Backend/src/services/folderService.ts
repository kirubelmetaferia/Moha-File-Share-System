import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class FolderService {
    async createFolder(data: {
        name: string;
        description?: string;
        plantId?: string;
        departmentId?: string;
        sectionId?: string;
        parentFolderId?: string;
        createdById: string;
    }) {
        return prisma.folder.create({ data });
    }

    async getFolders(where: any) {
        return prisma.folder.findMany({
            where: { ...where, isDeleted: false },
            include: { createdBy: { select: { id: true, fullName: true } } }
        });
    }

    async getFolderById(id: string) {
        return prisma.folder.findUnique({
            where: { id },
            include: { subFolders: true, files: true }
        });
    }

    async updateFolder(id: string, data: any) {
        return prisma.folder.update({
            where: { id },
            data
        });
    }

    private async _getDescendantFolderIds(folderId: string): Promise<string[]> {
        const descendants: string[] = [];
        let currentLevel = [folderId];

        while (currentLevel.length > 0) {
            const children = await prisma.folder.findMany({
                where: { parentFolderId: { in: currentLevel } },
                select: { id: true }
            });

            if (children.length === 0) break;
            
            const childIds = children.map(c => c.id);
            descendants.push(...childIds);
            currentLevel = childIds;
        }

        return descendants;
    }

    async deleteFolder(id: string) {
        const descendantIds = await this._getDescendantFolderIds(id);
        const allFolderIds = [id, ...descendantIds];
        const now = new Date();

        await prisma.$transaction([
            prisma.file.updateMany({
                where: { folderId: { in: allFolderIds }, isDeleted: false },
                data: { isDeleted: true, deletedAt: now }
            }),
            prisma.folder.updateMany({
                where: { id: { in: allFolderIds }, isDeleted: false },
                data: { isDeleted: true, deletedAt: now }
            })
        ]);

        return { success: true };
    }

    async restoreFolder(id: string) {
        const descendantIds = await this._getDescendantFolderIds(id);
        const allFolderIds = [id, ...descendantIds];

        await prisma.$transaction([
            prisma.file.updateMany({
                where: { folderId: { in: allFolderIds }, isDeleted: true },
                data: { isDeleted: false, deletedAt: null }
            }),
            prisma.folder.updateMany({
                where: { id: { in: allFolderIds }, isDeleted: true },
                data: { isDeleted: false, deletedAt: null }
            })
        ]);

        return { success: true };
    }

    async hardDeleteFolder(id: string) {
        return prisma.folder.delete({ where: { id } });
    }
}
