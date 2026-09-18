import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export class DepartmentService {
    async createDepartment(data: {
        name: string;
        code: string;
        description?: string;
        plantId: string;
        createdBy: string;
    }) {
        return prisma.department.create({
            data: {
                name: data.name,
                code: data.code,
                description: data.description,
                plantId: data.plantId,
                createdBy: data.createdBy
            }
        });
    }

    async getDepartments(where: any, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.department.findMany({
                where,
                skip,
                take: limit,
                include: {
                    plant: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    users: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            fullName: true,
                            employeeId: true,
                            role: true
                        }
                    },
                    sections: {
                        select: {
                            id: true,
                            name: true,
                            description: true
                        }
                    },
                    files: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            fileName: true,
                            fileSize: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.department.count({ where })
        ]);

        return { items, total };
    }

    async getDepartmentById(id: string) {
        return prisma.department.findUnique({
            where: { id },
            include: {
                plant: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                },
                users: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        fullName: true,
                        employeeId: true,
                        role: true
                    }
                },
                files: {
                    where: { isDeleted: false },
                    select: {
                        id: true,
                        fileName: true,
                        fileSize: true,
                        createdAt: true,
                        uploadedBy: {
                            select: {
                                fullName: true,
                                employeeId: true
                            }
                        }
                    }
                }
            }
        });
    }

    async updateDepartment(id: string, data: {
        name?: string;
        description?: string;
        isActive?: boolean;
    }) {
        return prisma.department.update({
            where: { id },
            data
        });
    }

    async deleteDepartment(id: string) {
        return prisma.department.update({
            where: { id },
            data: { isActive: false }
        });
    }

    async canManagePlant(userId: string, plantId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true }
        });

        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'ADMIN' && (!user.plantId || user.plantId === plantId)) return true;
        if (user.role === 'PLANT_ADMIN' && user.plantId === plantId) return true;

        return false;
    }

    async canManageDepartment(userId: string, plantId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true, departmentId: true }
        });

        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'ADMIN' && (!user.plantId || user.plantId === plantId)) return true;
        if (user.role === 'PLANT_ADMIN' && user.plantId === plantId) return true;
        if (user.role === 'DEPARTMENT_HEAD') {
            // Department head can only manage their own department
            const department = await prisma.department.findFirst({
                where: {
                    id: user.departmentId || '',
                    plantId: plantId
                }
            });
            return !!department;
        }

        return false;
    }
}