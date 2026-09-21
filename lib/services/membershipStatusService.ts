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

/**
 * ดึงรอบการประชุม 4 ครั้งล่าสุดที่มีผลต่อการคงสถานะสมาชิก (counts_toward_active = true)
 */
export async function getQualifyingActiveMeetings(limit = 4): Promise<QualifyingMeeting[]> {
  try {
    const now = new Date();
    const meetings = await prisma.meetings.findMany({
      where: {
        counts_toward_active: true,
        OR: [
          { status: 'completed' },
          { meeting_date: { lte: now } },
          { start_date: { lte: now } },
        ],
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

  // 2. กรองเฉพาะการประชุมที่จัดขึ้นหลังจากวันที่สมาชิกสมัคร (ถ้ามี applied_at)
  let applicableMeetings = qualifyingMeetings;
  if (member.applied_at) {
    const appliedTime = new Date(member.applied_at).getTime();
    applicableMeetings = qualifyingMeetings.filter((m) => {
      const meetingTime = new Date(m.start_date || m.meeting_date).getTime();
      return meetingTime >= appliedTime;
    });
  }

  // หากเป็นสมาชิกใหม่และยังไม่มีรอบการประชุมหลังจากวันที่สมัคร -> คงสถานะ Active
  if (applicableMeetings.length === 0) {
    return {
      member_no: member.member_no,
      membership_type: membershipType,
      current_status: currentStatus,
      calculated_status: 'Active',
      is_lifelong: false,
      qualifying_meetings_total: 0,
      attended_count: 0,
      missed_count: 0,
      attended_meeting_ids: [],
      qualifying_meetings: [],
      reason: 'สมาชิกใหม่ ยังไม่มีรอบการประชุมที่ต้องประเมิน',
    };
  }

  // 3. ตรวจสอบการเข้าร่วมประชุมในรอบที่มีผลต่อสถานะ
  const memberAttendedIds = new Set(member.meeting_attendances.map((a) => a.meeting_id));
  const attendedInQualifying = applicableMeetings.filter((m) => memberAttendedIds.has(m.meeting_id));
  const attendedCount = attendedInQualifying.length;
  const missedCount = applicableMeetings.length - attendedCount;

  // กฎ: ถ้าขาดประชุมครบทั้ง 4 ครั้ง (หรือทุกครั้งที่กำหนด) = Inactive
  // ถ้าเข้าอย่างน้อย 1 ครั้ง = Active
  const calculatedStatus: 'Active' | 'Inactive' = attendedCount > 0 ? 'Active' : 'Inactive';
  const reason =
    calculatedStatus === 'Active'
      ? `เข้าร่วมประชุม ${attendedCount} จาก ${applicableMeetings.length} ครั้งล่าสุด`
      : `ขาดการประชุมติดต่อกัน ${missedCount} ครั้งล่าสุด (สถานะหมดอายุ)`;

  return {
    member_no: member.member_no,
    membership_type: membershipType,
    current_status: currentStatus,
    calculated_status: calculatedStatus,
    is_lifelong: false,
    qualifying_meetings_total: applicableMeetings.length,
    attended_count: attendedCount,
    missed_count: missedCount,
    attended_meeting_ids: Array.from(memberAttendedIds),
    qualifying_meetings: applicableMeetings,
    reason,
  };
}

/**
 * ประมวลผลและอัปเดตสถานะของสมาชิกทั้งระบบตามกฎ 4 ครั้งล่าสุด (Batch Sync)
 */
export async function batchSyncAllMemberStatuses(dryRun = false): Promise<SyncStatusResult> {
  const qualifyingMeetings = await getQualifyingActiveMeetings(4);
  const qualifyingMeetingIds = new Set(qualifyingMeetings.map((m) => m.meeting_id));

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

    if (isLifelong) {
      lifelongCount++;
      if (currentStatus.toLowerCase() !== 'active') {
        updatesToRun.push({ member_no: m.member_no, new_status: 'Active' });
        updatedToActive++;
        details.push({
          member_no: m.member_no,
          full_name_th: m.fullNameTh,
          previous_status: currentStatus,
          new_status: 'Active',
          attended_count: m.meeting_attendances.length,
          qualifying_count: qualifyingMeetings.length,
          reason: 'สมาชิกตลอดชีพ (ปรับเป็น Active)',
        });
      } else {
        unchangedCount++;
      }
      continue;
    }

    // กรองรอบการประชุมหลังจากสมัคร
    let applicableMeetings = qualifyingMeetings;
    if (m.applied_at) {
      const appliedTime = new Date(m.applied_at).getTime();
      applicableMeetings = qualifyingMeetings.filter((qm) => {
        const meetingTime = new Date(qm.start_date || qm.meeting_date).getTime();
        return meetingTime >= appliedTime;
      });
    }

    if (applicableMeetings.length === 0) {
      unchangedCount++;
      continue;
    }

    const memberAttendedIds = new Set(m.meeting_attendances.map((a) => a.meeting_id));
    const attendedCount = applicableMeetings.filter((qm) => memberAttendedIds.has(qm.meeting_id)).length;
    const missedCount = applicableMeetings.length - attendedCount;

    const newStatus: 'Active' | 'Inactive' = attendedCount > 0 ? 'Active' : 'Inactive';

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
        qualifying_count: applicableMeetings.length,
        reason:
          newStatus === 'Active'
            ? `เข้าร่วมประชุม ${attendedCount}/${applicableMeetings.length} ครั้งล่าสุด`
            : `ขาดการประชุมติดต่อกัน ${missedCount} ครั้งล่าสุด`,
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
