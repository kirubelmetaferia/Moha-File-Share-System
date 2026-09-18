import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

export class PlantService {
    /**
     * Create a new plant
     */
    async createPlant(data: {
        name: string;
        code: string;
        location: string;
        address?: string;
        phone?: string;
        email?: string;
        createdBy: string;
    }) {
        // Check if plant with same code exists
        const existingPlant = await prisma.plant.findFirst({
            where: {
                OR: [
                    { code: data.code },
                    { name: data.name }
                ]
            }
        });

        if (existingPlant) {
            throw new AppError('Plant with this code or name already exists', 409);
        }

        return prisma.plant.create({
            data: {
                name: data.name,
                code: data.code,
                location: data.location,
                address: data.address,
                phone: data.phone,
                email: data.email,
                createdBy: data.createdBy
            }
        });
    }

    /**
     * Get all plants with pagination and filtering
     */
    async getPlants(where: any, page: number, limit: number) {
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            prisma.plant.findMany({
                where,
                skip,
                take: limit,
                include: {
                    departments: {
                        where: { isActive: true },
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            _count: {
                                select: { users: true }
                            }
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
                    _count: {
                        select: {
                            departments: { where: { isActive: true } },
                            users: { where: { isActive: true } },
                            files: { where: { isDeleted: false } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.plant.count({ where })
        ]);

        return { items, total };
    }

    /**
     * Get a single plant by ID
     */
    async getPlantById(id: string) {
        const plant = await prisma.plant.findUnique({
            where: { id },
            include: {
                departments: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        description: true,
                        _count: {
                            select: { 
                                users: { where: { isActive: true } },
                                files: { where: { isDeleted: false } }
                            }
                        }
                    }
                },
                users: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        fullName: true,
                        employeeId: true,
                        email: true,
                        role: true,
                        department: {
                            select: {
                                id: true,
                                name: true,
                                code: true
                            }
                        },
                        _count: {
                            select: { 
                                uploadedFiles: { where: { isDeleted: false } }
                            }
                        }
                    }
                },
                files: {
                    where: { isDeleted: false },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        fileName: true,
                        originalName: true,
                        fileSize: true,
                        createdAt: true,
                        uploadedBy: {
                            select: {
                                fullName: true,
                                employeeId: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        departments: { where: { isActive: true } },
                        users: { where: { isActive: true } },
                        files: { where: { isDeleted: false } }
                    }
                }
            }
        });

        if (!plant) {
            throw new AppError('Plant not found', 404);
        }

        return plant;
    }

    /**
     * Update a plant
     */
    async updatePlant(id: string, data: {
        name?: string;
        location?: string;
        address?: string;
        phone?: string;
        email?: string;
        isActive?: boolean;
    }) {
        // Check if plant exists
        const plant = await prisma.plant.findUnique({ where: { id } });
        if (!plant) {
            throw new AppError('Plant not found', 404);
        }

        // Check if updating to duplicate name or code
        if (data.name) {
            const existingPlant = await prisma.plant.findFirst({
                where: {
                    name: data.name,
                    id: { not: id }
                }
            });
            if (existingPlant) {
                throw new AppError('Plant with this name already exists', 409);
            }
        }

        return prisma.plant.update({
            where: { id },
            data,
            include: {
                departments: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            }
        });
    }

    /**
     * Delete a plant (soft delete)
     */
    async deletePlant(id: string) {
        const plant = await prisma.plant.findUnique({ 
            where: { id },
            include: {
                departments: {
                    where: { isActive: true }
                },
                users: {
                    where: { isActive: true }
                }
            }
        });

        if (!plant) {
            throw new AppError('Plant not found', 404);
        }

        // Check if plant has active departments or users
        if (plant.departments.length > 0 || plant.users.length > 0) {
            throw new AppError(
                'Cannot delete plant with active departments or users. Deactivate them first.',
                400
            );
        }

        return prisma.plant.update({
            where: { id },
            data: { isActive: false }
        });
    }

    /**
     * Get plant statistics
     */
    async getPlantStats(id: string) {
        const plant = await prisma.plant.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        departments: { where: { isActive: true } },
                        users: { where: { isActive: true } },
                        files: { where: { isDeleted: false } }
                    }
                }
            }
        });

        if (!plant) {
            throw new AppError('Plant not found', 404);
        }

        // Get file size statistics
        const fileStats = await prisma.file.aggregate({
            where: {
                plantId: id,
                isDeleted: false
            },
            _sum: {
                fileSize: true
            },
            _count: true
        });

        // Get recent activity
        const recentActivity = await prisma.auditLog.findMany({
            where: {
                user: {
                    plantId: id
                }
            },
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        fullName: true,
                        employeeId: true
                    }
                }
            }
        });

        return {
            plant: {
                id: plant.id,
                name: plant.name,
                code: plant.code
            },
            statistics: {
                totalDepartments: plant._count.departments,
                totalUsers: plant._count.users,
                totalFiles: plant._count.files,
                totalStorageUsed: fileStats._sum.fileSize || 0,
                totalStorageBytes: fileStats._sum.fileSize || 0
            },
            recentActivity
        };
    }

    /**
     * Search plants
     */
    async searchPlants(query: string, page: number = 1, limit: number = 10) {
        const skip = (page - 1) * limit;

        const where = {
            isActive: true,
            OR: [
                { name: { contains: query } },
                { code: { contains: query } },
                { location: { contains: query } },
                { email: { contains: query } }
            ]
        };

        const [items, total] = await Promise.all([
            prisma.plant.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    name: true,
                    code: true,
                    location: true,
                    createdAt: true,
                    _count: {
                        select: {
                            departments: { where: { isActive: true } },
                            users: { where: { isActive: true } }
                        }
                    }
                }
            }),
            prisma.plant.count({ where })
        ]);

        return { items, total };
    }

    /**
     * Check if user can manage a plant
     */
    async canManagePlant(userId: string, plantId: string): Promise<boolean> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true }
        });

        if (!user) return false;
        if (user.role === 'SUPER_ADMIN') return true;
        if (user.role === 'ADMIN' && !user.plantId) return true;
        if (user.role === 'PLANT_ADMIN' && user.plantId === plantId) return true;

        return false;
    }

    /**
     * Get plants accessible to a user
     */
    async getAccessiblePlants(userId: string) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true, plantId: true }
        });

        if (!user) return [];

        let where = {};
        if (user.role === 'SUPER_ADMIN') {
            // Super admin can access all plants
        } else if (user.role === 'PLANT_ADMIN' || user.plantId) {
            where = { id: user.plantId };
        } else {
            // Employees and other roles can access their own plant
            where = { id: user.plantId };
        }

        const plants = await prisma.plant.findMany({
            where,
            select: {
                id: true,
                name: true,
                code: true,
                location: true,
                _count: {
                    select: {
                        departments: { where: { isActive: true } },
                        users: { where: { isActive: true } }
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        return plants;
    }

    /**
     * Get plant by code
     */
    async getPlantByCode(code: string) {
        const plant = await prisma.plant.findUnique({
            where: { code },
            include: {
                departments: {
                    where: { isActive: true },
                    select: {
                        id: true,
                        name: true,
                        code: true
                    }
                }
            }
        });

        if (!plant) {
            throw new AppError('Plant not found', 404);
        }

        return plant;
    }

    /**
     * Check if plant exists
     */
    async plantExists(id: string): Promise<boolean> {
        const plant = await prisma.plant.findUnique({
            where: { id },
            select: { id: true }
        });
        return !!plant;
    }

    /**
     * Get plant name by ID
     */
    async getPlantName(id: string): Promise<string> {
        const plant = await prisma.plant.findUnique({
            where: { id },
            select: { name: true }
        });

        if (!plant) {
            throw new AppError('Plant not found', 404);
        }

        return plant.name;
    }
}