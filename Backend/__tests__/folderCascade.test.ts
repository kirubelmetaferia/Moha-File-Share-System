import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Folder Deletion Cascade', () => {
    let token: string;
    let userId: string;

    beforeAll(async () => {
        // Create user
        const hashedPassword = await bcrypt.hash('password123', 10);
        const user = await prisma.user.create({
            data: {
                email: 'cascade_test@moha.local',
                password: hashedPassword,
                fullName: 'Cascade Test User',
                employeeId: 'CAS123',
                role: 'ADMIN'
            }
        });
        userId = user.id;

        token = jwt.sign(
            { id: user.id, employeeId: user.employeeId, role: user.role },
            process.env.JWT_SECRET || 'dev_secret_change_me',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        // Clean up
        await prisma.auditLog.deleteMany({ where: { userId } });
        await prisma.file.deleteMany({ where: { uploadedById: userId } });
        await prisma.folder.deleteMany({ where: { createdById: userId } });
        await prisma.user.delete({ where: { id: userId } });
    });

    it('should soft-delete a folder, all its subfolders, and files inside them', async () => {
        // 1. Create top-level folder
        const topRes = await request(app)
            .post('/api/folders')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'TopFolder' });
        
        expect(topRes.status).toBe(201);
        const topFolderId = topRes.body.data.id;

        // 2. Create subfolder inside top folder
        const subRes = await request(app)
            .post('/api/folders')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'SubFolder', parentFolderId: topFolderId });
            
        expect(subRes.status).toBe(201);
        const subFolderId = subRes.body.data.id;

        // 3. Create a file inside the subfolder
        const fileRes = await prisma.file.create({
            data: {
                fileName: 'cascade_test_file.txt',
                originalName: 'cascade_test_file.txt',
                fileSize: 1024,
                fileType: 'txt',
                mimeType: 'text/plain',
                filePath: '/tmp/cascade_test_file.txt',
                uploadedById: userId,
                folderId: subFolderId,
            }
        });
        const fileId = fileRes.id;

        // 4. Soft-delete the top-level folder
        const deleteRes = await request(app)
            .delete(`/api/folders/${topFolderId}`)
            .set('Authorization', `Bearer ${token}`);
            
        expect(deleteRes.status).toBe(200);

        // 5. Assert top folder is soft deleted
        const topCheck = await prisma.folder.findUnique({ where: { id: topFolderId } });
        expect(topCheck?.isDeleted).toBe(true);

        // 6. Assert subfolder is soft deleted
        const subCheck = await prisma.folder.findUnique({ where: { id: subFolderId } });
        expect(subCheck?.isDeleted).toBe(true);

        // 7. Assert file is soft deleted
        const fileCheck = await prisma.file.findUnique({ where: { id: fileId } });
        expect(fileCheck?.isDeleted).toBe(true);

        // 8. Assert subfolder is not returned in listing
        const listRes = await request(app)
            .get(`/api/folders?parentFolderId=${topFolderId}`)
            .set('Authorization', `Bearer ${token}`);
            
        const returnedIds = listRes.body.data.map((f: any) => f.id);
        expect(returnedIds).not.toContain(subFolderId);
    });
});
