/// <reference types="jest" />
import { prisma } from '../config/database';

beforeAll(async () => {
    // Setup before tests
});

afterAll(async () => {
    await prisma.$disconnect();
});
