import { Router } from 'express';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loginSchema, registerSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, forceChangePasswordSchema } from '../validators/authValidator';
import { AppError } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import { authenticate } from '../middleware/auth';
import { sendPasswordResetEmail, sendPasswordChangedNotification } from '../services/emailService';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

const router = Router();

const forgotPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 3, // Limit each IP to 3 forgot password requests per `window`
    message: 'Too many password reset requests from this IP, please try again after 15 minutes',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10, // Limit each IP to 10 login requests per `window`
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

const resetPasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // Limit each IP to 5 reset password requests per `window`
    message: 'Too many password reset attempts from this IP, please try again after 15 minutes',
    standardHeaders: 'draft-7',
    legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res, next) => {
    try {
        const validated = loginSchema.parse(req.body);
        
        const user = await prisma.user.findUnique({
            where: { employeeId: validated.employeeId }
        });

        if (!user || !user.isActive) {
            throw new AppError('Incorrect employee ID or password', 401);
        }

        const isValidPassword = await bcrypt.compare(validated.password, user.password);
        if (!isValidPassword) {
            throw new AppError('Incorrect employee ID or password', 401);
        }

        if (user.mustChangePassword) {
            const tempToken = jwt.sign(
                { id: user.id, mustChangePassword: true },
                process.env.JWT_SECRET!,
                { expiresIn: '15m' }
            );
            return res.status(403).json({
                error: 'Password change required',
                requiresPasswordChange: true,
                tempToken
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                employeeId: user.employeeId,
                role: user.role,
                plantId: user.plantId,
                departmentId: user.departmentId,
                sectionId: user.sectionId
            },
            process.env.JWT_SECRET!,
            { expiresIn: '90d' }
        );

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });

        res.json(successResponse({
            token,
            user: {
                id: user.id,
                employeeId: user.employeeId,
                fullName: user.fullName,
                role: user.role,
                plantId: user.plantId,
                departmentId: user.departmentId
            }
        }));
    } catch (error) {
        next(error);
    }
});
router.post('/register', async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: validated.email }, { employeeId: validated.employeeId }],
      },
    });
    if (existing) {
      throw new AppError('Email or Employee ID already in use', 409);
    }

    const hashedPassword = await bcrypt.hash(validated.password, 10);

    const user = await prisma.user.create({
      data: {
        email: validated.email,
        password: hashedPassword,
        fullName: validated.fullName,
        employeeId: validated.employeeId,
        plantId: validated.plantId,
        departmentId: validated.departmentId,
        role: validated.role,
      },
    });

    const token = jwt.sign(
      {
        id: user.id,
        employeeId: user.employeeId,
        role: user.role,
        plantId: user.plantId,
        departmentId: user.departmentId,
      },
      process.env.JWT_SECRET!,
      { expiresIn: '90d' }
    );

    res.status(201).json(
      successResponse({
        token,
        user: {
          id: user.id,
          employeeId: user.employeeId,
          fullName: user.fullName,
          role: user.role,
          plantId: user.plantId,
          departmentId: user.departmentId,
        },
      })
    );
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const validated = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new AppError('User not found', 404);

    const isCurrentValid = await bcrypt.compare(validated.currentPassword, user.password);
    if (!isCurrentValid) throw new AppError('Current password is incorrect', 401);

    const newHashed = await bcrypt.hash(validated.newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHashed, passwordChangedAt: new Date(), mustChangePassword: false },
    });
    
    await prisma.auditLog.create({
        data: {
            userId: user.id,
            action: 'PASSWORD_CHANGED',
            resourceType: 'USER',
            resourceId: user.id,
            details: { message: 'User changed their password via settings' },
            ipAddress: req.ip
        }
    });

    await sendPasswordChangedNotification(user.email, user.fullName);

    res.json(successResponse({ message: 'Password updated successfully' }));
  } catch (error) {
    next(error);
  }
});

router.post('/forgot-password', forgotPasswordLimiter, async (req, res, next) => {
    try {
        const validated = forgotPasswordSchema.parse(req.body);
        
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: validated.emailOrId },
                    { employeeId: validated.emailOrId }
                ]
            }
        });

        // Always return the same generic response to prevent account enumeration
        const genericResponse = 'If an account matches the information provided, a password reset email has been sent.';

        if (!user || !user.isActive) {
            return res.json(successResponse({ message: genericResponse }));
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Expire in 30 minutes
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

        // Invalidate previous tokens
        await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id }
        });

        await prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                tokenHash,
                expiresAt,
                requestIp: req.ip,
                userAgent: req.headers['user-agent']
            }
        });

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'PASSWORD_RESET_REQUESTED',
                resourceType: 'USER',
                resourceId: user.id,
                details: { message: 'User requested a password reset via forgot password' },
                ipAddress: req.ip
            }
        });

        await sendPasswordResetEmail(user.email, user.fullName, resetToken);

        res.json(successResponse({ message: genericResponse }));
    } catch (error) {
        next(error);
    }
});

router.post('/reset-password', resetPasswordLimiter, async (req, res, next) => {
    try {
        const validated = resetPasswordSchema.parse(req.body);
        const tokenHash = crypto.createHash('sha256').update(validated.token).digest('hex');

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { tokenHash },
            include: { user: true }
        });

        if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
            throw new AppError('Invalid or expired reset token', 400);
        }

        const newHashed = await bcrypt.hash(validated.newPassword, 10);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: {
                    password: newHashed,
                    mustChangePassword: false,
                    passwordChangedAt: new Date()
                }
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { usedAt: new Date() }
            }),
            prisma.auditLog.create({
                data: {
                    userId: resetToken.userId,
                    action: 'PASSWORD_RESET_COMPLETED',
                    resourceType: 'USER',
                    resourceId: resetToken.userId,
                    details: { message: 'User completed password reset' },
                    ipAddress: req.ip
                }
            })
        ]);

        await sendPasswordChangedNotification(resetToken.user.email, resetToken.user.fullName);

        res.json(successResponse({ message: 'Password has been successfully reset' }));
    } catch (error) {
        next(error);
    }
});

router.post('/force-change-password', async (req, res, next) => {
    try {
        const validated = forceChangePasswordSchema.parse(req.body);
        
        let decoded: any;
        try {
            decoded = jwt.verify(validated.tempToken, process.env.JWT_SECRET!);
        } catch (err) {
            throw new AppError('Invalid or expired token', 401);
        }

        if (!decoded.mustChangePassword || !decoded.id) {
            throw new AppError('Invalid token payload', 401);
        }

        const user = await prisma.user.findUnique({ where: { id: decoded.id } });
        if (!user || !user.isActive || !user.mustChangePassword) {
            throw new AppError('Password change not required or user invalid', 400);
        }

        const newHashed = await bcrypt.hash(validated.newPassword, 10);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: {
                    password: newHashed,
                    mustChangePassword: false,
                    passwordChangedAt: new Date()
                }
            }),
            prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'PASSWORD_CHANGED_MANDATORY',
                    resourceType: 'USER',
                    resourceId: user.id,
                    details: { message: 'User completed mandatory password change' },
                    ipAddress: req.ip
                }
            })
        ]);

        await sendPasswordChangedNotification(user.email, user.fullName);

        res.json(successResponse({ message: 'Password updated successfully. You can now login.' }));
    } catch (error) {
        next(error);
    }
});

export default router;