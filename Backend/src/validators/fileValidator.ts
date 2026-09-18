import { z } from 'zod';

export const fileUploadSchema = z.object({
    description: z.string().optional(),
    departmentId: z.string().optional(),
    plantId: z.string().optional(),
    folderId: z.string().optional(),
    category: z.enum(['DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'PDF', 'IMAGE', 'VIDEO', 'OTHER']).default('OTHER')
});

export const fileShareSchema = z.object({
    fileId: z.string().optional(),
    folderId: z.string().optional(),
    targets: z.array(z.object({
        type: z.enum(['USER', 'PLANT', 'DEPARTMENT', 'SECTION']),
        id: z.string()
    })).min(1, 'Must specify at least one share target'),
    permission: z.enum(['VIEW', 'DOWNLOAD', 'MODIFY', 'MODIFY_ONLINE', 'DELETE', 'UPLOAD']).default('VIEW'),
    expiresAt: z.string().datetime().optional()
}).refine(
    (data) => {
        return !!data.fileId || !!data.folderId;
    },
    {
        message: 'Either fileId or folderId must be provided'
    }
);

export const fileUpdateSchema = z.object({
    description: z.string().optional(),
    category: z.enum(['DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'PDF', 'IMAGE', 'VIDEO', 'OTHER']).optional(),
    isActive: z.boolean().optional()
});