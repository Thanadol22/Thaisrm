import prisma from '@/lib/prisma';

export interface QualifyingMeeting {
  meeting_id: string;
  meeting_name: string;
  meeting_date: Date;
  start_date: Date | null;
  end_date: Date | null;
}

export interface MemberAttendanceEvaluation {
  member_no: string;
  membership_type: string;
  current_status: string;
  calculated_status: 'Active' | 'Inactive';
  is_lifelong: boolean;
  qualifying_meetings_total: number;
  attended_count: number;
  missed_count: number;
  attended_meeting_ids: string[];
  qualifying_meetings: QualifyingMeeting[];
  reason: string;
}

export interface SyncStatusResult {
  total_members_evaluated: number;
  updated_to_active: number;
  updated_to_inactive: number;
  unchanged_count: number;
  lifelong_count: number;
  details: Array<{
    member_no: string;
    full_name_th: string;
    previous_status: string;
    new_status: string;
    attended_count: number;
    qualifying_count: number;
    reason: string;
  }>;
}

const MANUAL_STATUS_OVERRIDES_KEY = 'membership_status_manual_overrides';

interface ManualStatusOverride {
  status: 'Active' | 'Inactive';
  at: string; // เวลาที่แอดมินปรับสถานะด้วยตนเอง (ISO)
}

function normalizeStatus(status: string | null | undefined): 'Active' | 'Inactive' {
  return (status || 'Active').trim().toLowerCase() === 'active' ? 'Active' : 'Inactive';
}

/**
 * ดึงรายการสมาชิกที่แอดมินปรับสถานะด้วยตนเอง
 * เก็บใน system_settings เป็น JSON { [member_no]: { status, at } } (ไม่แตะโครงสร้างตาราง members)
 */
async function getManualStatusOverrides(): Promise<Record<string, ManualStatusOverride>> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT value FROM system_settings WHERE key = $1 LIMIT 1`,
      MANUAL_STATUS_OVERRIDES_KEY
    );
    if (rows && rows.length > 0 && rows[0].value) {
      return JSON.parse(rows[0].value) as Record<string, ManualStatusOverride>;
    }
  } catch (err) {
    console.error('Failed to read membership_status_manual_overrides:', err);
  }
  return {};
}

/**
 * บันทึกว่าแอดมินปรับสถานะสมาชิกด้วยตนเอง (ถือว่าต่ออายุ/ยืนยันสถานะแล้ว)
 * การประมวลผลตามกฎ 4 ครั้งล่าสุดจะนับเฉพาะการประชุมที่จัดหลังจากเวลาที่ปรับสถานะนี้
 */
export async function recordManualStatusOverride(memberNo: string, status: string): Promise<void> {
  const overrides = await getManualStatusOverrides();
  overrides[memberNo] = { status: normalizeStatus(status), at: new Date().toISOString() };
  await prisma.$executeRawUnsafe(
    `INSERT INTO system_settings (key, value, description, updated_at)
     VALUES ($1, $2, 'Manual membership status overrides', NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    MANUAL_STATUS_OVERRIDES_KEY,
    JSON.stringify(overrides)
  );
}

interface RuleOutcome {
  status: 'Active' | 'Inactive';
  reason: string;
  applicableMeetings: QualifyingMeeting[];
  attendedCount: number;
  missedCount: number;
}

/**
 * คำนวณสถานะสมาชิกสามัญตามกฎขาดประชุม 4 ครั้งล่าสุด
 * รอบที่นำมาประเมินเริ่มนับจากวันที่ล่าสุดระหว่างวันสมัคร กับวันที่แอดมินปรับสถานะด้วยตนเอง
 */
function applyAttendanceRule(
  qualifyingMeetings: QualifyingMeeting[],
  attendedIds: Set<string>,
  appliedAt: Date | null,
  override?: ManualStatusOverride
): RuleOutcome {
  const appliedTime = appliedAt ? new Date(appliedAt).getTime() : null;
  const overrideTime = override ? new Date(override.at).getTime() : null;
  const startTime = Math.max(appliedTime ?? -Infinity, overrideTime ?? -Infinity);
  // ใช้เวลาที่ปรับสถานะเป็นจุดเริ่มนับ (ไม่ใช่วันสมัคร)
  const fromOverride = overrideTime !== null && overrideTime >= (appliedTime ?? -Infinity);

  const applicableMeetings = Number.isFinite(startTime)
    ? qualifyingMeetings.filter((m) => new Date(m.start_date || m.meeting_date).getTime() >= startTime)
    : qualifyingMeetings;
  const attendedCount = applicableMeetings.filter((m) => attendedIds.has(m.meeting_id)).length;
  const missedCount = applicableMeetings.length - attendedCount;
  const base = { applicableMeetings, attendedCount, missedCount };

  if (attendedCount > 0) {
    return { ...base, status: 'Active', reason: `เข้าร่วมประชุม ${attendedCount}/${applicableMeetings.length} ครั้งล่าสุด` };
  }

  // ไม่มีวันเริ่มนับ (ไม่มีวันสมัครและไม่เคยปรับสถานะ) -> ประเมินตาม 4 ครั้งล่าสุดตรงๆ
  if (!Number.isFinite(startTime)) {
    return { ...base, status: 'Inactive', reason: `ขาดการประชุมติดต่อกัน ${missedCount} ครั้งล่าสุด (สถานะหมดอายุ)` };
  }

  if (applicableMeetings.length < 4) {
    if (fromOverride && override) {
      return {
        ...base,
        status: override.status,
        reason: applicableMeetings.length === 0
          ? 'แอดมินปรับสถานะแล้ว ยังไม่มีรอบการประชุมหลังวันที่ปรับสถานะ'
          : `แอดมินปรับสถานะแล้ว ยังไม่ครบ 4 รอบประเมินหลังวันที่ปรับสถานะ (ขาด ${missedCount}/4 ครั้ง)`,
      };
    }
    return {
      ...base,
      status: 'Active',
      reason: applicableMeetings.length === 0
        ? 'สมาชิกใหม่ ยังไม่มีรอบการประชุมหลังวันที่สมัคร'
        : `สมาชิกใหม่ ยังไม่ครบ 4 รอบประเมินหลังวันสมัคร (ขาด ${missedCount}/4 ครั้ง)`,
    };
  }

  return { ...base, status: 'Inactive', reason: `ขาดการประชุมติดต่อกัน ${missedCount} ครั้งล่าสุด (สถานะหมดอายุ)` };
}

/**
 * ดึงรอบการประชุม 4 ครั้งล่าสุดที่มีผลต่อการคงสถานะสมาชิก
 * นับเฉพาะการประชุมที่เริ่มแล้วหรือจบแล้วล่าสุด (completed, ongoing หรือ meeting_date/start_date <= วันที่ปัจจุบัน)
 */
export async function getQualifyingActiveMeetings(limit = 4): Promise<QualifyingMeeting[]> {
  try {
    const now = new Date();
    const meetings = await prisma.meetings.findMany({
      where: {
        OR: [
          { status: { in: ['completed', 'ongoing'] } },
          { meeting_date: { lte: now } },
          { start_date: { lte: now } },
        ],
        NOT: {
          AND: [
            { status: 'upcoming' },
            { meeting_date: { gt: now } },
          ],
        },
      },
      select: {
        meeting_id: true,
        meeting_name: true,
        meeting_date: true,
        start_date: true,
        end_date: true,
      },
      orderBy: [
        { meeting_date: 'desc' },
      ],
      take: limit,
    });

    return meetings;
  } catch (error) {
    console.error('Error fetching qualifying active meetings:', error);
    return [];
  }
}

/**
 * ประเมินสถานะของสมาชิก 1 คน ตามกฎการขาดประชุม 4 ครั้งล่าสุด
 */
export async function evaluateMemberAttendanceStatus(
  memberNo: string,
  preloadedQualifyingMeetings?: QualifyingMeeting[]
): Promise<MemberAttendanceEvaluation | null> {
  const member = await prisma.member.findUnique({
    where: { member_no: memberNo },
    include: {
      meeting_attendances: {
        select: {
          meeting_id: true,
          attendance_status: true,
        },
      },
    },
  });

  if (!member) return null;

  const qualifyingMeetings = preloadedQualifyingMeetings || (await getQualifyingActiveMeetings(4));
  const membershipType = (member.membership_type || 'Regular').trim();
  const isLifelong = membershipType.toLowerCase() === 'lifelong';
  const currentStatus = (member.membership_status || 'Active').trim();

  // 1. กรณีสมาชิกตลอดชีพ (Lifelong Member) -> ได้รับการยกเว้นเป็น Active เสมอ
  if (isLifelong) {
    return {
      member_no: member.member_no,
      membership_type: membershipType,
      current_status: currentStatus,
      calculated_status: 'Active',
      is_lifelong: true,
      qualifying_meetings_total: qualifyingMeetings.length,
      attended_count: member.meeting_attendances.length,
      missed_count: 0,
      attended_meeting_ids: member.meeting_attendances.map((a) => a.meeting_id),
      qualifying_meetings: qualifyingMeetings,
      reason: 'สมาชิกตลอดชีพ (Lifelong) ได้รับสิทธิ์คงสถานะตลอดชีพ',
    };
  }

  const memberAttendedIds = new Set(member.meeting_attendances.map((a) => a.meeting_id));
  const overrides = await getManualStatusOverrides();
  const outcome = applyAttendanceRule(qualifyingMeetings, memberAttendedIds, member.applied_at, overrides[member.member_no]);

  return {
    member_no: member.member_no,
    membership_type: membershipType,
    current_status: currentStatus,
    calculated_status: outcome.status,
    is_lifelong: false,
    qualifying_meetings_total: outcome.applicableMeetings.length,
    attended_count: outcome.attendedCount,
    missed_count: outcome.missedCount,
    attended_meeting_ids: Array.from(memberAttendedIds),
    qualifying_meetings: outcome.applicableMeetings,
    reason: outcome.reason,
  };
}

/**
 * ประมวลผลและอัปเดตสถานะของสมาชิกทั้งระบบตามกฎ 4 ครั้งล่าสุด (Batch Sync)
 */
export async function batchSyncAllMemberStatuses(dryRun = false): Promise<SyncStatusResult> {
  const qualifyingMeetings = await getQualifyingActiveMeetings(4);
  const overrides = await getManualStatusOverrides();

  // ดึงสมาชิกทั้งหมดพร้อมประวัติการเข้าประชุม
  const members = await prisma.member.findMany({
    select: {
      member_no: true,
      fullNameTh: true,
      membership_type: true,
      membership_status: true,
      applied_at: true,
      meeting_attendances: {
        select: {
          meeting_id: true,
        },
      },
    },
    orderBy: {
      member_no: 'asc',
    },
  });

  let updatedToActive = 0;
  let updatedToInactive = 0;
  let unchangedCount = 0;
  let lifelongCount = 0;
  const details: SyncStatusResult['details'] = [];
  const updatesToRun: Array<{ member_no: string; new_status: 'Active' | 'Inactive' }> = [];

  for (const m of members) {
    const membershipType = (m.membership_type || 'Regular').trim();
    const isLifelong = membershipType.toLowerCase() === 'lifelong';
    const currentStatus = (m.membership_status || 'Active').trim();
    const totalAttendances = m.meeting_attendances.length;
    const memberAttendedIds = new Set(m.meeting_attendances.map((a) => a.meeting_id));

    let newStatus: 'Active' | 'Inactive' = 'Active';
    let reason = '';
    let attendedCount = 0;
    let qualifyingCount = qualifyingMeetings.length;

    if (isLifelong) {
      lifelongCount++;
      newStatus = 'Active';
      reason = 'สมาชิกตลอดชีพ (สิทธิ์คงสถานะตลอดชีพ)';
      attendedCount = totalAttendances;
    } else {
      const outcome = applyAttendanceRule(qualifyingMeetings, memberAttendedIds, m.applied_at, overrides[m.member_no]);
      newStatus = outcome.status;
      reason = outcome.reason;
      attendedCount = outcome.attendedCount;
      qualifyingCount = outcome.applicableMeetings.length;
    }

    if (newStatus.toLowerCase() !== currentStatus.toLowerCase()) {
      if (newStatus === 'Active') {
        updatedToActive++;
      } else {
        updatedToInactive++;
      }

      updatesToRun.push({ member_no: m.member_no, new_status: newStatus });
      details.push({
        member_no: m.member_no,
        full_name_th: m.fullNameTh,
        previous_status: currentStatus,
        new_status: newStatus,
        attended_count: attendedCount,
        qualifying_count: qualifyingCount,
        reason,
      });
    } else {
      unchangedCount++;
    }
  }

  // รันอัปเดตลงฐานข้อมูลจริงหากไม่ใช่ dryRun
  if (!dryRun && updatesToRun.length > 0) {
    // รันเป็น chunks เพื่อความเสถียรและเร็ว
    const chunkSize = 100;
    for (let i = 0; i < updatesToRun.length; i += chunkSize) {
      const chunk = updatesToRun.slice(i, i + chunkSize);
      await prisma.$transaction(
        chunk.map((item) =>
          prisma.member.update({
            where: { member_no: item.member_no },
            data: { membership_status: item.new_status },
          })
        )
      );
    }
  }

  return {
    total_members_evaluated: members.length,
    updated_to_active: updatedToActive,
    updated_to_inactive: updatedToInactive,
    unchanged_count: unchangedCount,
    lifelong_count: lifelongCount,
    details,
  };
}
