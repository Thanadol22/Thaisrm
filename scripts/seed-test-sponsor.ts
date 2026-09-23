import prisma from '../lib/prisma';

async function seedTestSponsor() {
  console.log('Seeding Test Sponsor Data...');

  const sponsorId = 'sponsor-test-01';
  const companyName = 'บริษัท ทดสอบสปอนเซอร์ จำกัด (Test Sponsor Co., Ltd.)';
  const contactEmail = 'test@sponsor.com';
  const contactName = 'ผู้ดูแลระบบทดสอบ (Test Admin)';
  const meetingId = 'TSRM34';
  const couponCode = 'T34-TEST-111111';

  // 1. Upsert Sponsor
  const sponsor = await (prisma as any).sponsors.upsert({
    where: { id: sponsorId },
    update: {
      name: companyName,
      tier: 'Platinum',
      contact_name: contactName,
      contact_email: contactEmail,
      is_active: true,
      updated_at: new Date(),
    },
    create: {
      id: sponsorId,
      name: companyName,
      tier: 'Platinum',
      contact_name: contactName,
      contact_email: contactEmail,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  console.log('✅ Sponsor created/updated:', sponsor.name, '(', sponsor.contact_email, ')');

  // 2. Upsert Quota for meeting TSRM34
  const quota = await (prisma as any).sponsor_quotas.upsert({
    where: {
      sponsor_id_meeting_id: {
        sponsor_id: sponsorId,
        meeting_id: meetingId,
      },
    },
    update: {
      quota_seats: 10,
      used_seats: 0,
      members_only: true,
      updated_at: new Date(),
    },
    create: {
      sponsor_id: sponsorId,
      meeting_id: meetingId,
      quota_seats: 10,
      used_seats: 0,
      members_only: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  console.log('✅ Quota set:', quota.quota_seats, 'seats for meeting', meetingId);

  // 3. Upsert Coupon
  const existingCoupon = await prisma.coupons.findFirst({
    where: { code: couponCode },
  });

  if (existingCoupon) {
    await prisma.coupons.update({
      where: { id: existingCoupon.id },
      data: {
        company_name: companyName,
        meeting_id: meetingId,
        discount_type: 'free',
        discount_value: 0,
        max_uses: 10,
        used_count: 0,
        is_active: true,
        remarks: 'คูปองสิทธิ์ฟรีสำหรับทดสอบระบบสปอนเซอร์ (รหัสผ่าน 111111)',
        updated_at: new Date(),
      },
    });
    console.log('✅ Coupon updated:', couponCode);
  } else {
    await prisma.coupons.create({
      data: {
        code: couponCode,
        company_name: companyName,
        meeting_id: meetingId,
        discount_type: 'free',
        discount_value: 0,
        applicable_type: 'registration',
        max_uses: 10,
        used_count: 0,
        is_active: true,
        remarks: 'คูปองสิทธิ์ฟรีสำหรับทดสอบระบบสปอนเซอร์ (รหัสผ่าน 111111)',
      },
    });
    console.log('✅ Coupon created:', couponCode);
  }

  // 4. Create permanent OTP record (year 2099)
  await (prisma as any).sponsor_otp_codes.create({
    data: {
      email: contactEmail,
      otp_code: '111111',
      expires_at: new Date('2099-12-31T23:59:59.000Z'),
      is_used: false,
    },
  });
  console.log('✅ Permanent OTP 111111 created in database for', contactEmail);

  console.log('\n===========================================');
  console.log('🎉 ข้อมูลสำหรับทดสอบเข้าใช้งาน Sponsor Portal:');
  console.log('• URL เข้าใช้งาน: /sponsor/group-register');
  console.log('• Email ตัวแทนบริษัท: test@sponsor.com');
  console.log('• รหัสผ่าน / OTP ถาวร: 111111 (ไม่ต้องขอใหม่)');
  console.log('• รหัสคูปองฟรี: T34-TEST-111111 (10 ที่นั่ง)');
  console.log('• งานประชุม: 34th TSRM2026 V.2 (TSRM34)');
  console.log('• ตัวอย่างเลขสมาชิกสำหรับทดสอบ: 0000, 0001, 0004, 0007, 0014, 0016');
  console.log('===========================================\n');
}

seedTestSponsor()
  .catch((e) => {
    console.error('Error seeding test sponsor:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
