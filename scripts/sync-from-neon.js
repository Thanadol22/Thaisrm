const { PrismaClient } = require('@prisma/client');

const neonUrl = process.env.DATABASE_URL?.includes('neon.tech') 
  ? process.env.DATABASE_URL 
  : 'postgresql://neondb_owner:npg_a5EFP3hriVcR@ep-restless-brook-b34k0hea-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

const localUrl = 'postgresql://postgres:1234@localhost:5432/thaisrm?schema=public';

const neon = new PrismaClient({ datasources: { db: { url: neonUrl } } });
const local = new PrismaClient({ datasources: { db: { url: localUrl } } });

async function syncFromNeon() {
  console.log('🚀 เริ่มต้นการดึงข้อมูลจาก Neon -> Local PostgreSQL...\n');
  console.log('🌐 Neon URL:', neonUrl.split('@')[1] || 'Neon Cloud');
  console.log('💻 Local URL:', localUrl);

  try {
    // 1. System Settings
    console.log('\n📦 1. กำลัง Sync system_settings...');
    const settings = await neon.system_settings.findMany();
    for (const s of settings) {
      await local.system_settings.upsert({
        where: { key: s.key },
        update: s,
        create: s,
      });
    }
    console.log(`   ✅ Synced ${settings.length} system_settings`);

    // 2. Members
    console.log('\n📦 2. กำลัง Sync members...');
    const members = await neon.member.findMany();
    for (const m of members) {
      await local.member.upsert({
        where: { member_no: m.member_no },
        update: m,
        create: m,
      });
    }
    console.log(`   ✅ Synced ${members.length} members`);

    // 3. Member Educations
    console.log('\n📦 3. กำลัง Sync member_educations...');
    const educations = await neon.member_educations.findMany();
    // Clear local educations to mirror Neon exactly
    await local.member_educations.deleteMany();
    for (const edu of educations) {
      await local.member_educations.create({ data: edu });
    }
    console.log(`   ✅ Synced ${educations.length} member_educations`);

    // 4. Meetings
    console.log('\n📦 4. กำลัง Sync meetings...');
    const meetings = await neon.meetings.findMany();
    for (const meet of meetings) {
      await local.meetings.upsert({
        where: { meeting_id: meet.meeting_id },
        update: meet,
        create: meet,
      });
    }
    console.log(`   ✅ Synced ${meetings.length} meetings`);

    // 5. Meeting Attendances
    console.log('\n📦 5. กำลัง Sync meeting_attendances...');
    const attendances = await neon.meeting_attendances.findMany();
    await local.meeting_attendances.deleteMany();
    for (const att of attendances) {
      await local.meeting_attendances.create({ data: att });
    }
    console.log(`   ✅ Synced ${attendances.length} meeting_attendances`);

    // 6. Meeting Daily Checkins
    console.log('\n📦 6. กำลัง Sync meeting_daily_checkins...');
    const dailyCheckins = await neon.meeting_daily_checkins.findMany();
    await local.meeting_daily_checkins.deleteMany();
    for (const dc of dailyCheckins) {
      await local.meeting_daily_checkins.create({ data: dc });
    }
    console.log(`   ✅ Synced ${dailyCheckins.length} meeting_daily_checkins`);

    // 7. Payment Slips
    console.log('\n📦 7. กำลัง Sync payment_slips...');
    const slips = await neon.payment_slips.findMany();
    await local.payment_slips.deleteMany();
    for (const slip of slips) {
      await local.payment_slips.create({ data: slip });
    }
    console.log(`   ✅ Synced ${slips.length} payment_slips`);

    // 8. Receipts
    console.log('\n📦 8. กำลัง Sync receipts...');
    const receipts = await neon.receipts.findMany();
    await local.receipts.deleteMany();
    for (const r of receipts) {
      await local.receipts.create({ data: r });
    }
    console.log(`   ✅ Synced ${receipts.length} receipts`);

    // 9. Coupons
    console.log('\n📦 9. กำลัง Sync coupons...');
    const coupons = await neon.coupons.findMany();
    await local.coupons.deleteMany();
    for (const c of coupons) {
      await local.coupons.create({ data: c });
    }
    console.log(`   ✅ Synced ${coupons.length} coupons`);

    // 10. Coupon Usages
    console.log('\n📦 10. กำลัง Sync coupon_usages...');
    const couponUsages = await neon.coupon_usages.findMany();
    await local.coupon_usages.deleteMany();
    for (const cu of couponUsages) {
      await local.coupon_usages.create({ data: cu });
    }
    console.log(`   ✅ Synced ${couponUsages.length} coupon_usages`);

    console.log('\n🎉 ดึงข้อมูลจาก Neon ลง Local DB สำเร็จสมบูรณ์ทุกตาราง!');
  } catch (error) {
    console.error('\n❌ เกิดข้อผิดพลาดขณะ Sync:', error);
    process.exit(1);
  } finally {
    await neon.$disconnect();
    await local.$disconnect();
  }
}

syncFromNeon();
