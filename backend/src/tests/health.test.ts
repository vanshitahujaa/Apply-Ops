import request from 'supertest';
import app from '../app';
import { describe, it, expect } from 'vitest';

describe('Health Check', () => {
    it('should return 200 OK', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        // Assuming the root route returns "ApplyOps API Running" or similar
        // If not, we might need to adjust the expectation or the route
    });
});
