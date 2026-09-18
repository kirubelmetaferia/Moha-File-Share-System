// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { createUserSchema, updateUserSchema, changePasswordSchema } from '../validators/authValidator';
import { successResponse, paginatedResponse } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { UserService } from '../services/userService';
import bcrypt from 'bcryptjs';

export class UserController {
    private userService = new UserService();
    constructor() {
        this.createUser = this.createUser.bind(this);
        this.getAllUsers = this.getAllUsers.bind(this);
        this.getUserById = this.getUserById.bind(this);
        this.updateUser = this.updateUser.bind(this);
        this.deleteUser = this.deleteUser.bind(this);
        this.getProfile = this.getProfile.bind(this);
        this.updateProfile = this.updateProfile.bind(this);
        this.changePassword = this.changePassword.bind(this);
        this.downloadImportTemplate = this.downloadImportTemplate.bind(this);
        this.bulkImportUsers = this.bulkImportUsers.bind(this);
        this.bulkExportUsers = this.bulkExportUsers.bind(this);
        this.resetUserPassword = this.resetUserPassword.bind(this);
    }

    async createUser(req: Request, res: Response, next: NextFunction) {
        try {
            const validated = createUserSchema.parse(req.body);
            
            if (validated.plantId) {
                const hasAccess = await this.userService.canManagePlant(
                    req.user!.id, 
                    validated.plantId
                );
                if (!hasAccess) {
                    throw new AppError('You do not have permission to create users in this plant', 403);
                }
            }

            if (validated.departmentId) {
                const department = await prisma.department.findUnique({
                    where: { id: validated.departmentId }
                });
                
                if (department && department.plantId !== validated.plantId) {
                    throw new AppError('Department does not belong to the specified plant', 400);
                }
            }

            if (validated.sectionId) {
                const section = await prisma.section.findUnique({
                    where: { id: validated.sectionId }
                });
                
                if (section && section.departmentId !== validated.departmentId) {
                    throw new AppError('Section does not belong to the specified department', 400);
                }
            }

            const hashedPassword = await bcrypt.hash(validated.password, 10);
            
            const user = await this.userService.createUser({
                ...validated,
                password: hashedPassword,
                createdBy: req.user!.id
            });

            logger.info(`User created: ${user.id} (${user.employeeId}) by ${req.user?.employeeId}`);
            res.status(201).json(successResponse(user, 'User created successfully'));
        } catch (error) {
            next(error);
        }
    }

    async getAllUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;
            const plantId = req.query.plantId as string;
            const departmentId = req.query.departmentId as string;
            const status = req.query.status as string;
            let where: any = {};
            
            if (status === 'active') {
                where.isActive = true;
            } else if (status === 'inactive') {
                where.isActive = false;
            } else if (!status) {
                // Default to active if status is not provided, for backward compatibility
                where.isActive = true;
            }
            
            if (plantId) {
                where.plantId = plantId;
            }
            
            if (departmentId) {
                where.departmentId = departmentId;
            }
            
            if (req.query.scope !== 'all') {
                if (req.user?.role === 'PLANT_ADMIN') {
                    where.plantId = req.user.plantId;
                }

                if (req.user?.role === 'ADMIN' && req.user.plantId) {
                    where.plantId = req.user.plantId;
                }
                
                if (req.user?.role === 'DEPARTMENT_HEAD') {
                    where.departmentId = req.user.departmentId;
                }
            }

            if (req.query.search) {
                const search = req.query.search as string;
                where.OR = [
                    { fullName: { contains: search } },
                    { employeeId: { contains: search } },
                    { email: { contains: search } }
                ];
            }

            const result = await this.userService.getUsers(where, page, limit);

            res.json(paginatedResponse(result.items, result.total, page, limit));
        } catch (error) {
            next(error);
        }
    }

    async getUserById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            
            const user = await this.userService.getUserById(id as string);
            
            if (!user) {
                throw new AppError('User not found', 404);
            }

            const hasAccess = await this.userService.canAccessUser(req.user!.id, user.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to view this user', 403);
            }

            res.json(successResponse(user));
        } catch (error) {
            next(error);
        }
    }

    async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const validated = updateUserSchema.parse(req.body);

            const user = await prisma.user.findUnique({ where: { id: id as string } });
            if (!user) {
                throw new AppError('User not found', 404);
            }

            const hasAccess = await this.userService.canManageUser(req.user!.id, user.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to update this user', 403);
            }

            if (validated.role) {
                const canAssignRole = await this.userService.canAssignRole(
                    req.user!.id, 
                    validated.role
                );
                if (!canAssignRole) {
                    throw new AppError(`You do not have permission to assign role: ${validated.role}`, 403);
                }

            
            }

            const updated = await this.userService.updateUser(id as string, validated);

            logger.info(`User updated: ${id} by ${req.user?.employeeId}`);
            res.json(successResponse(updated, 'User updated successfully'));
        } catch (error) {
            next(error);
        }
    }

    async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            const user = await prisma.user.findUnique({ where: { id: id as string } });
            if (!user) {
                throw new AppError('User not found', 404);
            }

            if (user.id === req.user?.id) {
                throw new AppError('You cannot delete your own account', 400);
            }

            const hasAccess = await this.userService.canManageUser(req.user!.id, user.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to delete this user', 403);
            }

            await this.userService.deleteUser(id as string);

            logger.warn(`User deleted: ${id} by ${req.user?.employeeId}`);
            res.json(successResponse(null, 'User deleted successfully'));
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await this.userService.getUserById(req.user!.id);
            
            if (!user) {
                throw new AppError('User not found', 404);
            }

            res.json(successResponse(user));
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const { fullName, phone } = req.body;
            
            const updated = await this.userService.updateUser(req.user!.id, {
                fullName,
                phone
            });

            logger.info(`Profile updated for user: ${req.user?.employeeId}`);
            res.json(successResponse(updated, 'Profile updated successfully'));
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
            
            const user = await prisma.user.findUnique({
                where: { id: req.user!.id }
            });

            if (!user) {
                throw new AppError('User not found', 404);
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                throw new AppError('Current password is incorrect', 401);
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await this.userService.updateUser(user.id, {
                password: hashedPassword
            });

            logger.info(`Password changed for user: ${req.user?.employeeId}`);
            res.json(successResponse(null, 'Password changed successfully'));
        } catch (error) {
            next(error);
        }
    }

    async resetUserPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const userToReset = await prisma.user.findUnique({ where: { id: id as string } });

            if (!userToReset) {
                throw new AppError('User not found', 404);
            }

            const hasAccess = await this.userService.canManageUser(req.user!.id, userToReset.id);
            if (!hasAccess) {
                throw new AppError('You do not have permission to reset this user\'s password', 403);
            }

            // Generate a secure temporary password
            const tempPassword = require('crypto').randomBytes(8).toString('hex') + 'A1!'; 
            const hashedPassword = await bcrypt.hash(tempPassword, 10);

            await prisma.user.update({
                where: { id: userToReset.id },
                data: {
                    password: hashedPassword,
                    mustChangePassword: true
                }
            });

            await prisma.auditLog.create({
                data: {
                    userId: req.user!.id,
                    action: 'ADMIN_PASSWORD_RESET',
                    resourceType: 'USER',
                    resourceId: userToReset.id,
                    details: { message: `Administrator reset password for user ${userToReset.employeeId}` },
                    ipAddress: req.ip
                }
            });

            const { sendAdminPasswordResetNotification } = require('../services/emailService');
            // Since we need to give them a link to log in and use the temp password
            const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
            
            // In a real scenario we'd email them the temp password, or email them a token.
            // Our prompt says: "Depending on security design, temporary password OR setup link".
            // We generated a temp password, so we must email it.
            // Let's modify the email service if needed, or pass the temp password. 
            // Wait, the prompt says "Do not include unnecessary sensitive information. Prefer a secure Set New Password link over emailing a plaintext password whenever possible."
            // Okay, let's just generate a token and send a link, SAME as forgot-password, instead of a temporary password, because it's much more secure.
            
            // Generate a reset token instead of a temp password!
            const resetToken = require('crypto').randomBytes(32).toString('hex');
            const tokenHash = require('crypto').createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for admin reset

            await prisma.passwordResetToken.deleteMany({
                where: { userId: userToReset.id }
            });

            await prisma.passwordResetToken.create({
                data: {
                    userId: userToReset.id,
                    tokenHash,
                    expiresAt,
                    requestIp: req.ip,
                    userAgent: req.headers['user-agent']
                }
            });
            
            // Also set mustChangePassword = true, so if they know their old password they still can't log in without changing it (or if they do log in, they are forced to change it).
            // But since we just reset it, we don't need to change the old password right away if we use a token.
            // Actually, if we just send a token, the old password remains valid until they use the token. 
            // If the admin wants to immediately lock them out of the old password, we should scramble it.
            const scrambledPassword = await bcrypt.hash(require('crypto').randomBytes(32).toString('hex'), 10);
            
            await prisma.user.update({
                where: { id: userToReset.id },
                data: {
                    password: scrambledPassword,
                    mustChangePassword: true // This will force them to change it even if they somehow guess it
                }
            });

            const setPasswordLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
            await sendAdminPasswordResetNotification(userToReset.email, userToReset.fullName, userToReset.employeeId, setPasswordLink);

            logger.info(`Admin ${req.user?.employeeId} reset password for user: ${userToReset.employeeId}`);
            res.json(successResponse(null, "Password reset successfully. A secure setup link has been sent to the user's email."));
        } catch (error) {
            next(error);
        }
    }

    async downloadImportTemplate(req: Request, res: Response, next: NextFunction) {
        try {
            const XLSX = require('xlsx');
            
            const wsData = [
                ['Full Name', 'Employee ID', 'Email', 'Department', 'Role', 'Password', 'Status']
            ];
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Template');
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Disposition', 'attachment; filename="users_import_template.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        } catch (error) {
            next(error);
        }
    }

    async bulkImportUsers(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                throw new AppError('No Excel file uploaded', 400);
            }

            const XLSX = require('xlsx');
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

            const results = {
                total: data.length,
                successful: 0,
                failed: 0,
                errors: [] as { row: number, reason: string }[]
            };

            const validUsers = [];
            const seenEmails = new Set();
            const seenEmployeeIds = new Set();

            for (let i = 0; i < data.length; i++) {
                const row = data[i];
                const rowNum = i + 2;

                const fullName = (row['Full Name'] || '').toString().trim();
                const employeeId = (row['Employee ID'] || '').toString().trim();
                const email = (row['Email'] || '').toString().trim();
                const departmentName = (row['Department'] || '').toString().trim();
                let role = (row['Role'] || '').toString().trim().toUpperCase().replace(' ', '_');
                const password = (row['Password'] || '').toString();
                const statusStr = (row['Status'] || '').toString().trim().toLowerCase();
                
                if (!fullName || !employeeId || !email || !password) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Missing required fields (Full Name, Employee ID, Email, Password)' });
                    continue;
                }

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Invalid email format' });
                    continue;
                }

                if (!email.toLowerCase().endsWith('@gmail.com')) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Email must be a @gmail.com address' });
                    continue;
                }

                if (password.length < 8) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Password must be at least 8 characters' });
                    continue;
                }

                const validRoles = ['SUPER_ADMIN', 'ADMIN', 'PLANT_ADMIN', 'DEPARTMENT_HEAD', 'SECTION_HEAD', 'EMPLOYEE', 'VIEWER'];
                if (role && !validRoles.includes(role)) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
                    continue;
                }
                
                if (role) {
                    const canAssign = await this.userService.canAssignRole(req.user!.id, role);
                    if (!canAssign) {
                        results.failed++;
                        results.errors.push({ row: rowNum, reason: `You do not have permission to assign the role: ${role}` });
                        continue;
                    }
                }
                if (!role) role = 'EMPLOYEE';

                let isActive = true;
                if (statusStr === 'inactive' || statusStr === 'false' || statusStr === '0') {
                    isActive = false;
                }

                if (seenEmails.has(email)) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Duplicate email in excel file' });
                    continue;
                }
                seenEmails.add(email);

                if (seenEmployeeIds.has(employeeId)) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Duplicate employee ID in excel file' });
                    continue;
                }
                seenEmployeeIds.add(employeeId);

                const existingEmail = await prisma.user.findUnique({ where: { email } });
                if (existingEmail) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Email already exists in database' });
                    continue;
                }

                const existingEmpId = await prisma.user.findUnique({ where: { employeeId } });
                if (existingEmpId) {
                    results.failed++;
                    results.errors.push({ row: rowNum, reason: 'Employee ID already exists in database' });
                    continue;
                }

                let departmentId = undefined;
                let plantId = undefined;

                if (departmentName) {
                    const dept = await prisma.department.findFirst({
                        where: { name: departmentName },
                        include: { plant: true }
                    });
                    
                    if (!dept) {
                        results.failed++;
                        results.errors.push({ row: rowNum, reason: `Department '${departmentName}' not found` });
                        continue;
                    }
                    departmentId = dept.id;
                    plantId = dept.plantId;
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                validUsers.push({
                    fullName,
                    employeeId,
                    email,
                    password: hashedPassword,
                    role,
                    isActive,
                    departmentId,
                    plantId,
                });
            }

            if (validUsers.length > 0) {
                await this.userService.bulkCreateUsers(validUsers, req.user!.id);
                results.successful = validUsers.length;
            }

            logger.info(`Bulk user import completed by ${req.user?.employeeId}: ${results.successful} successful, ${results.failed} failed`);
            res.json(successResponse(results, 'Bulk import completed'));
        } catch (error) {
            next(error);
        }
    }
    async bulkExportUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const plantId = req.query.plantId as string;
            const departmentId = req.query.departmentId as string;
            const status = req.query.status as string;
            
            let where: any = {};
            
            if (status === 'active') {
                where.isActive = true;
            } else if (status === 'inactive') {
                where.isActive = false;
            } else if (!status) {
                where.isActive = true;
            }
            
            if (plantId) {
                where.plantId = plantId;
            }
            
            if (departmentId) {
                where.departmentId = departmentId;
            }
            
            if (req.query.scope !== 'all') {
                if (req.user?.role === 'PLANT_ADMIN') {
                    where.plantId = req.user.plantId;
                }

                if (req.user?.role === 'ADMIN' && req.user.plantId) {
                    where.plantId = req.user.plantId;
                }
                
                if (req.user?.role === 'DEPARTMENT_HEAD') {
                    where.departmentId = req.user.departmentId;
                }
            }

            if (req.query.search) {
                const search = req.query.search as string;
                where.OR = [
                    { fullName: { contains: search } },
                    { employeeId: { contains: search } },
                    { email: { contains: search } }
                ];
            }

            // Get all users matching criteria without pagination
            const users = await prisma.user.findMany({
                where,
                select: {
                    fullName: true,
                    employeeId: true,
                    email: true,
                    role: true,
                    isActive: true,
                    department: {
                        select: { name: true }
                    },
                    plant: {
                        select: { name: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const XLSX = require('xlsx');
            
            const wsData = [
                ['Full Name', 'Employee ID', 'Email', 'Role', 'Status', 'Department', 'Plant']
            ];
            
            users.forEach(user => {
                wsData.push([
                    user.fullName,
                    user.employeeId,
                    user.email,
                    user.role,
                    user.isActive ? 'Active' : 'Inactive',
                    user.department?.name || '',
                    user.plant?.name || ''
                ]);
            });
            
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Users');
            
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
            
            res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);
        } catch (error) {
            next(error);
        }
    }
}