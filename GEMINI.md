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

---

# Tech Stack & Database Workflow Rules

## 4. บทบาทของแต่ละ Layer (Stack Responsibilities)

ระบบนี้ใช้ 3 Layer ทำงานร่วมกัน — **อย่าสับสนหน้าที่ของแต่ละตัว**:

| Layer | เครื่องมือ | หน้าที่ |
|-------|-----------|--------|
| **Schema Definition** | `prisma/schema.prisma` | ออกแบบโครงสร้างตาราง (Single Source of Truth) |
| **ORM / Query Layer** | Prisma Client (`lib/prisma.ts`) | แปล TypeScript → SQL, ส่ง query ไปที่ DB |
| **Database (Local)** | PostgreSQL (`localhost:5432`) | ฐานข้อมูลสำหรับ development บนเครื่อง |
| **Database (Production)** | Neon (cloud PostgreSQL) | ฐานข้อมูลจริงบน Vercel / production |

> **กฎสำคัญ**: `prisma/schema.prisma` คือแหล่งความจริงหนึ่งเดียว — ห้ามแก้โครงสร้างตารางโดยตรงที่ DB โดยไม่แก้ schema.prisma ก่อน

## 5. กฎการเพิ่มข้อมูล (INSERT Data) — ไม่เปลี่ยนโครงสร้าง

ถ้าต้องการเพิ่มข้อมูล (row) เข้าตารางที่มีอยู่แล้ว **ไม่ต้องแตะ schema.prisma**:

- **สำหรับ Local DB**: ใช้ Prisma Studio (`npx prisma studio` → http://localhost:5555)
- **สำหรับ Production (Neon)**: ใช้ Neon Console → SQL Editor หรือผ่าน API ที่ deploy บน Vercel
- **ผ่านโค้ด API**: เขียน `prisma.<model>.create({ data: { ... } })` ใน route handler

## 6. กฎการเพิ่ม/แก้ไขโครงสร้างตาราง (Schema Changes) — ต้องได้รับอนุมัติก่อน

**ห้ามทำโดยพลการ** — ต้องได้รับคำสั่งอนุมัติอย่างชัดเจนจาก USER ก่อนทุกครั้ง

เมื่อได้รับอนุมัติแล้ว ให้ทำตามลำดับนี้เสมอ:

```
Step 1: แก้ไข prisma/schema.prisma  ← เสมอเป็นขั้นแรก
Step 2: npx prisma db push          ← sync โครงสร้างไปที่ Local DB
Step 3: npx prisma generate         ← อัปเดต TypeScript types
Step 4: ทดสอบบน Local ก่อน
Step 5: push code ขึ้น Git → Vercel build ← Neon จะได้รับ schema ใหม่อัตโนมัติ
```

> ⚠️ **สำคัญ**: `npx prisma db push` โดย default ชี้ไปที่ `DATABASE_URL` ใน `.env`
> - Local `.env` → ชี้ไปที่ `localhost` = ผลกระทบต่อ Local เท่านั้น
> - ถ้าจะ push ไป Neon โดยตรง ต้องเปลี่ยน `DATABASE_URL` ใน `.env` ให้ชี้ไป Neon ก่อน

## 7. กฎการแยก Local vs Production (Environment Rules)

| การกระทำ | ผลกระทบ |
|----------|--------|
| แก้ schema + `db push` (`.env` = localhost) | เปลี่ยนแค่ **Local DB** |
| แก้ schema + `db push` (`.env` = Neon URL) | เปลี่ยน **Neon (Production)** ⚠️ |
| เพิ่มข้อมูลผ่าน Prisma Studio | เข้า **Local DB** เท่านั้น |
| เพิ่มข้อมูลผ่าน Neon Console | เข้า **Neon (Production)** |
| deploy ขึ้น Vercel | โค้ดใหม่ใช้ **Neon** โดยอัตโนมัติ |

## 8. กฎการ Migrate ข้อมูลระหว่าง Local กับ Neon

ถ้าข้อมูลใน Local และ Neon ไม่ตรงกัน ให้ใช้วิธีนี้:

```powershell
# Export จาก Local (data only, ไม่เอา schema)
pg_dump -h localhost -U postgres -d thaisrm `
  --data-only --no-acl --no-owner `
  -t members -t member_educations -t meetings -t meeting_attendances `
  -f "export.sql"

# Import เข้า Neon
psql "<NEON_DATABASE_URL>" -f "export.sql"
```

> ⚠️ ห้ามรัน `pg_dump --schema-only` แล้ว import เข้า Neon เพราะจะทำให้โครงสร้างชนกัน
