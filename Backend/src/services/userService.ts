import { prisma } from '../config/database';
import { ROLES } from '../constants/roles';
import { AppError } from '../middleware/errorHandler';

export class UserService {
    async createUser(data: {
        email: string;
        password: string;
        fullName: string;
        employeeId: string;
        plantId?: string;
        departmentId?: string;
        sectionId?: string;
        role?: string;
        isActive?: boolean;
        createdBy: string;
    }) {
        // Enforce singleton SUPER_ADMIN
        if (data.role === 'SUPER_ADMIN') {
            const existing = await prisma.user.findFirst({
                where: { role: 'SUPER_ADMIN', isActive: true },
                select: { id: true }
            });
            if (existing) {
                throw new AppError('A Super Admin already exists. Only one Super Admin is allowed.', 409);
            }
        }

        return prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    password: data.password,
                    fullName: data.fullName,
                    employeeId: data.employeeId,
                    plantId: data.plantId,
                    departmentId: data.departmentId,
                    sectionId: data.sectionId,
                    role: data.role as any || 'EMPLOYEE',
                    isActive: data.isActive ?? true,
                    createdBy: data.createdBy
                },
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    employeeId: true,
                    plantId: true,
                    departmentId: true,
                    sectionId: true,
                    role: true,
                    isActive: true,
                    createdAt: true
                }
            });

            if (data.createdBy) {
                await tx.auditLog.create({
                    data: {
                        userId: data.createdBy,
                        action: 'CREATE_USER',
                        resourceType: 'USER',
                        resourceId: user.id,
                        details: { method: 'MANUAL', createdEmail: user.email }
                    }
                });
            }

            return user;
        });
    }

    async bulkCreateUsers(validUsers: any[], adminUserId: string) {
        return prisma.$transaction(async (tx) => {
            const createdUsers = [];
            for (const user of validUsers) {
                const newUser = await tx.user.create({
                    data: {
                        ...user,
                        createdBy: adminUserId
                    },
                    select: { id: true, email: true }
                });
                createdUsers.push(newUser);
            }

            await tx.auditLog.create({
                data: {
                    userId: adminUserId,
                    action: 'BULK_IMPORT_USERS',
                    resourceType: 'USER',
                    details: { method: 'EXCEL_IMPORT', count: validUsers.length }
                }
            });

            return createdUsers;
        });
    }

    async getUsers(where: any, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    email: true,
                    fullName: true,
                    employeeId: true,
                    phone: true,
                    profileImage: true,
                    role: true,
                    isActive: true,
                    lastLogin: true,
                    createdAt: true,
                    plantId: true,
                    departmentId: true,
                    sectionId: true,
                    plant: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    department: {
                        select: {
                            id: true,
                            name: true,
                            code: true
                        }
                    },
                    section: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.user.count({ where })
        ]);

        return { items, total };
    }

    async getUserById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                fullName: true,
                employeeId: true,
                phone: true,
                profileImage: true,
                role: true,
                isActive: true,
                lastLogin: true,
                createdAt: true,
                updatedAt: true,
                plant: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        location: true
                    }
                },
                department: {
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                },
                section: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                uploadedFiles: {
                    where: { isDeleted: false },
                    take: 5,
                    select: {
                        id: true,
                        fileName: true,
                        fileSize: true,
                        createdAt: true
                    }
                }
            }
        });
    }

    async updateUser(id: string, data: any) {
        return prisma.user.update({
            where: { id },
            data,
            select: {
                id: true,
                email: true,
                fullName: true,
                employeeId: true,
                phone: true,
                profileImage: true,
                role: true,
                isActive: true,
                plantId: true,
                departmentId: true,
                sectionId: true,
                updatedAt: true
            }
        });
    }

    async deleteUser(id: string) {
        return prisma.user.update({
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

    async canManageUser(userId: string, targetUserId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true, departmentId: true, sectionId: true }
        });

        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { plantId: true, departmentId: true, sectionId: true }
        });

        if (!user || !targetUser) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'ADMIN' && (!user.plantId || user.plantId === targetUser.plantId)) return true;
        if (user.role === 'PLANT_ADMIN' && user.plantId === targetUser.plantId) return true;
        if (user.role === 'DEPARTMENT_HEAD' && user.departmentId === targetUser.departmentId) return true;
        if (user.role === 'SECTION_HEAD' && user.sectionId === targetUser.sectionId) return true;

        return false;
    }

    async canAccessUser(userId: string, targetUserId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, plantId: true, departmentId: true, sectionId: true }
        });

        const targetUser = await prisma.user.findUnique({
            where: { id: targetUserId },
            select: { plantId: true, departmentId: true, sectionId: true }
        });

        if (!user || !targetUser) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'ADMIN' && (!user.plantId || user.plantId === targetUser.plantId)) return true;
        if (user.role === 'PLANT_ADMIN' && user.plantId === targetUser.plantId) return true;
        if (user.role === 'DEPARTMENT_HEAD' && user.departmentId === targetUser.departmentId) return true;
        if (user.role === 'SECTION_HEAD' && user.sectionId === targetUser.sectionId) return true;
        if (user.id === targetUserId) return true;

        return false;
    }

    async canAssignRole(userId: string, role: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'ADMIN' && role !== 'SUPER_ADMIN' && role !== 'ADMIN' && role !== 'PLANT_ADMIN') return true;
        if (user.role === 'PLANT_ADMIN' && role !== 'SUPER_ADMIN' && role !== 'PLANT_ADMIN') return true;
        if (user.role === 'DEPARTMENT_HEAD' && (role === 'SECTION_HEAD' || role === 'EMPLOYEE' || role === 'VIEWER')) return true;
        if (user.role === 'SECTION_HEAD' && (role === 'EMPLOYEE' || role === 'VIEWER')) return true;

        return false;
    }
}