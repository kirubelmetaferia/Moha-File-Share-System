import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { successResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';

export class ReportController {
    constructor() {
        this.getStorageUsage = this.getStorageUsage.bind(this);
        this.getActiveFiles = this.getActiveFiles.bind(this);
        this.getStaleFiles = this.getStaleFiles.bind(this);
        this.getActiveUsers = this.getActiveUsers.bind(this);
    }

    async getStorageUsage(req: Request, res: Response, next: NextFunction) {
        try {
            const files = await prisma.file.findMany({
                where: { isDeleted: false },
                select: { fileSize: true, category: true, plantId: true, departmentId: true }
            });
            
            let totalBytes = 0;
            const categoryBreakdown: Record<string, number> = {};
            
            files.forEach(f => {
                totalBytes += f.fileSize;
                categoryBreakdown[f.category] = (categoryBreakdown[f.category] || 0) + f.fileSize;
            });
            
            const largestFiles = await prisma.file.findMany({
                where: { isDeleted: false },
                orderBy: { fileSize: 'desc' },
                take: 10,
                select: { id: true, originalName: true, fileSize: true, category: true }
            });
            
            res.json(successResponse({
                totalBytes,
                categoryBreakdown,
                largestFiles
            }));
        } catch (error) {
            next(error);
        }
    }

    async getActiveFiles(req: Request, res: Response, next: NextFunction) {
        try {
            // Active files = accessed in last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const activeFiles = await prisma.file.findMany({
                where: {
                    isDeleted: false,
                    accessLogs: {
                        some: { accessedAt: { gte: thirtyDaysAgo } }
                    }
                },
                include: {
                    _count: { select: { accessLogs: true } },
                    uploadedBy: { select: { fullName: true } }
                },
                orderBy: {
                    accessLogs: { _count: 'desc' }
                },
                take: 50
            });
            
            res.json(successResponse(activeFiles));
        } catch (error) {
            next(error);
        }
    }

    async getStaleFiles(req: Request, res: Response, next: NextFunction) {
        try {
            const { months } = req.query; // 3, 6, 12
            const numMonths = parseInt(months as string) || 3;
            
            const cutoffDate = new Date();
            cutoffDate.setMonth(cutoffDate.getMonth() - numMonths);
            
            const staleFiles = await prisma.file.findMany({
                where: {
                    isDeleted: false,
                    AND: [
                        {
                            OR: [
                                { accessLogs: { none: {} } },
                                { accessLogs: { every: { accessedAt: { lt: cutoffDate } } } }
                            ]
                        },
                        { createdAt: { lt: cutoffDate } }
                    ]
                },
                include: { uploadedBy: { select: { fullName: true } } },
                orderBy: { createdAt: 'asc' },
                take: 100
            });
            
            res.json(successResponse(staleFiles));
        } catch (error) {
            next(error);
        }
    }

    async getActiveUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const { period } = req.query;
            const days = parseInt(period as string) || 30;
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - days);
            
            const activeUsers = await prisma.user.findMany({
                where: {
                    isActive: true,
                    lastLogin: { gte: cutoffDate }
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    lastLogin: true,
                    _count: {
                        select: { uploadedFiles: true, fileAccessLogs: true, auditLogs: true }
                    }
                },
                orderBy: { lastLogin: 'desc' }
            });
            
            res.json(successResponse(activeUsers));
        } catch (error) {
            next(error);
        }
    }
}
