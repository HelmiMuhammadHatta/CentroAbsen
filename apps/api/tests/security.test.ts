import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import { requireAuth, requireCsrf } from '../src/middlewares/auth.middleware';
import { AttendanceController } from '../src/controllers/attendance.controller';
import { userRateLimit, ipRateLimit } from '../src/middlewares/rateLimit.middleware';

describe('Security & Privacy Middleware Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use(ipRateLimit(300, 60 * 1000));
    app.use(requireCsrf);

    // Protected photo route
    app.get('/api/v1/attendances/:id/photo', requireAuth, AttendanceController.getPhoto);

    // Test mutation route
    app.post('/api/v1/test-mutation', (req, res) => {
      res.json({ success: true });
    });

    // Rate limited submit route
    app.post('/api/v1/test-rate-limit', userRateLimit(2, 60 * 1000), (req, res) => {
      res.json({ success: true });
    });
  });

  it('should reject photo access without authentication (401)', async () => {
    const res = await request(app).get('/api/v1/attendances/non-existent-id/photo');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Token tidak tersedia');
  });

  it('should reject data mutation without CSRF header (403)', async () => {
    const res = await request(app).post('/api/v1/test-mutation').send({ data: 1 });
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('CSRF Protection');
  });

  it('should allow data mutation when X-CSRF-Token header is provided', async () => {
    const res = await request(app)
      .post('/api/v1/test-mutation')
      .set('X-CSRF-Token', '1')
      .send({ data: 1 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should enforce user rate limit when threshold exceeded (429)', async () => {
    // First 2 requests should pass
    const r1 = await request(app).post('/api/v1/test-rate-limit').set('X-CSRF-Token', '1');
    expect(r1.status).toBe(200);

    const r2 = await request(app).post('/api/v1/test-rate-limit').set('X-CSRF-Token', '1');
    expect(r2.status).toBe(200);

    // 3rd request should be blocked by user rate limit
    const r3 = await request(app).post('/api/v1/test-rate-limit').set('X-CSRF-Token', '1');
    expect(r3.status).toBe(429);
    expect(r3.body.error).toContain('Terlalu banyak permintaan');
  });
});
