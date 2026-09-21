import prisma from '../lib/prisma';

async function main() {
  const count = await (prisma as any).coupons.count();
  console.log('Coupons count:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
