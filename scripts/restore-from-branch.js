const { PrismaClient } = require('@prisma/client');

// 1. Restored Branch (Source of Truth - Before Sync)
const sourceUrl = 'postgresql://neondb_owner:npg_a5EFP3hriVcR@ep-lucky-haze-b3ot818z-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

// 2. Main Neon Branch (Target Production)
const targetMainUrl = 'postgresql://neondb_owner:npg_a5EFP3hriVcR@ep-restless-brook-b34k0hea-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

// 3. Local PostgreSQL
const targetLocalUrl = 'postgresql://postgres:1234@localhost:5432/thaisrm?schema=public';

const sourcePrisma = new PrismaClient({ datasources: { db: { url: sourceUrl } } });
const targetMainPrisma = new PrismaClient({ datasources: { db: { url: targetMainUrl } } });
const targetLocalPrisma = new PrismaClient({ datasources: { db: { url: targetLocalUrl } } });

async function restoreAll() {
  console.log('🔄 กำลังเริ่มต้นกระบวนการกู้คืนข้อมูลจาก Time-Travel Branch (ก่อนกดปุ่มประมวลผล)...\n');

  try {
    const sourceMembers = await sourcePrisma.member.findMany();
    console.log(`📦 พบข้อมูลสมาชิกใน Time-Travel Branch ทั้งหมด: ${sourceMembers.length} คน`);

    let updatedMainCount = 0;
    let updatedLocalCount = 0;

    // อัปเดตข้อมูลสมาชิก (โดยเฉพาะสถานะ membership_status และข้อมูลทั้งหมด) กลับสู่ Neon Main และ Local
    console.log('\n⏳ 1. กำลังกู้คืนข้อมูลกลับสู่ Neon Main Branch...');
    for (const m of sourceMembers) {
      await targetMainPrisma.member.upsert({
        where: { member_no: m.member_no },
        update: m,
        create: m,
      });
      updatedMainCount++;
    }
    console.log(`   ✅ กู้คืนข้อมูลสมาชิกสู่ Neon Main สำเร็จ: ${updatedMainCount} รายการ`);

    console.log('\n⏳ 2. กำลังกู้คืนข้อมูลกลับสู่ Local PostgreSQL...');
    for (const m of sourceMembers) {
      await targetLocalPrisma.member.upsert({
        where: { member_no: m.member_no },
        update: m,
        create: m,
      });
      updatedLocalCount++;
    }
    console.log(`   ✅ กู้คืนข้อมูลสมาชิกสู่ Local PostgreSQL สำเร็จ: ${updatedLocalCount} รายการ`);

    // ตรวจสอบผลลัพธ์
    const mainActive = await targetMainPrisma.member.count({ where: { membership_status: 'Active' } });
    const mainInactive = await targetMainPrisma.member.count({ where: { membership_status: 'Inactive' } });

    console.log('\n==========================================');
    console.log('🎉 สรุปผลการกู้คืนข้อมูล (Restore Complete):');
    console.log(`   - สมาชิกสถานะปกติ (Active): ${mainActive} คน`);
    console.log(`   - สมาชิกสถานะหมดอายุ (Inactive): ${mainInactive} คน`);
    console.log('==========================================\n');

  } catch (err) {
    console.error('❌ เกิดข้อผิดพลาดในการกู้คืนข้อมูล:', err);
    process.exit(1);
  } finally {
    await sourcePrisma.$disconnect();
    await targetMainPrisma.$disconnect();
    await targetLocalPrisma.$disconnect();
  }
}

restoreAll();
