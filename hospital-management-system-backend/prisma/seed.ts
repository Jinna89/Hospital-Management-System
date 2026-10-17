/**
 * Idempotent demo dataset: safe to run repeatedly (`npx prisma db seed`).
 * Existing rows are left untouched; only missing ones are created.
 */
import 'dotenv/config';
import type { DayOfWeek } from '@prisma/client';
import { createPrismaClient } from '../src/lib/prisma-client';
import { hashPassword } from '../src/utils/password';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const prisma = createPrismaClient(databaseUrl, { poolMax: 3 });

const DEPARTMENTS = [
  'Cardiology',
  'Neurology',
  'Medicine',
  'Orthopedics',
  'Dermatology',
  'Pediatrics',
  'Gynecology',
];

interface SeedDoctor {
  email: string;
  name: string;
  specialty: string;
  qualification: string;
  experienceYears: number;
  licenseNumber: string;
  consultationFee: number;
  bio: string;
  verified: boolean;
  schedules: {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    consultationDurationMins: number;
    breakStartTime?: string;
    breakEndTime?: string;
  }[];
}

const DOCTORS: SeedDoctor[] = [
  {
    email: 'dr.rahman@hospital.test',
    name: 'Dr. Abdur Rahman',
    specialty: 'Cardiology',
    qualification: 'MBBS, MD (Cardiology)',
    experienceYears: 12,
    licenseNumber: 'BMDC-000123',
    consultationFee: 1000,
    bio: 'Senior consultant cardiologist with a focus on preventive cardiology.',
    verified: true,
    schedules: [
      { dayOfWeek: 'SUNDAY', startTime: '09:00', endTime: '13:00', consultationDurationMins: 20 },
      { dayOfWeek: 'TUESDAY', startTime: '17:00', endTime: '21:00', consultationDurationMins: 20 },
      { dayOfWeek: 'THURSDAY', startTime: '09:00', endTime: '13:00', consultationDurationMins: 20 },
    ],
  },
  {
    email: 'dr.jahan@hospital.test',
    name: 'Dr. Nusrat Jahan',
    specialty: 'Neurology',
    qualification: 'MBBS, FCPS (Medicine), MD (Neurology)',
    experienceYears: 9,
    licenseNumber: 'BMDC-000245',
    consultationFee: 1200,
    bio: 'Consultant neurologist treating migraine, epilepsy and movement disorders.',
    verified: true,
    schedules: [
      {
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '14:00',
        consultationDurationMins: 30,
        breakStartTime: '12:00',
        breakEndTime: '12:30',
      },
      {
        dayOfWeek: 'WEDNESDAY',
        startTime: '16:00',
        endTime: '20:00',
        consultationDurationMins: 30,
      },
    ],
  },
  {
    email: 'dr.hasan@hospital.test',
    name: 'Dr. Tanvir Hasan',
    specialty: 'Pediatrics',
    qualification: 'MBBS, DCH',
    experienceYears: 7,
    licenseNumber: 'BMDC-000367',
    consultationFee: 800,
    bio: 'Pediatrician caring for newborns, children and adolescents.',
    verified: true,
    schedules: [
      { dayOfWeek: 'SATURDAY', startTime: '09:00', endTime: '13:00', consultationDurationMins: 15 },
      { dayOfWeek: 'MONDAY', startTime: '17:00', endTime: '20:00', consultationDurationMins: 15 },
    ],
  },
  {
    email: 'dr.karim@hospital.test',
    name: 'Dr. Farhana Karim',
    specialty: 'Dermatology',
    qualification: 'MBBS, MD (Dermatology)',
    experienceYears: 5,
    licenseNumber: 'BMDC-000489',
    consultationFee: 900,
    bio: 'Dermatologist for skin, hair and nail conditions.',
    verified: true,
    schedules: [
      { dayOfWeek: 'TUESDAY', startTime: '10:00', endTime: '14:00', consultationDurationMins: 20 },
      { dayOfWeek: 'FRIDAY', startTime: '15:00', endTime: '19:00', consultationDurationMins: 20 },
    ],
  },
  {
    // Left PENDING on purpose so the admin verification workflow has data.
    email: 'dr.chowdhury@hospital.test',
    name: 'Dr. Imran Chowdhury',
    specialty: 'Orthopedics',
    qualification: 'MBBS, MS (Orthopedics)',
    experienceYears: 4,
    licenseNumber: 'BMDC-000511',
    consultationFee: 1100,
    bio: 'Orthopedic surgeon specialising in sports injuries.',
    verified: false,
    schedules: [],
  },
];

const MEDICINES = [
  ['Paracetamol', 'Acetaminophen', 'Tablet', '500mg'],
  ['Ibuprofen', 'Ibuprofen', 'Tablet', '400mg'],
  ['Omeprazole', 'Omeprazole', 'Capsule', '20mg'],
  ['Esomeprazole', 'Esomeprazole', 'Tablet', '20mg'],
  ['Amoxicillin', 'Amoxicillin', 'Capsule', '500mg'],
  ['Azithromycin', 'Azithromycin', 'Tablet', '500mg'],
  ['Ciprofloxacin', 'Ciprofloxacin', 'Tablet', '500mg'],
  ['Cetirizine', 'Cetirizine', 'Tablet', '10mg'],
  ['Montelukast', 'Montelukast', 'Tablet', '10mg'],
  ['Salbutamol', 'Salbutamol', 'Inhaler', '100mcg'],
  ['Metformin', 'Metformin', 'Tablet', '500mg'],
  ['Amlodipine', 'Amlodipine', 'Tablet', '5mg'],
  ['Atorvastatin', 'Atorvastatin', 'Tablet', '20mg'],
  ['Losartan', 'Losartan', 'Tablet', '50mg'],
  ['Clopidogrel', 'Clopidogrel', 'Tablet', '75mg'],
  ['Aspirin', 'Acetylsalicylic acid', 'Tablet', '75mg'],
  ['ORS', 'Oral rehydration salts', 'Sachet', '20.5g'],
  ['Domperidone', 'Domperidone', 'Tablet', '10mg'],
  ['Vitamin D3', 'Cholecalciferol', 'Capsule', '2000IU'],
  ['Hydrocortisone', 'Hydrocortisone', 'Cream', '1%'],
] as const;

const LAB_TESTS = [
  { name: 'Complete Blood Count', code: 'CBC', price: 500 },
  { name: 'Blood Sugar (Fasting)', code: 'FBS', price: 200 },
  { name: 'Lipid Profile', code: 'LIPID', price: 800 },
  { name: 'Urine Routine Examination', code: 'URINE-RE', price: 300 },
  { name: 'Liver Function Test', code: 'LFT', price: 900 },
  { name: 'Kidney Function Test', code: 'KFT', price: 900 },
  { name: 'HbA1c', code: 'HBA1C', price: 700 },
  { name: 'Thyroid Profile (TSH)', code: 'TSH', price: 650 },
  { name: 'ECG', code: 'ECG', price: 400 },
  { name: 'Chest X-Ray', code: 'CXR', price: 600 },
];

async function seedDepartments() {
  console.log('Seeding departments...');
  const rows = await Promise.all(
    DEPARTMENTS.map((name) =>
      prisma.department.upsert({
        where: { name },
        update: {},
        create: { name, description: `${name} department`, status: true },
      }),
    ),
  );
  return new Map(rows.map((row) => [row.name, row.id]));
}

async function seedAdmin() {
  console.log('Seeding admin...');
  await prisma.user.upsert({
    where: { email: 'admin@hospital.test' },
    update: {},
    create: {
      email: 'admin@hospital.test',
      passwordHash: await hashPassword('Admin@12345'),
      name: 'Hospital Admin',
      role: 'ADMIN',
      isEmailVerified: true,
    },
  });
}

async function seedDemoPatient() {
  console.log('Seeding demo patient...');
  await prisma.user.upsert({
    where: { email: 'demo.patient@medicare-hms.test' },
    update: {},
    create: {
      email: 'demo.patient@medicare-hms.test',
      passwordHash: await hashPassword('DemoPatient@123'),
      name: 'Demo Patient',
      phone: '+8801700000099',
      role: 'PATIENT',
      isEmailVerified: true,
      patient: { create: { gender: 'FEMALE', bloodGroup: 'O+' } },
    },
  });
}

async function seedDoctors(departmentIds: Map<string, string>) {
  console.log('Seeding doctors and schedules...');
  const passwordHash = await hashPassword('Doctor@12345');

  for (const seed of DOCTORS) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        passwordHash,
        name: seed.name,
        role: 'DOCTOR',
        isEmailVerified: true,
      },
    });

    const departmentId = departmentIds.get(seed.specialty);
    const doctor = await prisma.doctor.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        name: seed.name,
        specialty: seed.specialty,
        qualification: seed.qualification,
        experienceYears: seed.experienceYears,
        licenseNumber: seed.licenseNumber,
        consultationFee: seed.consultationFee,
        bio: seed.bio,
        verificationStatus: seed.verified ? 'VERIFIED' : 'PENDING',
        status: 'ACTIVE',
        ...(departmentId ? { departments: { create: [{ departmentId }] } } : {}),
      },
    });

    // Schedules have no natural unique key, so only seed them for doctors that have none.
    if ((await prisma.doctorSchedule.count({ where: { doctorId: doctor.id } })) === 0) {
      await prisma.doctorSchedule.createMany({
        data: seed.schedules.map((schedule) => ({ doctorId: doctor.id, ...schedule })),
      });
    }
  }
}

async function seedCatalogs() {
  console.log('Seeding medicine and lab test catalogs...');
  for (const [name, genericName, form, strength] of MEDICINES) {
    const exists = await prisma.medicine.findFirst({ where: { name, strength, deletedAt: null } });
    if (!exists) await prisma.medicine.create({ data: { name, genericName, form, strength } });
  }
  for (const test of LAB_TESTS) {
    await prisma.labTest.upsert({ where: { code: test.code }, update: {}, create: test });
  }
}

async function main() {
  const departmentIds = await seedDepartments();
  await seedAdmin();
  await seedDemoPatient();
  await seedDoctors(departmentIds);
  await seedCatalogs();

  console.log('✅ Seed complete.');
  console.log('   Admin   admin@hospital.test / Admin@12345');
  console.log('   Doctor  dr.rahman@hospital.test / Doctor@12345');
  console.log('   Patient demo.patient@medicare-hms.test / DemoPatient@123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
