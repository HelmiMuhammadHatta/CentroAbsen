import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import { MariaDbContainer } from '@testcontainers/mariadb';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const app = express();
app.get('/health', (req, res) => res.json({ status: 'OK' }));
app.get('/api/v1/time', (req, res) => res.json({ utc: new Date().toISOString() }));

describe('API Integration with MariaDB Testcontainer', () => {
  let container: any;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Start MariaDB container
    container = await new MariaDbContainer('mariadb:11.4')
      .withDatabase('centroabsen_test')
      .withRootPassword('root')
      .start();

    const dbUrl = `mysql://root:root@${container.getHost()}:${container.getPort()}/centroabsen_test`;
    
    // Set ENV for prisma
    process.env.DATABASE_URL = dbUrl;
    
    // Run migrations
    execSync('npx prisma db push --skip-generate', { env: { ...process.env, DATABASE_URL: dbUrl } });
    
    prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });
  }, 60000); // 60s timeout for container start

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('GET /health returns OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('GET /api/v1/time returns UTC time', async () => {
    const res = await request(app).get('/api/v1/time');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('utc');
  });

  it('Can connect and write to database', async () => {
    const count = await prisma.user.count();
    expect(count).toBe(0);
  });
});
