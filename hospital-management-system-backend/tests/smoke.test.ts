import { beforeEach, describe, expect, it } from 'vitest';
import { api, API } from './helpers/app';
import { resetDb } from './helpers/db';
import { bearer, createPatient } from './helpers/factories';

describe('test harness', () => {
  beforeEach(resetDb);

  it('boots the app against the migrated database', async () => {
    const { token } = await createPatient();
    const res = await api().get(`${API}/users/me`).set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('PATIENT');
  });

  it('returns the structured 404 for unknown routes', async () => {
    const res = await api().get(`${API}/nope`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, errors: [] });
  });
});
