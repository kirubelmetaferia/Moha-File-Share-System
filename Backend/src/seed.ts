// src/seed.ts
import { PrismaClient } from './generated/prisma';
import bcrypt from 'bcryptjs';
import { ROLES } from './constants/roles';

const prisma = new PrismaClient();

async function seed() {
    console.log('🌱 Seeding database...');
    console.log('═══════════════════════════════════════');

    try {
        // ============================================
        // 1. CREATE SUPER ADMIN
        // ============================================
        console.log('\n📋 Creating Super Admin...');
        const superAdmin = await prisma.user.upsert({
            where: { email: 'superadmin@moha.com' },
            update: {},
            create: {
                email: 'superadmin@moha.com',
                password: await bcrypt.hash('SuperAdmin123!', 10),
                fullName: 'Super Admin',
                employeeId: 'SA001',
                role: 'SUPER_ADMIN',
                isActive: true
            }
        });
        console.log('✅ Super Admin created');
        console.log(`   👤 ${superAdmin.fullName} (${superAdmin.employeeId})`);

        // ============================================
        // 2. CREATE PLANTS
        // ============================================
        console.log('\n🏭 Creating Plants...');

        const plant1 = await prisma.plant.create({
            data: {
                name: 'Main Factory',
                code: 'PLT-001',
                location: 'Addis Ababa',
                email: 'mainfactory@moha.com',
                createdBy: superAdmin.id
            }
        });
        console.log(`✅ Plant created: ${plant1.name} (${plant1.code})`);

        const plant2 = await prisma.plant.create({
            data: {
                name: 'Branch Office',
                code: 'PLT-002',
                location: 'Dire Dawa',
                email: 'branchoffice@moha.com',
                createdBy: superAdmin.id
            }
        });
        console.log(`✅ Plant created: ${plant2.name} (${plant2.code})`);

        // ============================================
        // 3. CREATE DEPARTMENTS
        // ============================================
        console.log('\n📂 Creating Departments...');

        // Departments for Plant 1
        const dept1 = await prisma.department.create({
            data: {
                name: 'Human Resources',
                code: 'DEPT-001',
                description: 'HR Department - Main Factory',
                plantId: plant1.id,
                createdBy: superAdmin.id
            }
        });
        console.log(`✅ Department created: ${dept1.name} (${dept1.code})`);

        const dept2 = await prisma.department.create({
            data: {
                name: 'Finance',
                code: 'DEPT-002',
                description: 'Finance Department - Main Factory',
                plantId: plant1.id,
                createdBy: superAdmin.id
            }
        });
        console.log(`✅ Department created: ${dept2.name} (${dept2.code})`);

        const dept3 = await prisma.department.create({
            data: {
                name: 'Information Technology',
                code: 'DEPT-003',
                description: 'IT Department - Main Factory',
                plantId: plant1.id,
                createdBy: superAdmin.id
            }
        });
        console.log(`✅ Department created: ${dept3.name} (${dept3.code})`);

        // Departments for Plant 2
        const dept4 = await prisma.department.create({
            data: {
                name: 'Sales',
                code: 'DEPT-004',
                description: 'Sales Department - Branch Office',
                plantId: plant2.id,
                createdBy: superAdmin.id
            }
        });
        // ============================================
        // 3.5 CREATE SECTIONS
        // ============================================
        console.log('\n📐 Creating Sections...');

        const sec1 = await prisma.section.create({
            data: {
                name: 'Recruitment',
                departmentId: dept1.id,
                description: 'HR Recruitment Section',
            }
        });
        console.log(`✅ Section created: ${sec1.name}`);

        const sec2 = await prisma.section.create({
            data: {
                name: 'Payroll',
                departmentId: dept2.id,
                description: 'Finance Payroll Section',
            }
        });
        console.log(`✅ Section created: ${sec2.name}`);

        // ============================================
        // 4. CREATE USERS
        // ============================================
        console.log('\n👥 Creating Users...');

        // Plant Admin for Plant 1
        const plantAdmin1 = await prisma.user.create({
            data: {
                email: 'admin@factory.moha.com',
                password: await bcrypt.hash('PlantAdmin123!', 10),
                fullName: 'Plant Admin - Main Factory',
                employeeId: 'PA001',
                plantId: plant1.id,
                role: 'PLANT_ADMIN',
                createdBy: superAdmin.id,
                isActive: true
            }
        });
        console.log(`✅ Plant Admin created: ${plantAdmin1.fullName} (${plantAdmin1.employeeId})`);

        // Plant Admin for Plant 2
        const plantAdmin2 = await prisma.user.create({
            data: {
                email: 'admin@branch.moha.com',
                password: await bcrypt.hash('PlantAdmin123!', 10),
                fullName: 'Plant Admin - Branch Office',
                employeeId: 'PA002',
                plantId: plant2.id,
                role: 'PLANT_ADMIN',
                createdBy: superAdmin.id,
                isActive: true
            }
        });
        console.log(`✅ Plant Admin created: ${plantAdmin2.fullName} (${plantAdmin2.employeeId})`);

        // Department Heads
        const deptHead1 = await prisma.user.create({
            data: {
                email: 'hrhead@factory.moha.com',
                password: await bcrypt.hash('DeptHead123!', 10),
                fullName: 'HR Department Head',
                employeeId: 'DH001',
                plantId: plant1.id,
                departmentId: dept1.id,
                role: 'DEPARTMENT_HEAD',
                createdBy: plantAdmin1.id,
                isActive: true
            }
        });
        console.log(`✅ Department Head created: ${deptHead1.fullName} (${deptHead1.employeeId})`);

        const deptHead2 = await prisma.user.create({
            data: {
                email: 'financehead@factory.moha.com',
                password: await bcrypt.hash('DeptHead123!', 10),
                fullName: 'Finance Department Head',
                employeeId: 'DH002',
                plantId: plant1.id,
                departmentId: dept2.id,
                role: 'DEPARTMENT_HEAD',
                createdBy: plantAdmin1.id,
                isActive: true
            }
        });
        console.log(`✅ Department Head created: ${deptHead2.fullName} (${deptHead2.employeeId})`);

        const deptHead3 = await prisma.user.create({
            data: {
                email: 'saleshead@branch.moha.com',
                password: await bcrypt.hash('DeptHead123!', 10),
                fullName: 'Sales Department Head',
                employeeId: 'DH003',
                plantId: plant2.id,
                departmentId: dept4.id,
                role: 'DEPARTMENT_HEAD',
                createdBy: plantAdmin2.id,
                isActive: true
            }
        });
        console.log(`✅ Department Head created: ${deptHead3.fullName} (${deptHead3.employeeId})`);

        // Employees
        const employee1 = await prisma.user.create({
            data: {
                email: 'employee1@factory.moha.com',
                password: await bcrypt.hash('Employee123!', 10),
                fullName: 'John Doe',
                employeeId: 'EMP001',
                plantId: plant1.id,
                departmentId: dept1.id,
                sectionId: sec1.id,
                role: 'EMPLOYEE',
                createdBy: deptHead1.id,
                isActive: true
            }
        });
        console.log(`✅ Employee created: ${employee1.fullName} (${employee1.employeeId})`);

        const employee2 = await prisma.user.create({
            data: {
                email: 'employee2@factory.moha.com',
                password: await bcrypt.hash('Employee123!', 10),
                fullName: 'Jane Smith',
                employeeId: 'EMP002',
                plantId: plant1.id,
                departmentId: dept2.id,
                role: 'EMPLOYEE',
                createdBy: deptHead2.id,
                isActive: true
            }
        });
        console.log(`✅ Employee created: ${employee2.fullName} (${employee2.employeeId})`);

        const employee3 = await prisma.user.create({
            data: {
                email: 'employee3@factory.moha.com',
                password: await bcrypt.hash('Employee123!', 10),
                fullName: 'Michael Johnson',
                employeeId: 'EMP003',
                plantId: plant1.id,
                departmentId: dept3.id,
                role: 'EMPLOYEE',
                createdBy: plantAdmin1.id,
                isActive: true
            }
        });
        console.log(`✅ Employee created: ${employee3.fullName} (${employee3.employeeId})`);

        const employee4 = await prisma.user.create({
            data: {
                email: 'employee4@branch.moha.com',
                password: await bcrypt.hash('Employee123!', 10),
                fullName: 'Sarah Williams',
                employeeId: 'EMP004',
                plantId: plant2.id,
                departmentId: dept4.id,
                role: 'EMPLOYEE',
                createdBy: deptHead3.id,
                isActive: true
            }
        });
        console.log(`✅ Employee created: ${employee4.fullName} (${employee4.employeeId})`);

        // Viewer
        const viewer = await prisma.user.create({
            data: {
                email: 'viewer@factory.moha.com',
                password: await bcrypt.hash('Viewer123!', 10),
                fullName: 'External Viewer',
                employeeId: 'VW001',
                plantId: plant1.id,
                departmentId: dept1.id,
                role: 'VIEWER',
                createdBy: superAdmin.id,
                isActive: true
            }
        });
        console.log(`✅ Viewer created: ${viewer.fullName} (${viewer.employeeId})`);

        // ============================================
        // 4.5 CREATE FOLDERS
        // ============================================
        console.log('\n📁 Creating Folders...');

        const folder1 = await prisma.folder.create({
            data: {
                name: 'Public Policies',
                plantId: plant1.id,
                departmentId: dept1.id,
                sectionId: sec1.id,
                createdById: deptHead1.id
            }
        });
        console.log(`✅ Folder created: ${folder1.name}`);

        const folder2 = await prisma.folder.create({
            data: {
                name: 'Q1 Reports',
                plantId: plant1.id,
                departmentId: dept2.id,
                sectionId: sec2.id,
                createdById: deptHead2.id
            }
        });
        console.log(`✅ Folder created: ${folder2.name}`);

        // ============================================
        // 5. CREATE SAMPLE FILES
        // ============================================
        console.log('\n📄 Creating sample files...');

        // Note: In a real scenario, you would upload actual files.
        // These are placeholder entries for demonstration.

        const file1 = await prisma.file.create({
            data: {
                fileName: 'employee-handbook.pdf',
                originalName: 'Employee_Handbook_2026.pdf',
                fileSize: 2457600, // 2.4MB
                fileType: 'pdf',
                mimeType: 'application/pdf',
                filePath: 'sample-files/employee-handbook.pdf',
                description: 'Employee Handbook 2026',
                category: 'DOCUMENT',
                plantId: plant1.id,
                departmentId: dept1.id,
                sectionId: sec1.id,
                folderId: folder1.id,
                uploadedById: deptHead1.id
            }
        });
        console.log(`✅ Sample file created: ${file1.fileName}`);

        const file2 = await prisma.file.create({
            data: {
                fileName: 'financial-report-q1.xlsx',
                originalName: 'Financial_Report_Q1_2026.xlsx',
                fileSize: 512000, // 512KB
                fileType: 'xlsx',
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                filePath: 'sample-files/financial-report-q1.xlsx',
                description: 'Q1 Financial Report 2026',
                category: 'SPREADSHEET',
                plantId: plant1.id,
                departmentId: dept2.id,
                sectionId: sec2.id,
                folderId: folder2.id,
                uploadedById: deptHead2.id
            }
        });
        console.log(`✅ Sample file created: ${file2.fileName}`);

        const file3 = await prisma.file.create({
            data: {
                fileName: 'project-presentation.pptx',
                originalName: 'Project_Presentation_2026.pptx',
                fileSize: 1536000, // 1.5MB
                fileType: 'pptx',
                mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                filePath: 'sample-files/project-presentation.pptx',
                description: 'Q2 Project Presentation',
                category: 'PRESENTATION',
                plantId: plant2.id,
                departmentId: dept4.id,
                uploadedById: deptHead3.id
            }
        });
        console.log(`✅ Sample file created: ${file3.fileName}`);

        // ============================================
        // 6. CREATE FILE SHARES
        // ============================================
        console.log('\n🔗 Creating file shares...');

        // Share file1 (Employee Handbook) with plant
        const share1 = await prisma.fileShare.create({
            data: {
                fileId: file1.id,
                sharedBy: deptHead1.id,
                sharedWithPlantId: plant1.id,
                permission: 'VIEW',
                isActive: true
            }
        });
        console.log(`✅ File shared with plant: ${file1.fileName}`);

        // Share file2 (Financial Report) with specific department
        const share2 = await prisma.fileShare.create({
            data: {
                fileId: file2.id,
                sharedBy: deptHead2.id,
                sharedWithDeptId: dept2.id,
                permission: 'VIEW',
                isActive: true
            }
        });
        console.log(`✅ File shared with department: ${file2.fileName}`);

        // Share file3 with specific user
        const share3 = await prisma.fileShare.create({
            data: {
                fileId: file3.id,
                sharedBy: deptHead3.id,
                sharedWithUserId: employee4.id,
                permission: 'MODIFY',
                isActive: true
            }
        });
        console.log(`✅ File shared with user: ${file3.fileName}`);

        // ============================================
        // 7. CREATE NOTIFICATIONS
        // ============================================
        console.log('\n🔔 Creating notifications...');

        await prisma.notification.createMany({
            data: [
                {
                    userId: employee1.id,
                    title: 'Welcome to the system',
                    message: 'Your account has been created successfully. You can now upload and share files.',
                    type: 'SYSTEM_UPDATE',
                    isRead: false
                },
                {
                    userId: employee2.id,
                    title: 'New file shared',
                    message: `A new file "${file2.fileName}" has been shared with your department.`,
                    type: 'FILE_SHARED',
                    link: `/files/${file2.id}`,
                    isRead: false
                },
                {
                    userId: employee4.id,
                    title: 'New file shared with you',
                    message: `A new file "${file3.fileName}" has been shared with you.`,
                    type: 'FILE_SHARED',
                    link: `/files/${file3.id}`,
                    isRead: false
                }
            ]
        });
        console.log('✅ Notifications created');

        // ============================================
        // 8. SUMMARY
        // ============================================
        console.log('\n═══════════════════════════════════════');
        console.log('✅ Seed completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`   🏭 Plants: 2`);
        console.log(`   📂 Departments: 4`);
        console.log(`   👥 Users: 9 (1 Super Admin, 2 Plant Admins, 3 Dept Heads, 3 Employees, 1 Viewer)`);
        console.log(`   📄 Files: 3`);
        console.log(`   🔗 File Shares: 3`);
        console.log(`   🔔 Notifications: 3`);

        console.log('\n📋 Login Credentials:');
        console.log('   🟢 Super Admin: superadmin@moha.com / SuperAdmin123!');
        console.log('   🟢 Plant Admin 1: admin@factory.moha.com / PlantAdmin123!');
        console.log('   🟢 Plant Admin 2: admin@branch.moha.com / PlantAdmin123!');
        console.log('   🟢 Dept Head HR: hrhead@factory.moha.com / DeptHead123!');
        console.log('   🟢 Dept Head Finance: financehead@factory.moha.com / DeptHead123!');
        console.log('   🟢 Dept Head Sales: saleshead@branch.moha.com / DeptHead123!');
        console.log('   🟢 Employee 1: employee1@factory.moha.com / Employee123!');
        console.log('   🟢 Employee 2: employee2@factory.moha.com / Employee123!');
        console.log('   🟢 Employee 3: employee3@factory.moha.com / Employee123!');
        console.log('   🟢 Employee 4: employee4@branch.moha.com / Employee123!');
        console.log('   🟢 Viewer: viewer@factory.moha.com / Viewer123!');

    } catch (error) {
        console.error('\n❌ Seed failed:', error);
        throw error;
    }
}

// ============================================
// EXECUTE SEED
// ============================================
seed()
    .catch((error) => {
        console.error('❌ Seed process failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        console.log('\n🔌 Database disconnected');
    });