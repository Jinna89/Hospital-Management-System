import { prisma } from '../../config/database';
import { AppError } from '../../utils/AppError';
import { recordAudit } from '../../lib/audit';
import type { RequestMeta } from '../../lib/request';
import type { CreateDepartmentInput, UpdateDepartmentInput } from './departments.validation';

function toDto(department: {
  id: string;
  name: string;
  description: string | null;
  status: boolean;
}) {
  return {
    id: department.id,
    name: department.name,
    description: department.description,
    status: department.status,
  };
}

async function findActive(id: string) {
  const department = await prisma.department.findFirst({ where: { id, deletedAt: null } });
  if (!department) throw AppError.notFound('Department not found');
  return department;
}

export const departmentsService = {
  async list(options: { includeInactive: boolean }) {
    const departments = await prisma.department.findMany({
      where: { deletedAt: null, ...(options.includeInactive ? {} : { status: true }) },
      orderBy: { name: 'asc' },
    });
    return departments.map(toDto);
  },

  async create(input: CreateDepartmentInput, actorId: string, meta: RequestMeta) {
    const clash = await prisma.department.findFirst({
      where: { name: { equals: input.name, mode: 'insensitive' } },
    });
    if (clash) throw AppError.conflict('A department with this name already exists');

    return prisma.$transaction(async (tx) => {
      const created = await tx.department.create({ data: input });
      await recordAudit(tx, {
        actorId,
        action: 'DEPARTMENT_CREATED',
        entityType: 'Department',
        entityId: created.id,
        newValue: toDto(created),
        meta,
      });
      return toDto(created);
    });
  },

  async update(id: string, input: UpdateDepartmentInput, actorId: string, meta: RequestMeta) {
    const existing = await findActive(id);
    return prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({ where: { id }, data: input });
      await recordAudit(tx, {
        actorId,
        action: 'DEPARTMENT_UPDATED',
        entityType: 'Department',
        entityId: id,
        oldValue: toDto(existing),
        newValue: toDto(updated),
        meta,
      });
      return toDto(updated);
    });
  },

  /** Soft delete: history (and doctors linked to the department) stays intact. */
  async remove(id: string, actorId: string, meta: RequestMeta) {
    const existing = await findActive(id);
    await prisma.$transaction(async (tx) => {
      await tx.department.update({ where: { id }, data: { deletedAt: new Date(), status: false } });
      await recordAudit(tx, {
        actorId,
        action: 'DEPARTMENT_DELETED',
        entityType: 'Department',
        entityId: id,
        oldValue: toDto(existing),
        meta,
      });
    });
  },
};
