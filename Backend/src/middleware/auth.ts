import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { Role } from '../constants/roles';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                employeeId: string;
                role: Role;
                plantId?: string;
                departmentId?: string;
                sectionId?: string;
            };
        }
    }
}

export interface AuthRequest extends Request {
    user: {
        id: string;
        employeeId: string;
        role: Role;
        plantId?: string;
        departmentId?: string;
        sectionId?: string;
    };
}

export const authenticate = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
            id: string;
            employeeId: string;
            role: Role;
        };

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                employeeId: true,
                role: true,
                plantId: true,
                departmentId: true,
                sectionId: true,
                isActive: true
            }
        });

        if (!user || !user.isActive) {
            res.status(401).json({ error: 'User not found or inactive' });
            return;
        }

        req.user = {
            id: user.id,
            employeeId: user.employeeId,
            role: user.role as Role,
            plantId: user.plantId || undefined,
            departmentId: user.departmentId || undefined,
            sectionId: user.sectionId || undefined
        };
        
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        res.status(500).json({ error: 'Authentication failed' });
    }
};

export const authorize = (...roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }
        
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ 
                error: 'Insufficient permissions',
                required: roles,
                current: req.user.role
            });
            return;
        }
        
        next();
    };
};

export const requirePlantAccess = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const plantId = req.params.plantId || req.body.plantId;
    
    if (!plantId) {
        res.status(400).json({ error: 'Plant ID required' });
        return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
    }

    if (req.user.plantId !== plantId) {
        res.status(403).json({ error: 'Access denied to this plant' });
        return;
    }

    next();
};

export const requireDepartmentAccess = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }

    const departmentId = req.params.departmentId || req.body.departmentId;
    
    if (!departmentId) {
        res.status(400).json({ error: 'Department ID required' });
        return;
    }

    if (req.user.role === 'SUPER_ADMIN') {
        next();
        return;
    }

    if (req.user.role === 'PLANT_ADMIN') {
        const department = await prisma.department.findUnique({
            where: { id: departmentId },
            select: { plantId: true }
        });
        
        if (department && department.plantId === req.user.plantId) {
            next();
            return;
        }
    }

    if (req.user.role === 'DEPARTMENT_HEAD' && req.user.departmentId === departmentId) {
        next();
        return;
    }

    res.status(403).json({ error: 'Access denied to this department' });
};