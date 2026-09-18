import { permissionService } from '../services/permissionService';
import { prisma } from '../config/database';

jest.mock('../config/database', () => ({
    prisma: {
        file: {
            findUnique: jest.fn(),
        },
        folder: {
            findUnique: jest.fn(),
        },
        department: {
            findUnique: jest.fn(),
        },
        plant: {
            findUnique: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
        },
        fileShare: {
            findMany: jest.fn(),
        }
    }
}));

describe('PermissionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getEffectivePermission', () => {
        it('should return SUPER_ADMIN permission regardless of shares', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'SUPER_ADMIN', id: '1' });
            
            const perm = await permissionService.getEffectivePermission('1', 'file1', 'FILE');
            expect(perm).toBe('UPLOAD');
        });

        it('should return UPLOAD if user is the creator of the resource', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', id: '2' });
            (prisma.file.findUnique as jest.Mock).mockResolvedValue({ id: 'file1', uploadedById: '2' });
            
            const perm = await permissionService.getEffectivePermission('2', 'file1', 'FILE');
            expect(perm).toBe('UPLOAD');
        });

        it('should correctly evaluate direct file shares', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', id: '3' });
            
            // Mock file with shares included
            (prisma.file.findUnique as jest.Mock).mockResolvedValue({ 
                id: 'file1', 
                uploadedById: '99', 
                folderId: null,
                shares: [
                    { sharedWithUserId: '3', permission: 'DOWNLOAD', isOverride: false }
                ]
            });
            
            const perm = await permissionService.getEffectivePermission('3', 'file1', 'FILE');
            expect(perm).toBe('DOWNLOAD');
        });

        it('should correctly prioritize folder share overrides', async () => {
            (prisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', id: '4' });
            // File in folder
            (prisma.file.findUnique as jest.Mock).mockResolvedValue({ 
                id: 'f1', 
                uploadedById: '99', 
                folderId: 'folder1',
                shares: [
                    { sharedWithUserId: '4', permission: 'VIEW', isOverride: false }
                ]
            });
            // Folder
            (prisma.folder.findUnique as jest.Mock).mockResolvedValue({ 
                id: 'folder1', 
                createdById: '99', 
                parentFolderId: null,
                shares: [
                    { sharedWithUserId: '4', permission: 'MODIFY', isOverride: true }
                ]
            });
                
            const perm = await permissionService.getEffectivePermission('4', 'f1', 'FILE');
            expect(perm).toBe('MODIFY');
        });
    });

    describe('hasPermission', () => {
        it('should return true if effective permission allows requested capability', async () => {
            jest.spyOn(permissionService, 'getEffectivePermission').mockResolvedValue('MODIFY');
            
            // MODIFY allows VIEW, DOWNLOAD, MODIFY_ONLINE, MODIFY
            const result = await permissionService.hasPermission('1', 'f1', 'FILE', 'DOWNLOAD');
            expect(result).toBe(true);
        });

        it('should return false if effective permission does not allow requested capability', async () => {
            jest.spyOn(permissionService, 'getEffectivePermission').mockResolvedValue('VIEW');
            
            // VIEW does not allow DELETE
            const result = await permissionService.hasPermission('1', 'f1', 'FILE', 'DELETE');
            expect(result).toBe(false);
        });
        
        it('should return false if null (no permission)', async () => {
            jest.spyOn(permissionService, 'getEffectivePermission').mockResolvedValue(null);
            
            const result = await permissionService.hasPermission('1', 'f1', 'FILE', 'VIEW');
            expect(result).toBe(false);
        });
    });
});
