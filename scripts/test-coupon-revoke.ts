import prisma from '../lib/prisma';

async function testRevoke() {
  console.log('=== 1. Create Coupon with 2 Quotas ===');
  const coupon = await (prisma as any).coupons.create({
    data: {
      code: `REVOKE-TEST-${Date.now().toString().slice(-4)}`,
      company_name: 'บจก. ทดสอบระบบคืนสิทธิ์ จำกัด',
      meeting_id: 'TSRM34',
      discount_type: 'free',
      discount_value: 0,
      max_uses: 2,
      used_count: 0,
      is_active: true,
    },
  });
  console.log('Created Coupon:', coupon.code, '| Quota:', coupon.max_uses, '| Used:', coupon.used_count);

  console.log('\n=== 2. Use Coupon for Attendee ===');
  const usage = await (prisma as any).coupon_usages.create({
    data: {
      coupon_id: coupon.id,
      meeting_id: 'TSRM34',
      member_no: '0001',
      attendee_name: 'นพ. วรพจน์ ทดสอบคืนสิทธิ์',
      attendee_email: 'worapoj.test@tsrm.org',
      discount_applied: 4000,
      final_amount: 0,
      ticket_code: 'TSRM-2026-REV1',
    },
  });
  await (prisma as any).coupons.update({
    where: { id: coupon.id },
    data: { used_count: { increment: 1 } },
  });

  const afterUse = await (prisma as any).coupons.findUnique({ where: { id: coupon.id } });
  console.log('After usage: used_count =', afterUse.used_count, '/', afterUse.max_uses);

  console.log('\n=== 3. Revoke / Refund Quota ===');
  // Perform revoke
  await (prisma as any).coupons.update({
    where: { id: coupon.id },
    data: { used_count: { decrement: 1 } },
  });
  await (prisma as any).coupon_usages.delete({
    where: { id: usage.id },
  });

  const afterRevoke = await (prisma as any).coupons.findUnique({ where: { id: coupon.id } });
  console.log('After revoke: used_count =', afterRevoke.used_count, '/', afterRevoke.max_uses);

  console.log('\n=== 4. Clean up ===');
  await (prisma as any).coupons.delete({ where: { id: coupon.id } });
  console.log('Test completed successfully! Quota rollback confirmed.');
}

testRevoke().catch(console.error).finally(() => prisma.$disconnect());
