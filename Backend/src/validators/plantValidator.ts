import { z } from 'zod';

export const createPlantSchema = z.object({
    name: z.string().min(2, 'Plant name is required'),
    code: z.string().min(2, 'Plant code is required'),
    location: z.string().min(2, 'Location is required'),
    email: z.string().email('Invalid email format').optional()
});

export const updatePlantSchema = z.object({
    name: z.string().min(2).optional(),
    location: z.string().min(2).optional(),
    email: z.string().email('Invalid email format').optional(),
    isActive: z.boolean().optional()
});