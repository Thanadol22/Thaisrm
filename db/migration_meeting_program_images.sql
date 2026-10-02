-- ตารางรูปตารางกิจกรรม (โปรแกรม) ของแต่ละการประชุม
-- ใช้สร้างตารางบน Neon (production) ก่อน deploy — ตรงกับ model meeting_program_images ใน prisma/schema.prisma
CREATE TABLE IF NOT EXISTS "meeting_program_images" (
    "id" BIGSERIAL NOT NULL,
    "meeting_id" VARCHAR(50) NOT NULL,
    "program_date" DATE NOT NULL,
    "kind" VARCHAR(20) NOT NULL DEFAULT 'main',
    "workshop_no" INTEGER,
    "topic" VARCHAR(255) NOT NULL DEFAULT '',
    "image_url" VARCHAR(1000) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_program_images_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "meeting_program_images_meeting_id_fkey" FOREIGN KEY ("meeting_id")
        REFERENCES "meetings"("meeting_id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX IF NOT EXISTS "idx_program_images_meeting_date"
    ON "meeting_program_images"("meeting_id", "program_date");
