import prisma from '@/lib/prisma';

/** รูปตารางกิจกรรมที่ส่งให้หน้าเว็บ */
export interface ProgramImageDTO {
  id: string;
  meetingId: string;
  /** YYYY-MM-DD */
  date: string;
  kind: 'main' | 'workshop';
  workshopNo: number | null;
  topic: string;
  src: string;
  sortOrder: number;
}

export interface ProgramImageInput {
  programDate: string;
  kind: 'main' | 'workshop';
  workshopNo: number | null;
  topic: string;
  imageUrl: string;
  sortOrder: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toDbDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export function serializeProgramImage(row: {
  id: bigint;
  meeting_id: string;
  program_date: Date;
  kind: string;
  workshop_no: number | null;
  topic: string;
  image_url: string;
  sort_order: number;
}): ProgramImageDTO {
  return {
    id: row.id.toString(),
    meetingId: row.meeting_id,
    date: row.program_date.toISOString().slice(0, 10),
    kind: row.kind === 'workshop' ? 'workshop' : 'main',
    workshopNo: row.workshop_no,
    topic: row.topic,
    src: row.image_url,
    sortOrder: row.sort_order,
  };
}

/** เรียงตามวัน → โปรแกรมหลักก่อนเวิร์กช็อป → หมายเลขเวิร์กช็อป → ลำดับที่กำหนดเอง */
export function compareProgramImages(a: ProgramImageDTO, b: ProgramImageDTO): number {
  return (
    a.date.localeCompare(b.date) ||
    (a.workshopNo ?? 0) - (b.workshopNo ?? 0) ||
    a.sortOrder - b.sortOrder ||
    Number(a.id) - Number(b.id)
  );
}

export async function listProgramImages(meetingId: string): Promise<ProgramImageDTO[]> {
  const rows = await prisma.meeting_program_images.findMany({ where: { meeting_id: meetingId } });
  return rows.map(serializeProgramImage).sort(compareProgramImages);
}

function isAllowedImageUrl(url: string): boolean {
  if (url.startsWith('/uploads/') || url.startsWith('/program/')) return !url.includes('..');
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** ตรวจและแปลงข้อมูลจากฟอร์มแอดมิน คืนข้อความผิดพลาดภาษาไทยถ้าไม่ผ่าน */
export function parseProgramImageInput(body: Record<string, unknown>): { data?: ProgramImageInput; error?: string } {
  const programDate = String(body.programDate ?? '').trim();
  if (!DATE_RE.test(programDate) || isNaN(toDbDate(programDate).getTime())) {
    return { error: 'กรุณาระบุวันที่ของโปรแกรมให้ถูกต้อง' };
  }

  const kind = body.kind === 'workshop' ? 'workshop' : body.kind === 'main' ? 'main' : null;
  if (!kind) return { error: 'กรุณาเลือกประเภทโปรแกรม' };

  let workshopNo: number | null = null;
  if (kind === 'workshop') {
    workshopNo = Number(body.workshopNo);
    if (!Number.isInteger(workshopNo) || workshopNo < 1 || workshopNo > 99) {
      return { error: 'กรุณาระบุหมายเลขเวิร์กช็อปเป็นตัวเลข 1–99' };
    }
  }

  const topic = String(body.topic ?? '').trim();
  if (topic.length > 255) return { error: 'หัวข้อยาวเกิน 255 ตัวอักษร' };

  const imageUrl = String(body.imageUrl ?? '').trim();
  if (!imageUrl || imageUrl.length > 1000 || !isAllowedImageUrl(imageUrl)) {
    return { error: 'กรุณาอัปโหลดรูปตารางกิจกรรม' };
  }

  const sortOrder = body.sortOrder === undefined || body.sortOrder === '' ? 0 : Number(body.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    return { error: 'ลำดับต้องเป็นตัวเลข 0–999' };
  }

  return { data: { programDate, kind, workshopNo, topic, imageUrl, sortOrder } };
}

export function toDbData(input: ProgramImageInput) {
  return {
    program_date: toDbDate(input.programDate),
    kind: input.kind,
    workshop_no: input.workshopNo,
    topic: input.topic,
    image_url: input.imageUrl,
    sort_order: input.sortOrder,
  };
}
