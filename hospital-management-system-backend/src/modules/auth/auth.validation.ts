import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Invalid email format');

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Z]/, 'Password must contain an uppercase letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  // Registration through this public endpoint always creates a PATIENT.
  // DOCTOR accounts are created by an admin (POST /admin/doctors) so their
  // verification status starts PENDING under staff control, not self-service.
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(20).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
