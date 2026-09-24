/**
 * สคริปต์สำหรับสร้าง ADMIN_PASSWORD_HASH ด้วย bcrypt
 * รันด้วย: node scripts/gen-admin-hash.mjs <password>
 * 
 * ตัวอย่าง: node scripts/gen-admin-hash.mjs MySecretPassword123!
 * แล้วนำค่าที่ได้ไปใส่ใน .env เป็น ADMIN_PASSWORD_HASH=<hash>
 */

import bcrypt from 'bcryptjs';

const password = process.argv[2];

if (!password) {
  console.error('❌ กรุณาระบุรหัสผ่าน: node scripts/gen-admin-hash.mjs <password>');
  process.exit(1);
}

if (password.length < 8) {
  console.error('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร');
  process.exit(1);
}

console.log('⏳ กำลังสร้าง bcrypt hash (cost factor: 12)...\n');

const hash = await bcrypt.hash(password, 12);

console.log('✅ Hash สำเร็จ! นำค่าด้านล่างไปใส่ใน .env:\n');
console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
console.log('⚠️  หลังจากเพิ่มแล้ว ให้ลบหรือ comment ADMIN_PASSWORD ออกจาก .env');
