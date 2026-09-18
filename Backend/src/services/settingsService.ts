import { prisma } from '../config/database';

export const DEFAULT_SETTINGS = [
    { key: 'system.maintenance_mode', value: false },
    { key: 'storage.max_file_size_mb', value: 50 },
    { key: 'storage.allowed_extensions', value: 'pdf,doc,docx,xls,xlsx,png,jpg,jpeg,zip,rar' },
    { key: 'auth.session_timeout_minutes', value: 60 },
    { key: 'ui.default_theme', value: 'system' }
];

export class SettingsService {
    async initSettings() {
        for (const setting of DEFAULT_SETTINGS) {
            const existing = await prisma.systemSettings.findUnique({ where: { key: setting.key } });
            if (!existing) {
                await prisma.systemSettings.create({
                    data: {
                        key: setting.key,
                        value: setting.value
                    }
                });
            }
        }
    }

    async getSettings() {
        return prisma.systemSettings.findMany();
    }

    async getSetting(key: string) {
        return prisma.systemSettings.findUnique({ where: { key } });
    }

    async updateSetting(key: string, value: any) {
        return prisma.systemSettings.upsert({
            where: { key },
            update: { value },
            create: { key, value }
        });
    }
}
