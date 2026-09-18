import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { ROLE_PERMISSIONS, Role } from '../constants/roles';
import { PermissionLevel } from '../generated/prisma';
import { permissionService } from '../services/permissionService';

/**
 * Checks if the user has a global generic role permission (legacy)
 */
export const checkPermission = (requiredPermission: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole = req.user.role as Role;
        
        if (userRole === 'SUPER_ADMIN') {
            return next();
        }

        const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
        if (rolePermissions.includes('*') || rolePermissions.includes(requiredPermission as any)) {
            return next();
        }

        return res.status(403).json({
            error: 'Insufficient permissions',
            required: requiredPermission,
            current: userRole
        });
    };
};

/**
 * Checks if a user has a specific required permission level on a given File or Folder
 */
export const requirePermission = (resourceType: 'FILE' | 'FOLDER', requiredPermission: PermissionLevel) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const resourceId = req.params.id || req.body[`${resourceType.toLowerCase()}Id`] || (resourceType === 'FOLDER' && req.body.parentFolderId);
            
            if (!resourceId) {
                // If creating a file/folder at the root, check if user can manage the plant/dept/section
                if (requiredPermission === 'UPLOAD') {
                    // Often handled in the controller logic itself for root level uploads
                    return next();
                }
                return res.status(400).json({ error: 'Resource ID required for authorization' });
            }

            const hasAccess = await permissionService.hasPermission(req.user.id, resourceId, resourceType, requiredPermission);

            if (hasAccess) {
                return next();
            }

            return res.status(403).json({
                error: `Access denied. Requires ${requiredPermission} permission on this ${resourceType}.`
            });
        } catch (error) {
            next(error);
        }
    };
};

export const checkResourceAccess = (resourceType: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (req.user.role === 'SUPER_ADMIN') {
            return next();
        }
        
        // This is a legacy fallback. Prefer requirePermission going forward.
        return next();
    };
};