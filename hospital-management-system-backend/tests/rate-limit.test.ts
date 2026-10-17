import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildLimiter } from '../src/middlewares/rate-limit.middleware';

function appWithLimit(max: number) {
  const app = express();
  app.use(buildLimiter(60_000, max, 'Slow down.'));
  app.get('/', (_req, res) => res.json({ ok: true }));
  return app;
}

describe('rate limiting', () => {
  it('answers with the standard error shape once the limit is exceeded', async () => {
    const app = appWithLimit(2);

    expect((await request(app).get('/')).status).toBe(200);
    expect((await request(app).get('/')).status).toBe(200);
    const blocked = await request(app).get('/');

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ success: false, message: 'Slow down.', errors: [] });
    expect(blocked.headers).toHaveProperty('ratelimit-remaining', '0');
  });
});
