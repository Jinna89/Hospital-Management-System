import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { toNumber } from '../../lib/decimal';
import { formatDateOnly, hospitalToday, parseDateOnly, slotStartsAt } from '../../lib/schedule';
import { AppError } from '../../utils/AppError';
import type { RevenueReportQuery } from './analytics.validation';

const DEFAULT_REPORT_DAYS = 30;
const MAX_REPORT_DAYS = 366;
const DAY_MS = 86_400_000;

const offsetMinutes = () => env.HOSPITAL_UTC_OFFSET_MINUTES;

/** The calendar day (hospital time) an instant falls on, as YYYY-MM-DD. */
function hospitalDay(instant: Date): string {
  return new Date(instant.getTime() + offsetMinutes() * 60_000).toISOString().slice(0, 10);
}

export const analyticsService = {
  async dashboardStats() {
    const today = hospitalToday(new Date(), offsetMinutes());
    const monthStart = slotStartsAt(`${today.slice(0, 7)}-01`, '00:00', offsetMinutes());

    const [patients, doctors, appointments, todays, monthlyRevenue, paid, unsuccessful] =
      await Promise.all([
        prisma.user.count({ where: { role: 'PATIENT', deletedAt: null } }),
        prisma.doctor.count({ where: { deletedAt: null } }),
        prisma.appointment.count(),
        prisma.appointment.count({ where: { appointmentDate: parseDateOnly(today) } }),
        prisma.payment.aggregate({
          where: { status: 'PAID', paidAt: { gte: monthStart } },
          _sum: { amount: true },
        }),
        prisma.payment.count({ where: { status: 'PAID' } }),
        prisma.payment.count({ where: { status: { in: ['FAILED', 'CANCELLED'] } } }),
      ]);

    const attempted = paid + unsuccessful;
    return {
      totalPatients: patients,
      totalDoctors: doctors,
      totalAppointments: appointments,
      todaysAppointments: todays,
      monthlyRevenue: toNumber(monthlyRevenue._sum.amount ?? 0),
      // A 0..1 fraction of settled payment attempts (pending ones are not yet a verdict).
      paymentSuccessRate: attempted === 0 ? 0 : Number((paid / attempted).toFixed(4)),
    };
  },

  /** Revenue per hospital-local day from PAID payments; days without revenue are omitted. */
  async revenueReport(query: RevenueReportQuery) {
    const today = hospitalToday(new Date(), offsetMinutes());
    const to = query.to ?? today;
    const from =
      query.from ??
      formatDateOnly(new Date(parseDateOnly(to).getTime() - DEFAULT_REPORT_DAYS * DAY_MS));

    const days = (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / DAY_MS;
    if (days > MAX_REPORT_DAYS) {
      throw AppError.unprocessable(`Report range cannot exceed ${MAX_REPORT_DAYS} days`);
    }

    const payments = await prisma.payment.findMany({
      where: {
        status: 'PAID',
        paidAt: {
          gte: slotStartsAt(from, '00:00', offsetMinutes()),
          lt: new Date(slotStartsAt(to, '00:00', offsetMinutes()).getTime() + DAY_MS),
        },
      },
      select: { amount: true, paidAt: true },
    });

    const byDay = new Map<string, { revenue: number; payments: number }>();
    for (const payment of payments) {
      if (!payment.paidAt) continue;
      const key = hospitalDay(payment.paidAt);
      const bucket = byDay.get(key) ?? { revenue: 0, payments: 0 };
      bucket.revenue += toNumber(payment.amount);
      bucket.payments += 1;
      byDay.set(key, bucket);
    }

    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, bucket]) => ({ date, ...bucket }));
  },
};
