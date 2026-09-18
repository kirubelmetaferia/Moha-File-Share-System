import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../services/settingsService';
import { successResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
export class SettingsController {
    private settingsService = new SettingsService();

    constructor() {
        this.getSettings = this.getSettings.bind(this);
        this.updateSetting = this.updateSetting.bind(this);
    }

    async getSettings(req: Request, res: Response, next: NextFunction) {
        try {
            const settings = await this.settingsService.getSettings();
            res.json(successResponse(settings));
        } catch (error) {
            next(error);
        }
    }

    async updateSetting(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.user!.role !== 'SUPER_ADMIN') {
                throw new AppError('Only SUPER_ADMIN can update system settings', 403);
            }
            const { key } = req.params;
            const { value } = req.body;
            
            const updated = await this.settingsService.updateSetting(key as string, value);

            prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'UPDATE',
                    resourceType: 'SYSTEM_SETTINGS' as any,
                    resourceId: key as string,
                    details: { key: key as string }
                }
            }).catch(err => logger.error('Audit log failed:', err));

            res.json(successResponse(updated, 'Setting updated successfully'));
        } catch (error) {
            next(error);
        }
    }
}
