-- ฟอร์มเฉพาะ (เช่น ราคา fellow): ตารางใหม่ 2 ตาราง ไม่แก้ตารางเดิม
-- รันบน Neon ก่อน deploy โค้ดที่ใช้ special_forms (Neon Console > SQL Editor)
BEGIN;

-- CreateTable
CREATE TABLE "special_forms" (
    "id" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "form_type" VARCHAR(30) NOT NULL DEFAULT 'fellow',
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "meeting_id" VARCHAR(50) NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "allow_coupon" BOOLEAN NOT NULL DEFAULT true,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "close_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "special_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_form_sponsors" (
    "id" BIGSERIAL NOT NULL,
    "form_id" VARCHAR(50) NOT NULL,
    "sponsor_id" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "special_form_sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "special_forms_slug_key" ON "special_forms"("slug");

-- CreateIndex
CREATE INDEX "idx_special_forms_meeting" ON "special_forms"("meeting_id");

-- CreateIndex
CREATE INDEX "idx_special_form_sponsors_sponsor" ON "special_form_sponsors"("sponsor_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_special_form_sponsor" ON "special_form_sponsors"("form_id", "sponsor_id");

-- AddForeignKey
ALTER TABLE "special_forms" ADD CONSTRAINT "special_forms_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("meeting_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "special_form_sponsors" ADD CONSTRAINT "special_form_sponsors_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "special_forms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "special_form_sponsors" ADD CONSTRAINT "special_form_sponsors_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;


COMMIT;
