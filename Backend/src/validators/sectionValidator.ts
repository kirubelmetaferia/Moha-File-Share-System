import { z } from 'zod';

export const createSectionSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    departmentId: z.string().min(1, 'Invalid department ID'),
    description: z.string().optional()
});

export const updateSectionSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional()
});
