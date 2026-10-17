// Environment so `src/config/env.ts` validates under test. DATABASE_URL points
// at the embedded PostgreSQL started in global-setup.ts.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54330/hms_test';
process.env.DATABASE_POOL_MAX = '5';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-0123456789';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-0123456789';
process.env.SSLCOMMERZ_STORE_ID = 'teststore';
process.env.SSLCOMMERZ_STORE_PASSWORD = 'teststore@ssl';
process.env.API_PUBLIC_URL = 'http://localhost:5000';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.RATE_LIMIT_MAX = '100000';
process.env.HOSPITAL_UTC_OFFSET_MINUTES = '360';
