import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class SectionService {
    async createSection(data: { name: string; departmentId: string; description?: string }) {
        return prisma.section.create({ data });
    }

    async getSections(where: any) {
        return prisma.section.findMany({ where, include: { department: true } });
    }

    async getSectionById(id: string) {
        return prisma.section.findUnique({
            where: { id },
            include: { department: true }
        });
    }

    async updateSection(id: string, data: any) {
        return prisma.section.update({
            where: { id },
            data
        });
    }

    async deleteSection(id: string) {
        return prisma.section.delete({ where: { id } });
    }
}
