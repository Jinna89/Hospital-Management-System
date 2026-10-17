import type { Prisma } from '@prisma/client';
import { toNumber } from '../../lib/decimal';

export const labRequestInclude = {
  labTest: { select: { id: true, name: true, code: true, price: true } },
  doctor: { select: { id: true, name: true, specialty: true } },
  patient: { select: { id: true, user: { select: { name: true } } } },
  result: true,
} satisfies Prisma.LabTestRequestInclude;

export type LabRequestRow = Prisma.LabTestRequestGetPayload<{
  include: typeof labRequestInclude;
}>;

export function toLabRequestDto(row: LabRequestRow) {
  return {
    id: row.id,
    consultationId: row.consultationId,
    labTestId: row.labTestId,
    status: row.status,
    notes: row.notes,
    requestedAt: row.requestedAt,
    updatedAt: row.updatedAt,
    labTest: {
      id: row.labTest.id,
      name: row.labTest.name,
      code: row.labTest.code,
      price: toNumber(row.labTest.price),
    },
    doctor: row.doctor,
    patient: { id: row.patient.id, name: row.patient.user.name },
    resultSummary: row.result?.resultSummary ?? null,
    resultFileUrl: row.result?.resultFileUrl ?? null,
    completedAt: row.result?.completedAt ?? null,
  };
}

export function toLabTestDto(row: {
  id: string;
  name: string;
  code: string;
  description: string | null;
  price: Prisma.Decimal;
}) {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    price: toNumber(row.price),
  };
}
