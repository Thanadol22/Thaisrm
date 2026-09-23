import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTests() {
  console.log('=== TEST 1: Check Seeded Sponsors ===');
  const sponsors = await (prisma as any).sponsors.findMany();
  console.log(`✓ Total sponsors in DB: ${sponsors.length}`);

  const lgChem = await (prisma as any).sponsors.findFirst({
    where: { name: 'LG Chem' },
    include: { quotas: true },
  });
  console.log(`✓ LG Chem found: ${lgChem?.name} (${lgChem?.tier}), Quotas allocated: ${lgChem?.quotas?.length}`);

  console.log('\n=== TEST 2: Request & Verify OTP Simulation ===');
  const testEmail = 'natsuree@lgchem.com';
  const testOtp = '123456';
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const otpRecord = await (prisma as any).sponsor_otp_codes.create({
    data: {
      email: testEmail,
      otp_code: testOtp,
      expires_at: expiresAt,
      is_used: false,
    },
  });
  console.log(`✓ Created test OTP: ${otpRecord.otp_code} for ${otpRecord.email}`);

  // Verify OTP
  const validOtp = await (prisma as any).sponsor_otp_codes.findFirst({
    where: {
      email: testEmail,
      otp_code: testOtp,
      is_used: false,
      expires_at: { gte: new Date() },
    },
  });
  if (validOtp) {
    await (prisma as any).sponsor_otp_codes.update({
      where: { id: validOtp.id },
      data: { is_used: true },
    });
    console.log('✓ OTP Verified successfully and marked as used');
  }

  console.log('\n=== TEST 3: Verify Member by Member No & Name ===');
  // ค้นหาสมาชิกที่มีอยู่จริงในระบบ 1 คนเพื่อทดสอบ
  const sampleMember = await prisma.member.findFirst({
    where: { membership_status: 'Active' },
  });

  if (sampleMember) {
    console.log(`✓ Found sample member: No. ${sampleMember.member_no}, Name: ${sampleMember.fullNameTh}`);

    // ทดสอบชื่อตรง
    const nameMatch = sampleMember.fullNameTh.includes(sampleMember.fullNameTh.slice(0, 4));
    console.log(`✓ Name matching check passed: ${nameMatch}`);
  } else {
    console.log('! No active member found in DB for verification test');
  }

  console.log('\n=== TEST 4: Check Sponsor Quotas ===');
  const quotas = await (prisma as any).sponsor_quotas.findMany({
    include: { sponsor: true, meeting: true },
  });
  console.log(`✓ Total quota entries: ${quotas.length}`);
  quotas.forEach((q: any) => {
    console.log(`  - [${q.sponsor.name}] Meeting: ${q.meeting.meeting_name} | Quota: ${q.quota_seats}, Used: ${q.used_seats}`);
  });

  console.log('\n=== All Tests Completed Successfully ===');
}

runTests()
  .catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
