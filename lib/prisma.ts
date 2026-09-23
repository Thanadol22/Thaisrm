import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// In development, ensure we have the latest client delegates if schema was regenerated
if (process.env.NODE_ENV !== 'production' && globalForPrisma.prisma && !(globalForPrisma.prisma as any).sponsors) {
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

// Retain singleton in both development and serverless warm containers
globalForPrisma.prisma = prisma;

export default prisma;



