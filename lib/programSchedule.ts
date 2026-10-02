// ตัวช่วยแสดงผลรูปตารางกิจกรรม (ข้อมูลมาจากตาราง meeting_program_images ผ่าน /api/meetings/program-images)
export type { ProgramImageDTO as ProgramImage } from '@/lib/services/programImageService';

import type { ProgramImageDTO } from '@/lib/services/programImageService';

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

/** เช่น "วันอังคารที่ 20 ต.ค. 2569" / "Tue, 20 Oct 2026" */
export function formatProgramDate(date: string, lang: 'th' | 'en'): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (lang === 'th') {
    return `วัน${THAI_WEEKDAYS[d.getUTCDay()]}ที่ ${d.getUTCDate()} ${THAI_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
  }
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function programKindLabel(p: Pick<ProgramImageDTO, 'kind' | 'workshopNo'>, lang: 'th' | 'en'): string {
  if (p.kind === 'main') return lang === 'th' ? 'โปรแกรมหลัก' : 'Main Program';
  return lang === 'th' ? `เวิร์กช็อป ${p.workshopNo ?? ''}`.trim() : `Workshop ${p.workshopNo ?? ''}`.trim();
}
