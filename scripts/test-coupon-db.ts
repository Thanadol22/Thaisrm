import prisma from '../lib/prisma';

async function main() {
  const coupons = await (prisma as any).coupons.findMany();
  console.log(JSON.stringify(coupons, null, 2));
}

main().catch(console.error);
