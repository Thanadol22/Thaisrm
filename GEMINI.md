# Database Schema Protection & Verification Rules

## 1. กฎข้อห้าม: ห้ามแก้ไขโครงสร้างฐานข้อมูลโดยเด็ดขาด (Strict Schema Protection)
- **ห้ามแก้ไข ลบ เพิ่ม หรือเปลี่ยนแปลงโครงสร้างตารางและคอลัมน์ (DDL) ในฐานข้อมูลโดยเด็ดขาด** เว้นแต่จะมีคำสั่งอนุมัติอย่างชัดเจนจากผู้ใช้ (USER)
- **ห้ามรันคำสั่งที่ส่งผลกระทบต่อโครงสร้างฐานข้อมูล** เช่น `npx prisma db push`, `npx prisma migrate dev`, `npx prisma migrate reset` หรือ DDL SQL statements (`ALTER TABLE`, `DROP`, `RENAME`)
- ไฟล์ `prisma/schema.prisma` และ `db/schema_members.sql` คือ **Single Source of Truth** ห้ามเปลี่ยนแปลงโครงสร้าง

## 2. โครงสร้างตารางและฟิลด์มาตรฐาน (Reference Schemas)
- **members**: `member_no` (String PK - VARCHAR(20) เติมศูนย์ 4 หลักอัตโนมัติ), `id` (BigInt), `fullNameTh` (`full_name_th`), `fullNameEn` (`full_name_en`), `idLast4` (`id_last4`), `mobile`, `email` (UNIQUE), `lineId` (`line_id`), `address`, `workplace`, `work_phone`, `work_start_date`, `position`, `job_category`, `job_category_other`, `scientist_license_no`, `username`, `password_hash`, `referees`, `photo_url`, `id_card_doc`, `degree_cert_doc`, `work_cert_doc`, `membership_status`, `membership_type`, `applied_at`, `expire_date`, `special_expire_date`, `qr_code_data`, `qr_code_image_url`
- **member_educations**: `edu_id` (BigInt PK), `member_no` (String FK -> `members.member_no`), `degree`, `institution`, `graduation_year`
- **meetings**: `meeting_id` (String PK), `meeting_name`, `meeting_date`, `counts_toward_active` (Boolean)
- **meeting_attendances**: `attendance_id` (BigInt PK), `meeting_id` (FK -> `meetings.meeting_id`), `member_no` (String FK -> `members.member_no`), `attendance_status`, `checkin_time`, `UNIQUE(meeting_id, member_no)`

## 3. ขั้นตอนตรวจสอบความถูกต้องก่อนพัฒนาระบบทุกครั้ง (Pre-implementation Checklist)
ก่อนพัฒนาหรือแก้ไข API, Server Actions, Forms, หรือ Components ใดๆ:
1. **ตรวจสอบชื่อฟิลด์**: ต้องเทียบชื่อฟิลด์และตัวสะกดกับ Schema ด้านบนและ `prisma/schema.prisma` ทุกครั้ง ห้ามคิดชื่อฟิลด์เอง
2. **ตรวจสอบชนิดข้อมูล**: `member_no` เป็น `String` (`VARCHAR(20)`), `id` เป็น `BigInt`, Date fields ต้องแปลงข้อมูลให้ถูกต้อง
3. **ตรวจสอบ Foreign Key**: การเชื่อมโยงระหว่างตารางต้องใช้ `member_no` เท่านั้น (ห้ามใช้ `id` หรือ `member_id` แบบเดิม)
4. **ตรวจสอบเงื่อนไข NOT NULL & Default**: รองรับการตรวจสอบข้อมูลให้ตรงตาม constraints เสมอ
