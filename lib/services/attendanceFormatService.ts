/**
 * รูปแบบการเข้าร่วม (ออนไซต์ / ออนไลน์) ที่เก็บใน payment_slips.selected_activities
 *
 * รูปแบบถูกเก็บไว้หลายที่ตามรุ่นของฟอร์ม (attendanceType, selectedFormat, format และ format ของแต่ละหลักสูตร)
 * การแก้ไขรูปแบบต้องปรับทุกที่ให้ตรงกัน เพื่อให้ทุกหน้าที่อ่านข้อมูลนี้แสดงผลตรงกัน
 */

export type AttendanceFormat = 'onsite' | 'online';

const normalizeMemberNo = (value: unknown) => String(value ?? '').trim().replace(/^0+/, '');

export function isGroupFormatPayload(parsed: any): boolean {
  return Boolean(
    parsed &&
      !Array.isArray(parsed) &&
      (parsed.isGroup || parsed.type === 'conference_group_registration') &&
      Array.isArray(parsed.attendees)
  );
}

/** หลักสูตรที่งานประชุมกำหนดรูปแบบตายตัว (เช่น เวิร์กช็อปออนไซต์เท่านั้น) จะไม่ถูกเปลี่ยนตามรูปแบบที่แก้ */
function fixedFormatOf(activity: any, meetingActivities: any[]): AttendanceFormat | null {
  if (!activity || typeof activity !== 'object') return null;
  const isMain = activity.type === 'main' || activity.id === 'main';
  if (isMain) return null;
  const def = meetingActivities.find((m) => String(m?.id) === String(activity.id));
  const fmt = def ? def.format || (def.type === 'workshop' ? 'onsite' : 'both') : null;
  return fmt === 'onsite' || fmt === 'online' ? fmt : null;
}

// รายการหลักสูตรที่บันทึกไว้ เก็บรูปแบบที่เลือกไว้ในแต่ละหลักสูตรด้วย ต้องปรับให้ตรงกับรูปแบบใหม่
function withActivityListFormat(list: any, format: AttendanceFormat, meetingActivities: any[]): any {
  if (!Array.isArray(list)) return list;
  return list.map((a: any) =>
    a && typeof a === 'object' && a.format !== undefined && !fixedFormatOf(a, meetingActivities) ? { ...a, format } : a
  );
}

const ACTIVITY_LIST_KEYS = ['selectedActivities', 'activities', 'selectedActivityObjects'] as const;

function withActivityListsFormat(obj: any, format: AttendanceFormat, meetingActivities: any[]): Record<string, any> {
  const patch: Record<string, any> = {};
  for (const key of ACTIVITY_LIST_KEYS) {
    if (Array.isArray(obj?.[key])) patch[key] = withActivityListFormat(obj[key], format, meetingActivities);
  }
  return patch;
}

// ผู้เข้าร่วมในกลุ่ม: เก็บรูปแบบไว้หลายชื่อฟิลด์ตามรุ่นของฟอร์ม จึงปรับทุกฟิลด์ที่มีอยู่ให้ตรงกัน
function withAttendeeFormat(att: any, format: AttendanceFormat, meetingActivities: any[]): any {
  if (!att || typeof att !== 'object') return att;
  return {
    ...att,
    attendanceType: format,
    ...(att.selectedFormat !== undefined ? { selectedFormat: format } : {}),
    ...(att.format !== undefined ? { format } : {}),
    ...withActivityListsFormat(att, format, meetingActivities),
  };
}

/** ตำแหน่งผู้เข้าร่วมในรายการกลุ่มที่ตรงกับเลขสมาชิก (หรืออีเมล) ไม่นับผู้ที่ลงกิจกรรมเพิ่มเติม */
export function findGroupAttendeeIndex(parsed: any, match: { memberNo?: unknown; email?: unknown }): number {
  if (!isGroupFormatPayload(parsed)) return -1;
  const no = normalizeMemberNo(match.memberNo);
  const mail = String(match.email ?? '').trim().toLowerCase();
  const candidates = parsed.attendees
    .map((att: any, idx: number) => ({ att, idx }))
    .filter(({ att }: any) => att && typeof att === 'object' && !att.isAddOn);
  const byNo = no ? candidates.find(({ att }: any) => normalizeMemberNo(att.memberNo || att.member_no) === no) : null;
  if (byNo) return byNo.idx;
  const byMail = mail ? candidates.find(({ att }: any) => String(att.email || '').trim().toLowerCase() === mail) : null;
  return byMail ? byMail.idx : -1;
}

/** รูปแบบการเข้าร่วมของผู้เข้าร่วมในรายการกลุ่ม */
export function attendeeFormatOf(att: any): AttendanceFormat {
  return (att?.selectedFormat || att?.attendanceType || att?.format) === 'online' ? 'online' : 'onsite';
}

/**
 * ปรับรูปแบบการเข้าร่วมใน selected_activities
 * - รายการกลุ่ม: ต้องระบุ attendeeIndex ของผู้เข้าร่วมที่ต้องการแก้
 * - รายบุคคล: ปรับค่าระดับบนสุด รายการหลักสูตร และข้อมูลผู้สมัคร
 */
export function applyAttendanceFormat(
  parsed: any,
  format: AttendanceFormat,
  meetingActivities: any[],
  attendeeIndex?: number | null
): any {
  if (Array.isArray(parsed)) {
    // รูปแบบเก่า: รายการกิจกรรมแบบอาร์เรย์ ปรับที่โปรแกรมหลัก (ถ้าไม่มีโปรแกรมหลักให้ปรับทุกรายการที่ไม่ตายตัว)
    const hasMain = parsed.some((a: any) => a?.type !== 'workshop');
    return parsed.map((a: any) =>
      a && typeof a === 'object' && (!hasMain || a.type !== 'workshop') && !fixedFormatOf(a, meetingActivities)
        ? { ...a, format }
        : a
    );
  }
  if (!parsed || typeof parsed !== 'object') return parsed;

  if (isGroupFormatPayload(parsed)) {
    return {
      ...parsed,
      attendees: parsed.attendees.map((att: any, idx: number) =>
        idx === attendeeIndex ? withAttendeeFormat(att, format, meetingActivities) : att
      ),
    };
  }

  return {
    ...parsed,
    attendanceType: format,
    format,
    ...withActivityListsFormat(parsed, format, meetingActivities),
    ...(Array.isArray(parsed.attendees)
      ? { attendees: parsed.attendees.map((att: any) => withAttendeeFormat(att, format, meetingActivities)) }
      : {}),
    ...(parsed.memberPayload && typeof parsed.memberPayload === 'object'
      ? {
          memberPayload: {
            ...parsed.memberPayload,
            attendanceType: format,
            ...withActivityListsFormat(parsed.memberPayload, format, meetingActivities),
          },
        }
      : {}),
  };
}
