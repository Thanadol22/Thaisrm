-- ============================================================
-- TSRM Member Application Form Schema
-- ใบสมัคร TSRM Member
-- ฐานข้อมูล: thaisrm
-- ============================================================

-- Sequence สำหรับรันเลข "รหัส" และ "เลขสมาชิก" อัตโนมัติ (คนละชุดกัน)
CREATE SEQUENCE IF NOT EXISTS code_seq START 1;
CREATE SEQUENCE IF NOT EXISTS membership_no_seq START 1;

-- ตารางหลัก: ข้อมูลสมาชิก
CREATE TABLE IF NOT EXISTS members (
    member_id           BIGSERIAL PRIMARY KEY,

    -- รหัส* และ เลขสมาชิก* : รันอัตโนมัติเป็นตัวเลขล้วน 6 หลัก เช่น 000123
    code                VARCHAR(6)  NOT NULL
        DEFAULT lpad(nextval('code_seq')::TEXT, 6, '0'),
    membership_no       VARCHAR(6)  NOT NULL
        DEFAULT lpad(nextval('membership_no_seq')::TEXT, 6, '0'),

    full_name_th        VARCHAR(255) NOT NULL,   -- ชื่อ-นามสกุล
    full_name_en        VARCHAR(255),            -- Name

    id_last4            CHAR(4),                 -- ID4หลักท้าย (เลขบัตร ปชช. 4 หลักท้าย)

    mobile              VARCHAR(20),             -- Mobile
    email               VARCHAR(255),            -- email
    line_id             VARCHAR(100),            -- Line

    workplace           VARCHAR(255),            -- ที่ทำงาน**
    start_date          DATE,                    -- วันที่เริ่มงาน
    position            VARCHAR(255),            -- ตำแหน่ง

    -- ประเภทสมาชิก [ ] 1-6 หรือ 0 อื่นๆ
    member_type         SMALLINT
        CHECK (member_type BETWEEN 0 AND 6),
    -- 1 = RM
    -- 2 = Fellow RM
    -- 3 = Embryologist
    -- 4 = Technologist for Andrology
    -- 5 = Molecular Geneticist
    -- 6 = Nurse
    -- 0 = อื่นๆ (ระบุใน member_type_other)
    member_type_other   VARCHAR(255),            -- ระบุกรณีเลือก 0 อื่นๆ

    scientist_reg_no    VARCHAR(50),             -- เลขทะเบียนนักวิทย์ *
    scientist_reg_nw    VARCHAR(50),             -- นว. .........

    photo_path          TEXT,                    -- Digital PHOTO (path/URL รูป)
    qr_code_path        TEXT,                    -- QR code (path/URL)

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (code),
    UNIQUE (membership_no)
);

COMMENT ON TABLE members IS 'ข้อมูลใบสมัครสมาชิก TSRM';
COMMENT ON COLUMN members.id_last4 IS 'เลขบัตรประชาชน/บัตรอื่น 4 หลักท้าย';
COMMENT ON COLUMN members.member_type IS '0=อื่นๆ,1=RM,2=Fellow RM,3=Embryologist,4=Technologist for Andrology,5=Molecular Geneticist,6=Nurse';

-- ตารางย่อย: วุฒิการศึกษา (หนึ่งสมาชิกมีได้หลายวุฒิ)
CREATE TABLE IF NOT EXISTS member_education (
    education_id        BIGSERIAL PRIMARY KEY,
    member_id           BIGINT NOT NULL
        REFERENCES members (member_id)
        ON DELETE CASCADE,

    degree              VARCHAR(255),   -- วุฒิ / Degree
    institution         VARCHAR(255),   -- สถาบัน / College / University
    graduation_year     SMALLINT,       -- ปีที่จบ (พ.ศ. หรือ ค.ศ. ตามที่ใช้งานจริง)

    display_order       SMALLINT NOT NULL DEFAULT 1  -- ลำดับแถวในฟอร์ม
);

COMMENT ON TABLE member_education IS 'ตารางวุฒิการศึกษา/สถาบัน/ปีที่จบ ของสมาชิกแต่ละคน (แถวในฟอร์มด้านล่าง)';

CREATE INDEX IF NOT EXISTS idx_education_member_id ON member_education (member_id);

-- Trigger: auto update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_members_updated_at ON members;
CREATE TRIGGER trg_members_updated_at
BEFORE UPDATE ON members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- ผูก sequence เข้ากับคอลัมน์ เพื่อให้ถูกลบไปพร้อมกันถ้า drop table/column
ALTER SEQUENCE code_seq OWNED BY members.code;
ALTER SEQUENCE membership_no_seq OWNED BY members.membership_no;
