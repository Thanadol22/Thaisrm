// จับคู่ข้อมูลลิงก์ที่นำเข้ากับผู้ลงทะเบียนออนไลน์ในระบบ: อีเมลก่อน แล้วจึงเป็นชื่อ-นามสกุล

export interface MatchableAttendee {
  id: string; // attendance_id
  code: string;
  nameTh: string;
  nameEn?: string;
  email: string;
}

const NAME_PREFIXES = [
  'นางสาว',
  'นาง',
  'นาย',
  'น.ส.',
  'ดร.',
  'ผศ.',
  'รศ.',
  'ศ.',
  'ทนพ.',
  'ทนพญ.',
  'mrs.',
  'mrs',
  'mr.',
  'mr',
  'ms.',
  'ms',
  'miss',
  'dr.',
  'dr',
];

export function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

export function normalizeName(name: string): string {
  let n = (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of NAME_PREFIXES) {
      if (n.startsWith(prefix)) {
        n = n.slice(prefix.length).trim();
        changed = true;
      }
    }
  }
  return n.replace(/\s+/g, '');
}

export type MatchMethod = 'email' | 'name' | null;

export function matchAttendee<T extends MatchableAttendee>(
  row: { name: string; email: string },
  attendees: T[]
): { attendee: T | null; method: MatchMethod } {
  const email = normalizeEmail(row.email);
  if (email) {
    const byEmail = attendees.find((a) => normalizeEmail(a.email) === email);
    if (byEmail) return { attendee: byEmail, method: 'email' };
  }
  const name = normalizeName(row.name);
  if (name) {
    const byName = attendees.filter(
      (a) => normalizeName(a.nameTh) === name || (!!a.nameEn && normalizeName(a.nameEn) === name)
    );
    // ชื่อซ้ำกันมากกว่า 1 คน ถือว่าจับคู่ไม่ได้ เพื่อกันส่งลิงก์ผิดคน
    if (byName.length === 1) return { attendee: byName[0], method: 'name' };
  }
  return { attendee: null, method: null };
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
}

export function isValidLink(link: string): boolean {
  return /^https?:\/\/\S+$/i.test((link || '').trim());
}
