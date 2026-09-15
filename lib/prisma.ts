import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

let prismaInstance: any = globalForPrisma.prisma;

if (!prismaInstance || !prismaInstance.payment_slips) {
  if (typeof require !== 'undefined' && require.cache) {
    Object.keys(require.cache).forEach((k) => {
      if (k.includes('.prisma') || k.includes('@prisma')) {
        delete require.cache[k];
      }
    });
  }
  try {
    const { PrismaClient: FreshClient } = require('@prisma/client');
    prismaInstance = new FreshClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
}

export const prisma: PrismaClient = prismaInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;


