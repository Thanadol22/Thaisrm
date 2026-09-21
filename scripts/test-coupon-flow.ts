import prisma from '../lib/prisma';

async function main() {
  console.log('=== 1. Check latest meeting ===');
  const latestMeeting = await (prisma as any).meetings.findFirst({
    where: { status: 'upcoming' },
    orderBy: { meeting_date: 'desc' },
  });

  if (!latestMeeting) {
    console.log('No upcoming meeting found');
    return;
  }

  console.log(`Meeting found: ${latestMeeting.meeting_id} - ${latestMeeting.meeting_name}`);

  console.log('\n=== 2. Create a test coupon ===');
  const testCode = `TEST-VIP-${Math.floor(1000 + Math.random() * 9000)}`;
  const newCoupon = await (prisma as any).coupons.create({
    data: {
      code: testCode,
      company_name: 'บริษัท ไบเออร์ไทย จำกัด (Bayer Thai Co., Ltd.)',
      meeting_id: latestMeeting.meeting_id,
      discount_type: 'free',
      discount_value: 0,
      applicable_type: 'all',
      max_uses: 3,
      used_count: 0,
      is_active: true,
      remarks: 'สิทธิ์ทดสอบระบบ 3 ที่นั่ง',
    },
  });
  console.log('Created Coupon:', newCoupon);

  console.log('\n=== 3. Simulate Member using the coupon ===');
  // Record usage
  const usage1 = await (prisma as any).coupon_usages.create({
    data: {
      coupon_id: newCoupon.id,
      meeting_id: latestMeeting.meeting_id,
      member_no: '0001',
      attendee_name: 'นพ. สมเกียรติ รักษาดี',
      attendee_email: 'somkiat.test@tsrm.org',
      attendee_phone: '0812345678',
      workplace: 'โรงพยาบาลจุฬาลงกรณ์',
      discount_applied: 4000,
      final_amount: 0,
      ticket_code: 'TSRM-2026-9901',
      slip_id: 'SLIP-TEST-001',
    },
  });
  await (prisma as any).coupons.update({
    where: { id: newCoupon.id },
    data: { used_count: { increment: 1 } },
  });
  console.log('Usage 1 recorded:', usage1);

  console.log('\n=== 4. Simulate Non-Member using the coupon ===');
  const usage2 = await (prisma as any).coupon_usages.create({
    data: {
      coupon_id: newCoupon.id,
      meeting_id: latestMeeting.meeting_id,
      member_no: null,
      attendee_name: 'พญ. นภาพร สุขสมบูรณ์ (Guest)',
      attendee_email: 'napaporn.guest@gmail.com',
      attendee_phone: '0898765432',
      workplace: 'โรงพยาบาลศิริราช',
      discount_applied: 5000,
      final_amount: 0,
      ticket_code: 'TSRM-2026-9902',
      slip_id: 'SLIP-TEST-002',
    },
  });
  await (prisma as any).coupons.update({
    where: { id: newCoupon.id },
    data: { used_count: { increment: 1 } },
  });
  console.log('Usage 2 recorded:', usage2);

  console.log('\n=== 5. Query updated coupon with usages ===');
  const updatedCoupon = await (prisma as any).coupons.findUnique({
    where: { id: newCoupon.id },
    include: {
      usages: true,
      meetings: {
        select: { meeting_name: true },
      },
    },
  });
  console.log('Coupon status now:');
  console.log(`- Code: ${updatedCoupon.code}`);
  console.log(`- Sponsor: ${updatedCoupon.company_name}`);
  console.log(`- Used: ${updatedCoupon.used_count} / ${updatedCoupon.max_uses}`);
  console.log(`- Usages Count: ${updatedCoupon.usages.length}`);
  updatedCoupon.usages.forEach((u: any, idx: number) => {
    console.log(`  [${idx + 1}] ${u.attendee_name} (${u.attendee_email}) | MemberNo: ${u.member_no || 'Non-Member'} | Ticket: ${u.ticket_code}`);
  });

  console.log('\n=== 6. Cleanup test records ===');
  await (prisma as any).coupon_usages.deleteMany({
    where: { coupon_id: newCoupon.id },
  });
  await (prisma as any).coupons.delete({
    where: { id: newCoupon.id },
  });
  console.log('Cleaned up test coupon successfully!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
