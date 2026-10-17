import type { DoctorLeave, DoctorSchedule } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../utils/AppError';
import { recordAudit } from '../../lib/audit';
import { getDaySlots } from '../../lib/availability';
import type { RequestMeta } from '../../lib/request';
import {
  assertValidWindow,
  formatDateOnly,
  hospitalToday,
  parseDateOnly,
  windowsOverlap,
} from '../../lib/schedule';
import { bookableDoctorWhere } from '../doctors/doctors.queries';
import type {
  CreateLeaveInput,
  CreateScheduleInput,
  UpdateScheduleInput,
} from './schedules.validation';

function toScheduleDto(schedule: DoctorSchedule) {
  return {
    id: schedule.id,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    consultationDurationMins: schedule.consultationDurationMins,
    breakStartTime: schedule.breakStartTime,
    breakEndTime: schedule.breakEndTime,
    isActive: schedule.isActive,
  };
}

function toLeaveDto(leave: DoctorLeave) {
  return {
    id: leave.id,
    startDate: formatDateOnly(leave.startDate),
    endDate: formatDateOnly(leave.endDate),
    reason: leave.reason,
  };
}

async function requireDoctor(userId: string) {
  const doctor = await prisma.doctor.findFirst({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  if (!doctor) throw AppError.notFound('Doctor profile not found');
  return doctor;
}

async function assertNoOverlap(
  doctorId: string,
  candidate: Pick<DoctorSchedule, 'dayOfWeek' | 'startTime' | 'endTime'>,
  excludeId?: string,
) {
  const sameDay = await prisma.doctorSchedule.findMany({
    where: {
      doctorId,
      dayOfWeek: candidate.dayOfWeek,
      isActive: true,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
  });
  const clash = sameDay.find((existing) =>
    windowsOverlap(
      { ...existing },
      { ...candidate, consultationDurationMins: existing.consultationDurationMins },
    ),
  );
  if (clash) {
    throw AppError.conflict(
      `Overlaps your existing ${clash.dayOfWeek} schedule (${clash.startTime}–${clash.endTime})`,
    );
  }
}

export const schedulesService = {
  async listSchedules(userId: string) {
    const doctor = await requireDoctor(userId);
    const rows = await prisma.doctorSchedule.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return rows.map(toScheduleDto);
  },

  async createSchedule(userId: string, input: CreateScheduleInput, meta: RequestMeta) {
    const doctor = await requireDoctor(userId);
    assertValidWindow(input);
    await assertNoOverlap(doctor.id, input);

    return prisma.$transaction(async (tx) => {
      const created = await tx.doctorSchedule.create({ data: { ...input, doctorId: doctor.id } });
      await recordAudit(tx, {
        actorId: userId,
        action: 'SCHEDULE_CREATED',
        entityType: 'DoctorSchedule',
        entityId: created.id,
        newValue: toScheduleDto(created),
        meta,
      });
      return toScheduleDto(created);
    });
  },

  async updateSchedule(userId: string, id: string, input: UpdateScheduleInput, meta: RequestMeta) {
    const doctor = await requireDoctor(userId);
    const existing = await prisma.doctorSchedule.findFirst({ where: { id, doctorId: doctor.id } });
    if (!existing) throw AppError.notFound('Schedule not found');

    const merged = { ...existing, ...input };
    assertValidWindow(merged);
    if (merged.isActive) await assertNoOverlap(doctor.id, merged, id);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.doctorSchedule.update({ where: { id }, data: input });
      await recordAudit(tx, {
        actorId: userId,
        action: 'SCHEDULE_UPDATED',
        entityType: 'DoctorSchedule',
        entityId: id,
        oldValue: toScheduleDto(existing),
        newValue: toScheduleDto(updated),
        meta,
      });
      return toScheduleDto(updated);
    });
  },

  async removeSchedule(userId: string, id: string, meta: RequestMeta) {
    const doctor = await requireDoctor(userId);
    const existing = await prisma.doctorSchedule.findFirst({ where: { id, doctorId: doctor.id } });
    if (!existing) throw AppError.notFound('Schedule not found');

    await prisma.$transaction(async (tx) => {
      await tx.doctorSchedule.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: userId,
        action: 'SCHEDULE_DELETED',
        entityType: 'DoctorSchedule',
        entityId: id,
        oldValue: toScheduleDto(existing),
        meta,
      });
    });
  },

  async listLeaves(userId: string) {
    const doctor = await requireDoctor(userId);
    const rows = await prisma.doctorLeave.findMany({
      where: { doctorId: doctor.id },
      orderBy: { startDate: 'asc' },
    });
    return rows.map(toLeaveDto);
  },

  async createLeave(userId: string, input: CreateLeaveInput, meta: RequestMeta) {
    const doctor = await requireDoctor(userId);
    const startDate = parseDateOnly(input.startDate);
    const endDate = parseDateOnly(input.endDate);

    const today = hospitalToday(new Date(), env.HOSPITAL_UTC_OFFSET_MINUTES);
    if (input.startDate < today) throw AppError.unprocessable('Leave cannot start in the past');

    const overlapping = await prisma.doctorLeave.findFirst({
      where: { doctorId: doctor.id, startDate: { lte: endDate }, endDate: { gte: startDate } },
    });
    if (overlapping) throw AppError.conflict('This overlaps a leave period you already have');

    return prisma.$transaction(async (tx) => {
      const created = await tx.doctorLeave.create({
        data: { doctorId: doctor.id, startDate, endDate, reason: input.reason },
      });
      await recordAudit(tx, {
        actorId: userId,
        action: 'LEAVE_CREATED',
        entityType: 'DoctorLeave',
        entityId: created.id,
        newValue: toLeaveDto(created),
        meta,
      });
      return toLeaveDto(created);
    });
  },

  async removeLeave(userId: string, id: string, meta: RequestMeta) {
    const doctor = await requireDoctor(userId);
    const existing = await prisma.doctorLeave.findFirst({ where: { id, doctorId: doctor.id } });
    if (!existing) throw AppError.notFound('Leave not found');

    await prisma.$transaction(async (tx) => {
      await tx.doctorLeave.delete({ where: { id } });
      await recordAudit(tx, {
        actorId: userId,
        action: 'LEAVE_DELETED',
        entityType: 'DoctorLeave',
        entityId: id,
        oldValue: toLeaveDto(existing),
        meta,
      });
    });
  },

  async availableSlots(doctorId: string, date: string) {
    const doctor = await prisma.doctor.findFirst({
      where: { id: doctorId, ...bookableDoctorWhere },
      select: { id: true },
    });
    if (!doctor) throw AppError.notFound('Doctor not found or not accepting appointments');
    return getDaySlots(prisma, doctor.id, date);
  },
};
