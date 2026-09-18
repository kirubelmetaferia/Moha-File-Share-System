import { z } from 'zod';
import { ROLES } from '../constants/roles';

export const registerSchema = z.object({
    email: z.string().email('Invalid email format').refine(val => val.toLowerCase().endsWith('@gmail.com'), {
        message: "Email must be a @gmail.com address"
    }),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name is required'),
    employeeId: z.string().min(1, 'Employee ID is required'),
    plantId: z.string().optional(),
    departmentId: z.string().optional(),
    role: z.enum([ROLES.EMPLOYEE, ROLES.SECTION_HEAD, ROLES.DEPARTMENT_HEAD, ROLES.PLANT_ADMIN, ROLES.VIEWER]).default(ROLES.EMPLOYEE)
});

// Used by admins to create users — includes SUPER_ADMIN role
export const createUserSchema = z.object({
    email: z.string().email('Invalid email format').refine(val => val.toLowerCase().endsWith('@gmail.com'), {
        message: "Email must be a @gmail.com address"
    }),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    fullName: z.string().min(2, 'Full name is required'),
    employeeId: z.string().min(1, 'Employee ID is required'),
    plantId: z.string().optional(),
    departmentId: z.string().optional(),
    sectionId: z.string().optional(),
    role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.SECTION_HEAD, ROLES.DEPARTMENT_HEAD, ROLES.PLANT_ADMIN, ROLES.VIEWER]).default(ROLES.EMPLOYEE),
    isActive: z.boolean().optional()
});

export const loginSchema = z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    password: z.string().min(1, 'Password is required')
});

const passwordValidation = z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordValidation
});

export const forgotPasswordSchema = z.object({
    emailOrId: z.string().min(1, 'Email or Employee ID is required')
});

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: passwordValidation
});

export const forceChangePasswordSchema = z.object({
    tempToken: z.string().min(1, 'Temporary token is required'),
    newPassword: passwordValidation
});

export const updateUserSchema = z.object({
    fullName: z.string().min(2).optional(),
    phone: z.string().optional(),
    departmentId: z.string().optional(),
    plantId: z.string().optional(),
    sectionId: z.string().optional(),
    role: z.enum([ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.SECTION_HEAD, ROLES.DEPARTMENT_HEAD, ROLES.PLANT_ADMIN, ROLES.VIEWER]).optional(),
    isActive: z.boolean().optional(),
});