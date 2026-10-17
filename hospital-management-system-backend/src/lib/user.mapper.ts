import type { AccountStatus, User, UserRole } from '@prisma/client';

export interface AuthUserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  status: AccountStatus;
  createdAt: Date;
}

type UserRow = Pick<User, 'id' | 'email' | 'name' | 'role' | 'phone' | 'status' | 'createdAt'>;

/** The only shape in which a user ever leaves the API (never includes passwordHash). */
export function toAuthUser(user: UserRow): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    status: user.status,
    createdAt: user.createdAt,
  };
}
