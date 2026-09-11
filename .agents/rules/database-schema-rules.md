# Database Schema Protection & Verification Rules

## 1. กฎข้อห้าม: ห้ามแก้ไขโครงสร้างฐานข้อมูลโดยเด็ดขาด (Strict Schema Protection)
- **ห้ามแก้ไข ลบ เพิ่ม หรือเปลี่ยนแปลงโครงสร้างตารางและคอลัมน์ (DDL) ในฐานข้อมูลโดยเด็ดขาด** เว้นแต่จะมีคำสั่งอนุมัติอย่างชัดเจนจากผู้ใช้ (USER)
- **ห้ามรันคำสั่งที่เปลี่ยนแปลงโครงสร้างฐานข้อมูล** เช่น:
  - `npx prisma db push`
  - `npx prisma migrate dev` / `npx prisma migrate reset`
  - คำสั่ง SQL จำพวก `ALTER TABLE`, `DROP TABLE`, `DROP COLUMN`, `RENAME COLUMN` หรือแก้ไข Constraints/Sequences
- ไฟล์ต่อไปนี้ถือเป็น **Single Source of Truth** ห้ามเปลี่ยนแปลงโครงสร้าง:
  - `prisma/schema.prisma`
  - `db/schema_members.sql`

## 2. โครงสร้างฐานข้อมูลมาตรฐาน (Reference Schemas)
ฐานข้อมูลประกอบด้วย 4 ตารางหลักดังนี้:

### ตาราง `members`
- `id` (BigInt, PK, autoincrement)
- `member_no` (Int, UNIQUE, autoincrement)
- `fullNameTh` / `full_name_th` (String, VarChar(255), NOT NULL)
- `fullNameEn` / `full_name_en` (String?, VarChar(255))
- `idLast4` / `id_last4` (String?, VarChar(4))
- `mobile` (String?, VarChar(30))
- `email` (String?, UNIQUE, VarChar(255))
- `lineId` / `line_id` (String?, VarChar(100))
- `address` (String?, Text)
- `workplace` (String?, VarChar(255))
- `work_phone` (String?, VarChar(50))
- `work_start_date` (DateTime?, Date)
- `position` (String?, VarChar(150))
- `job_category` (String?, VarChar(50))
- `job_category_other` (String?, VarChar(255))
- `scientist_license_no` (String?, VarChar(50))
- `username` (String?, VarChar(100))
- `password_hash` (String?, VarChar(255))
- `referees` (String?, Text)
- `photo_url` (String?, VarChar(500))
- `id_card_doc` (String?, VarChar(500))
- `degree_cert_doc` (String?, VarChar(500))
- `work_cert_doc` (String?, VarChar(500))
- `membership_status` (String?, VarChar(50), default: 'Active')
- `membership_type` (String?, VarChar(50), default: 'Regular')
- `applied_at` (DateTime?, Timestamptz(6), default: now())
- `expire_date` (DateTime?, Date)
- `special_expire_date` (DateTime?, Date)
- `qr_code_data` (Json?)
- `qr_code_image_url` (String?, VarChar(500))

### ตาราง `member_educations`
- `edu_id` (BigInt, PK, autoincrement)
- `member_no` (Int, FK -> `members.member_no`, ON DELETE CASCADE)
- `degree` (String, VarChar(150), NOT NULL)
- `institution` (String, VarChar(255), NOT NULL)
- `graduation_year` (String?, VarChar(10))

### ตาราง `meetings`
- `meeting_id` (String, PK, VarChar(50))
- `meeting_name` (String, VarChar(255), NOT NULL)
- `meeting_date` (DateTime, Date, NOT NULL)
- `counts_toward_active` (Boolean, default: true, NOT NULL)

### ตาราง `meeting_attendances`
- `attendance_id` (BigInt, PK, autoincrement)
- `meeting_id` (String, VarChar(50), FK -> `meetings.meeting_id`)
- `member_no` (Int, FK -> `members.member_no`, ON DELETE CASCADE)
- `attendance_status` (String, VarChar(20), default: 'Attended', NOT NULL)
- `checkin_time` (DateTime?, Timestamptz(6))
- Composite Unique: `UNIQUE(meeting_id, member_no)`

## 3. ขั้นตอนตรวจสอบความถูกต้องก่อนพัฒนาระบบทุกครั้ง (Pre-implementation Checklist)
ก่อนจะเขียนโค้ดฟีเจอร์ใหม่, API, Server Action, Component, หรือฟอร์มใดๆ:
1. **ตรวจสอบชื่อฟิลด์**: ต้องเทียบชื่อฟิลด์และตัวสะกดกับ Schema ด้านบนและใน `prisma/schema.prisma` ทุกครั้ง ห้ามคิดชื่อฟิลด์เอง
2. **ตรวจสอบชนิดข้อมูล (Data Types)**:
   - ตัวเลข `member_no` คือ `Int` / `number` (ไม่ใช่ String)
   - `id` และ `edu_id` และ `attendance_id` คือ `BigInt` (ระวังการ serialize JSON ใน Next.js)
   - `work_start_date`, `expire_date`, `meeting_date` เป็น Date type
3. **ตรวจสอบ Foreign Key**: การเชื่อมโยงระหว่างสมาชิกกับประวัติการศึกษาและการเข้าประชุม **ใช้ `member_no` เท่านั้น** (ห้ามใช้ `id` หรือ `member_id` แบบเดิม)
4. **ตรวจสอบ Default Values & Constraints**: ฟิลด์ที่เป็น NOT NULL ต้องมีค่าวาลิเดตในฟอร์มเสมอ และต้องเคารพค่าเริ่มต้นของฟิลด์
