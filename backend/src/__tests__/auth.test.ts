import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Auth API', () => {
    const testUser = {
        email: 'test_integration@applyops.com',
        password: 'password123',
        name: 'Test Integration'
    };

    beforeAll(async () => {
        // Clean up test user if exists
        try {
            await prisma.user.deleteMany({ where: { email: testUser.email } });
        } catch (e) {
            console.log('Cleanup error (ignored)', e);
        }
    });

    afterAll(async () => {
        try {
            await prisma.user.deleteMany({ where: { email: testUser.email } });
            await prisma.$disconnect();
        } catch (e) {
            console.log('Teardown error', e);
        }
    });

    it('should register a new user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should fail to register duplicate user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        expect(res.status).toBe(400); // Or 409 depending on implementation, usually 400 for 'User already exists'
        expect(res.body.message).toMatch(/registered/i);
    });

    it('should login the user', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: testUser.password
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({
                email: testUser.email,
                password: 'wrongpassword'
            });

        expect(res.status).toBe(401);
    });
});
