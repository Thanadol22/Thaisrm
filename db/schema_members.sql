-- ============================================================
-- Thai Society for Reproductive Medicine (TSRM) Database Schema
-- ฐานข้อมูล: thaisrm
-- อัปเดตโครงสร้างล่าสุด: member_no เป็น PRIMARY KEY VARCHAR(20) เติม 0 4 หลัก
-- ============================================================

-- ------------------------------------------------------------
-- Sequence สำหรับรันเลขที่สมาชิก (เริ่มที่ 1281)
-- ------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS member_no_seq
    START WITH 1281
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- ------------------------------------------------------------
-- 1. ตารางหลัก: ข้อมูลสมาชิก (members)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS members (
    member_no            VARCHAR(20) PRIMARY KEY DEFAULT LPAD(nextval('member_no_seq')::text, 4, '0'), -- เลขที่สมาชิก (Primary Key 4 หลัก เช่น 0001, 1281)
    id                   BIGSERIAL,                              -- ลำดับ ID เดิม
    full_name_th         VARCHAR(255) NOT NULL,                  -- ชื่อ-นามสกุล (ภาษาไทย)
    full_name_en         VARCHAR(255),                           -- ชื่อ-นามสกุล (ภาษาอังกฤษ)
    id_last4             VARCHAR(4),                             -- บัตรประชาชน 4 หลักท้าย
    mobile               VARCHAR(30),                            -- เบอร์โทรศัพท์มือถือ
    email                VARCHAR(255) UNIQUE,                    -- อีเมล
    line_id              VARCHAR(100),                           -- LINE ID
    address              TEXT,                                   -- ที่อยู่
    workplace            VARCHAR(255),                           -- สถานที่ทำงาน
    work_phone           VARCHAR(50),                            -- เบอร์โทรศัพท์ที่ทำงาน
    work_start_date      DATE,                                   -- วันที่เริ่มทำงาน
    position             VARCHAR(150),                           -- ตำแหน่ง
    job_category         VARCHAR(50),                            -- สายงาน/หมวดหมู่อาชีพ
    job_category_other   VARCHAR(255),                           -- สายงานอื่นๆ (กรณีเลือกอื่นๆ)
    scientist_license_no VARCHAR(50),                            -- เลขทะเบียนนักวิทยาศาสตร์การแพทย์
    username             VARCHAR(100),                           -- ชื่อผู้ใช้งานสำหรับเข้าสู่ระบบ
    password_hash        VARCHAR(255),                           -- รหัสผ่าน (Hashed)
    referees             TEXT,                                   -- ผู้รับรอง
    photo_url            VARCHAR(500),                           -- URL หรือ Path รูปถ่ายสมาชิก
    id_card_doc          VARCHAR(500),                           -- URL หรือ Path เอกสารสำเนาบัตรประชาชน
    degree_cert_doc      VARCHAR(500),                           -- URL หรือ Path เอกสารวุฒิการศึกษา
    work_cert_doc        VARCHAR(500),                           -- URL หรือ Path เอกสารรับรองการทำงาน
    membership_status    VARCHAR(50) DEFAULT 'Active',           -- สถานะสมาชิก (Active, Inactive, etc.)
    membership_type      VARCHAR(50) DEFAULT 'Regular',          -- ประเภทสมาชิก (Regular, Associate, etc.)
    applied_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,  -- วันที่สมัครสมาชิก
    expire_date          DATE,                                   -- วันหมดอายุสมาชิก
    special_expire_date  DATE,                                   -- วันหมดอายุพิเศษ
    qr_code_data         JSONB,                                  -- ข้อมูลสำหรับ QR Code (JSON)
    qr_code_image_url    VARCHAR(500)                            -- URL หรือ Path รูปภาพ QR Code
);

-- ดัชนีสำหรับการค้นหาสมาชิก
CREATE INDEX IF NOT EXISTS idx_members_email ON members (email);
CREATE INDEX IF NOT EXISTS idx_members_name_th ON members (full_name_th);

COMMENT ON TABLE members IS 'ข้อมูลสมาชิกสมาคม TSRM (member_no เป็น Primary Key)';

-- ------------------------------------------------------------
-- 2. ตารางย่อย: ประวัติการศึกษาของสมาชิก (member_educations)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS member_educations (
    edu_id          BIGSERIAL PRIMARY KEY,
    member_no       VARCHAR(20) NOT NULL
        REFERENCES members (member_no)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    degree          VARCHAR(150) NOT NULL,                  -- วุฒิการศึกษา / Degree
    institution     VARCHAR(255) NOT NULL,                  -- สถาบันการศึกษา / มหาวิทยาลัย
    graduation_year VARCHAR(10)                             -- ปีที่สำเร็จการศึกษา
);

COMMENT ON TABLE member_educations IS 'ประวัติการศึกษาของสมาชิก ผูกกับ member_no';

-- ------------------------------------------------------------
-- 3. ตารางการประชุม / กิจกรรม (meetings)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
    meeting_id           VARCHAR(50) PRIMARY KEY,           -- รหัสการประชุม (เช่น AGM-2024, SYM-01)
    meeting_name         VARCHAR(255) NOT NULL,             -- ชื่องานประชุม/สัมมนา
    meeting_date         DATE NOT NULL,                     -- วันที่จัดประชุม (วันเริ่มต้น)
    start_date           DATE,                              -- วันที่เริ่มการประชุม
    end_date             DATE,                              -- วันที่สิ้นสุดการประชุม
    counts_toward_active BOOLEAN NOT NULL DEFAULT true      -- นับเป็นการเข้าร่วมเพื่อคงสถานะ Active หรือไม่
);

COMMENT ON TABLE meetings IS 'ข้อมูลการประชุม / กิจกรรมของสมาคม';

-- ------------------------------------------------------------
-- 4. ตารางการลงทะเบียน / บันทึกการเข้าร่วมประชุม (meeting_attendances)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meeting_attendances (
    attendance_id     BIGSERIAL PRIMARY KEY,
    meeting_id        VARCHAR(50) NOT NULL
        REFERENCES meetings (meeting_id)
        ON UPDATE NO ACTION
        ON DELETE RESTRICT,
    member_no         VARCHAR(20) NOT NULL
        REFERENCES members (member_no)
        ON DELETE CASCADE
        ON UPDATE NO ACTION,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'Attended', -- สถานะการเข้าร่วม
    checkin_time      TIMESTAMPTZ,                            -- เวลาที่ทำการเช็คอินเข้าร่วม

    CONSTRAINT uq_member_meeting UNIQUE (meeting_id, member_no)
);

-- ดัชนีสำหรับการค้นหาและตรวจสอบการเข้าร่วม
CREATE INDEX IF NOT EXISTS idx_attendance_meeting ON meeting_attendances (meeting_id);
CREATE INDEX IF NOT EXISTS idx_attendance_member ON meeting_attendances (member_no);

COMMENT ON TABLE meeting_attendances IS 'บันทึกการเช็คอินและการเข้าร่วมประชุมของสมาชิก';
