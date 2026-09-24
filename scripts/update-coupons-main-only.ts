import prisma from '../lib/prisma';
import { PrismaClient } from '@prisma/client';

const neonUrl = 'postgresql://neondb_owner:npg_a5EFP3hriVcR@ep-restless-brook-b34k0hea-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

async function updateCoupons() {
  console.log('🔄 Updating local coupons to Main Congress only by default...');
  const localCoupons = await (prisma as any).coupons.findMany();

  for (const c of localCoupons) {
    let note = c.remarks || '';
    if (note.startsWith('{')) {
      try {
        const parsed = JSON.parse(note);
        note = parsed.note || '';
      } catch (e) {}
    }
    const updatedRemarks = JSON.stringify({
      programs: ['การประชุมหลัก (Main Congress)'],
      note: note || undefined,
    });

    await (prisma as any).coupons.update({
      where: { id: c.id },
      data: { remarks: updatedRemarks },
    });
  }
  console.log(`✅ Updated ${localCoupons.length} local coupons.`);

  // Update Neon as well
  console.log('🔄 Updating Neon coupons to Main Congress only by default...');
  const neonPrisma = new PrismaClient({
    datasources: { db: { url: neonUrl } },
  });

  const neonCoupons = await neonPrisma.coupons.findMany();
  for (const c of neonCoupons) {
    let note = c.remarks || '';
    if (note.startsWith('{')) {
      try {
        const parsed = JSON.parse(note);
        note = parsed.note || '';
      } catch (e) {}
    }
    const updatedRemarks = JSON.stringify({
      programs: ['การประชุมหลัก (Main Congress)'],
      note: note || undefined,
    });

    await neonPrisma.coupons.update({
      where: { id: c.id },
      data: { remarks: updatedRemarks },
    });
  }
  console.log(`✅ Updated ${neonCoupons.length} Neon coupons.`);
  await neonPrisma.$disconnect();
}

updateCoupons().catch(console.error);
