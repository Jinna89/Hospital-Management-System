import { beforeEach, describe, expect, it } from 'vitest';
import { api, API } from './helpers/app';
import { prisma, resetDb } from './helpers/db';
import { bearer, createPatient } from './helpers/factories';

async function seedNotifications(userId: string, count: number) {
  await prisma.notification.createMany({
    data: Array.from({ length: count }, (_, i) => ({
      userId,
      type: 'GENERAL' as const,
      title: `Title ${i}`,
      message: `Message ${i}`,
    })),
  });
}

describe('notifications', () => {
  beforeEach(resetDb);

  it('lists only the caller’s notifications, newest first, with a read flag', async () => {
    const me = await createPatient();
    const other = await createPatient();
    await seedNotifications(me.user.id, 2);
    await seedNotifications(other.user.id, 3);

    const res = await api().get(`${API}/notifications`).set(bearer(me.token));

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data[0]).toMatchObject({ read: false, type: 'GENERAL' });
  });

  it('reports and clears the unread count', async () => {
    const me = await createPatient();
    await seedNotifications(me.user.id, 3);

    const before = await api().get(`${API}/notifications/unread-count`).set(bearer(me.token));
    expect(before.body.data.count).toBe(3);

    const readAll = await api().patch(`${API}/notifications/read-all`).set(bearer(me.token));
    expect(readAll.body.data.updated).toBe(3);

    const after = await api().get(`${API}/notifications/unread-count`).set(bearer(me.token));
    expect(after.body.data.count).toBe(0);
  });

  it('marks a single notification read and filters by read state', async () => {
    const me = await createPatient();
    await seedNotifications(me.user.id, 2);
    const [first] = await prisma.notification.findMany({ where: { userId: me.user.id } });

    const res = await api().patch(`${API}/notifications/${first.id}/read`).set(bearer(me.token));
    expect(res.body.data.read).toBe(true);

    const unread = await api().get(`${API}/notifications?isRead=false`).set(bearer(me.token));
    expect(unread.body.meta.total).toBe(1);
  });

  it('cannot mark someone else’s notification as read', async () => {
    const me = await createPatient();
    const other = await createPatient();
    await seedNotifications(other.user.id, 1);
    const [theirs] = await prisma.notification.findMany({ where: { userId: other.user.id } });

    const res = await api().patch(`${API}/notifications/${theirs.id}/read`).set(bearer(me.token));

    expect(res.status).toBe(404);
    const row = await prisma.notification.findUniqueOrThrow({ where: { id: theirs.id } });
    expect(row.isRead).toBe(false);
  });
});
