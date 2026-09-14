import prisma from '@/lib/prisma';
import QRCode from 'qrcode';
import { sanitizeMemberInput, sanitizeString } from '@/lib/validators/memberValidator';
import {
  Member,
  MemberEducation,
  CreateMemberInput,
  UpdateMemberInput,
  MemberQueryParams,
  MemberType,
  MEMBER_TYPE_LABELS,
  MemberStats,
} from '@/types/member';


/**
 * ฟังก์ชันช่วยแปลงค่า job_category (เช่น "RM", "Embryologist", "1") เป็น MemberType Enum
 */
export function parseJobCategoryToMemberType(jobCat: string | number | null | undefined): MemberType | null {
  if (jobCat === null || jobCat === undefined || jobCat === '') return null;
  if (typeof jobCat === 'number') return jobCat as MemberType;
  const str = String(jobCat).trim();
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    return num in MEMBER_TYPE_LABELS ? (num as MemberType) : MemberType.OTHER;
  }
  const lower = str.toLowerCase();
  if (lower === 'rm' || lower.includes('ob-gyn') || lower.includes('obgyn')) return MemberType.RM;
  if (lower.includes('fellow')) return MemberType.FELLOW_RM;
  if (lower.includes('embryo')) return MemberType.EMBRYOLOGIST;
  if (lower.includes('andrology') || lower === 'technologist sa') return MemberType.TECHNOLOGIST_ANDROLOGY;
  if (lower.includes('pgt') || lower.includes('genetic')) return MemberType.MOLECULAR_GENETICIST;
  if (lower.includes('nurse')) return MemberType.NURSE;
  return MemberType.OTHER;
}

/**
 * Format Prisma Member Model to Frontend/API Safe DTO (Handles BigInt & Dates)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMemberDto(member: any): Member {
  const memberNo = member.member_no ? String(member.member_no).padStart(4, '0') : '';
  const memberId = member.id ? member.id.toString() : memberNo;
  const rawJobCategory = member.job_category ?? null;
  const memberType = parseJobCategoryToMemberType(rawJobCategory);

  // ตำแหน่ง: หากไม่มีค่า position ให้ดึงจาก job_category หรือประเภทสมาชิกอัตโนมัติ
  const resolvedPosition =
    member.position && member.position.trim() !== ''
      ? member.position
      : rawJobCategory
      ? (MEMBER_TYPE_LABELS[memberType as MemberType] || rawJobCategory)
      : null;

  return {
    member_id: memberId,
    member_no: memberNo,
    code: memberNo,
    membership_no: memberNo,
    full_name_th: member.fullNameTh || '',
    full_name_en: member.fullNameEn ?? null,
    id_last4: member.idLast4 ?? null,
    mobile: member.mobile ?? null,
    email: member.email ?? null,
    line_id: member.lineId ?? null,
    address: member.address ?? null,
    workplace: member.workplace ?? null,
    work_phone: member.work_phone ?? null,
    start_date: member.work_start_date ? new Date(member.work_start_date).toISOString().split('T')[0] : null,
    position: resolvedPosition,
    job_category: rawJobCategory,
    member_type: memberType,
    member_type_other: member.job_category_other ?? (memberType === MemberType.OTHER ? rawJobCategory : null),
    scientist_reg_no: member.scientist_license_no ?? null,
    scientist_reg_nw: null,
    membership_status: member.membership_status ?? 'Active',
    membership_type: member.membership_type ?? 'Regular',
    expire_date: member.expire_date ? new Date(member.expire_date).toISOString().split('T')[0] : null,
    photo_path: member.photo_url ?? null,
    qr_code_path: member.qr_code_image_url ?? null,
    created_at: member.applied_at ? new Date(member.applied_at).toISOString() : new Date().toISOString(),
    updated_at: member.applied_at ? new Date(member.applied_at).toISOString() : new Date().toISOString(),
    educations: Array.isArray(member.member_educations)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? member.member_educations.map((edu: any, idx: number): MemberEducation => ({
          education_id: edu.edu_id ? edu.edu_id.toString() : undefined,
          member_id: edu.member_no || memberNo,
          degree: edu.degree ?? null,
          institution: edu.institution ?? null,
          graduation_year: edu.graduation_year ? (isNaN(Number(edu.graduation_year)) ? undefined : Number(edu.graduation_year)) : null,
          display_order: idx + 1,
        }))
      : undefined,
  };
}

/**
 * ดึงเลขรหัสสมาชิก (member_no) ถัดไปจาก Sequence ใน PostgreSQL (4 หลัก)
 */
export async function getNextMemberCodes(): Promise<{ member_no: string }> {
  try {
    const rawResult = await prisma.$queryRaw<Array<{ next_member_no: string }>>`
      SELECT lpad(nextval('member_no_seq')::TEXT, 4, '0') AS next_member_no
    `;

    if (rawResult && rawResult.length > 0 && rawResult[0].next_member_no) {
      return { member_no: rawResult[0].next_member_no };
    }
  } catch (error) {
    console.warn('Postgres sequence member_no_seq failed or not yet initialized, falling back to count:', error);
  }

  // Fallback if sequence is not yet initialized
  const count = await prisma.member.count();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return { member_no: nextNum };
}

/**
 * สร้าง QR Code ในรูปแบบ Data URL (Base64)
 */
export async function generateQrCode(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('QR Code Generation error:', err);
    return '';
  }
}

/**
 * สถิติภาพรวมสมาชิกทั้งหมดจากฐานข้อมูล (Total, Regular, Lifelong, Active, Inactive)
 */
export async function getMemberStats(): Promise<MemberStats> {
  const [total, regularCount, lifelongCount, activeCount, inactiveCount] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({
      where: {
        OR: [
          { membership_type: { equals: 'Regular', mode: 'insensitive' } },
          { membership_type: null },
          { membership_type: '' },
        ],
      },
    }),
    prisma.member.count({
      where: {
        membership_type: { equals: 'Lifelong', mode: 'insensitive' },
      },
    }),
    prisma.member.count({
      where: {
        OR: [
          { membership_status: { equals: 'Active', mode: 'insensitive' } },
          { membership_status: null },
          { membership_status: '' },
        ],
      },
    }),
    prisma.member.count({
      where: {
        membership_status: { equals: 'Inactive', mode: 'insensitive' },
      },
    }),
  ]);

  return {
    total,
    regular_count: regularCount,
    lifelong_count: lifelongCount,
    active_count: activeCount,
    inactive_count: inactiveCount,
  };
}

/**
 * 1. สร้างสมาชิกใหม่ (Create Member) พร้อมประวัติการศึกษาและ QR Code
 */
export async function createMember(rawInput: CreateMemberInput): Promise<Member> {
  const input = sanitizeMemberInput(rawInput);

  // ดึงรหัสสมาชิกอัตโนมัติ
  const { member_no } = await getNextMemberCodes();

  // สร้าง QR Code (อ้างอิงจาก member_no)
  const qrCodeData = await generateQrCode(member_no);

  // Parse start_date if provided
  const parsedStartDate = input.start_date ? new Date(input.start_date) : null;

  const newMember = await prisma.member.create({
    data: {
      member_no,
      fullNameTh: input.full_name_th,
      fullNameEn: input.full_name_en ?? null,
      idLast4: input.id_last4 ?? null,
      mobile: input.mobile ?? null,
      email: input.email ?? null,
      lineId: input.line_id ?? null,
      address: input.address ?? null,
      workplace: input.workplace ?? null,
      work_phone: input.work_phone ?? null,
      work_start_date: parsedStartDate,
      position: input.position ?? null,
      job_category: input.job_category || (input.member_type !== undefined && input.member_type !== null ? (MEMBER_TYPE_LABELS[input.member_type as MemberType] || String(input.member_type)) : null),
      job_category_other: input.member_type_other ?? null,
      membership_type: input.membership_type ?? 'Regular',
      membership_status: input.membership_status ?? 'Active',
      scientist_license_no: input.scientist_reg_no ?? null,
      photo_url: input.photo_path ?? null,
      qr_code_image_url: qrCodeData,
      member_educations: input.educations && input.educations.length > 0
        ? {
            create: input.educations.map((edu) => ({
              degree: edu.degree || '',
              institution: edu.institution || '',
              graduation_year: edu.graduation_year ? String(edu.graduation_year) : null,
            })),
          }
        : undefined,
    },
    include: {
      member_educations: true,
    },
  });

  return toMemberDto(newMember);
}

/**
 * 2. ค้นหาและดึงรายการสมาชิก (Search, Filter, Pagination)
 */
export async function getMembers(params: MemberQueryParams = {}) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andConditions: any[] = [];

  // ค้นหาตามคำค้นหา (ทำความสะอาดข้อความเพื่อความปลอดภัย)
  if (params.search && params.search.trim() !== '') {
    const searchClean = sanitizeString(params.search);
    if (searchClean !== '') {
      andConditions.push({
        OR: [
          { fullNameTh: { contains: searchClean, mode: 'insensitive' } },
          { fullNameEn: { contains: searchClean, mode: 'insensitive' } },
          { member_no: { contains: searchClean, mode: 'insensitive' } },
          { mobile: { contains: searchClean, mode: 'insensitive' } },
          { email: { contains: searchClean, mode: 'insensitive' } },
          { workplace: { contains: searchClean, mode: 'insensitive' } },
          { position: { contains: searchClean, mode: 'insensitive' } },
          { job_category: { contains: searchClean, mode: 'insensitive' } },
        ],
      });
    }
  }

  // กรองตามตำแหน่ง / สาขาวิชาชีพ (Job Category / Member Type)
  const filterCat = params.job_category || (params.member_type !== undefined ? String(params.member_type) : undefined);
  if (
    filterCat !== undefined &&
    filterCat !== '' &&
    filterCat !== null &&
    filterCat !== 'all'
  ) {
    const val = filterCat.trim();
    if (val === '1' || val.toLowerCase() === 'rm') {
      andConditions.push({
        OR: [
          { job_category: '1' },
          { job_category: { equals: 'RM', mode: 'insensitive' } },
          { job_category: { contains: 'OB-GYN', mode: 'insensitive' } },
        ],
      });
    } else if (val === '2' || val.toLowerCase().includes('fellow')) {
      andConditions.push({
        OR: [
          { job_category: '2' },
          { job_category: { contains: 'Fellow', mode: 'insensitive' } },
        ],
      });
    } else if (val === '3' || val.toLowerCase().includes('embryo')) {
      andConditions.push({
        OR: [
          { job_category: '3' },
          { job_category: { contains: 'Embryo', mode: 'insensitive' } },
        ],
      });
    } else if (val === '4' || val.toLowerCase().includes('andrology')) {
      andConditions.push({
        OR: [
          { job_category: '4' },
          { job_category: { contains: 'Andrology', mode: 'insensitive' } },
          { job_category: { contains: 'SA', mode: 'insensitive' } },
        ],
      });
    } else if (val === '5' || val.toLowerCase().includes('genetic') || val.toLowerCase().includes('pgt')) {
      andConditions.push({
        OR: [
          { job_category: '5' },
          { job_category: { contains: 'PGT', mode: 'insensitive' } },
          { job_category: { contains: 'Genetic', mode: 'insensitive' } },
        ],
      });
    } else if (val === '6' || val.toLowerCase().includes('nurse')) {
      andConditions.push({
        OR: [
          { job_category: '6' },
          { job_category: { contains: 'Nurse', mode: 'insensitive' } },
        ],
      });
    } else if (val === '0' || val.toLowerCase().includes('other')) {
      andConditions.push({
        OR: [
          { job_category: '0' },
          { job_category: { contains: 'Other', mode: 'insensitive' } },
          { job_category: { contains: 'อื่นๆ', mode: 'insensitive' } },
          { job_category: { contains: 'Technician', mode: 'insensitive' } },
        ],
      });
    } else {
      andConditions.push({
        job_category: { contains: val, mode: 'insensitive' }
      });
    }
  }

  // กรองตามประเภทสมาชิก (Regular / Lifelong)
  if (params.membership_type && params.membership_type !== 'all') {
    andConditions.push({
      membership_type: { equals: params.membership_type, mode: 'insensitive' }
    });
  }

  // กรองตามสถานะสมาชิก (Active / Inactive)
  if (params.membership_status && params.membership_status !== 'all' && params.membership_status.trim() !== '') {
    andConditions.push({
      membership_status: { equals: params.membership_status, mode: 'insensitive' }
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  // การจัดเรียงเริ่มต้น: รหัสสมาชิกล่าสุด (มากไปน้อย) (member_no desc)
  const sortBy = params.sort_by || 'member_no';
  const order = params.order || 'desc';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any = {};
  if (sortBy === 'created_at') orderBy.applied_at = order;
  else if (sortBy === 'full_name_th') orderBy.fullNameTh = order;
  else if (sortBy === 'member_no' || sortBy === 'code' || sortBy === 'membership_no') orderBy.member_no = order;
  else orderBy.member_no = 'asc';

  const [total, members, stats] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        member_educations: true,
      },
    }),
    getMemberStats(),
  ]);

  return {
    data: members.map(toMemberDto),
    stats,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };

}

/**
 * 3. ดึงข้อมูลสมาชิกระบุ ID หรือ member_no
 */
export async function getMemberById(id: string | number | bigint): Promise<Member | null> {
  const strId = String(id).trim();

  let member = await prisma.member.findUnique({
    where: { member_no: strId },
    include: {
      member_educations: true,
    },
  });

  if (!member && /^\d+$/.test(strId)) {
    try {
      member = await prisma.member.findFirst({
        where: { id: BigInt(strId) },
        include: {
          member_educations: true,
        },
      });
    } catch {
      // ignore
    }
  }

  if (!member) return null;
  return toMemberDto(member);
}

/**
 * 4. ค้นหาหรือตรวจสอบสมาชิกด้วย member_no (สำหรับสแกน QR)
 */
export async function getMemberByCodeOrNo(identifier: string): Promise<Member | null> {
  const trimmed = sanitizeString(identifier);
  if (!trimmed) return null;

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { member_no: trimmed },
        { member_no: trimmed.padStart(4, '0') },
      ],
    },
    include: {
      member_educations: true,
    },
  });

  if (!member) return null;
  return toMemberDto(member);
}

/**
 * 5. อัปเดตข้อมูลสมาชิก (Update Member)
 */
export async function updateMember(id: string | number | bigint, rawInput: UpdateMemberInput): Promise<Member | null> {
  const strId = String(id).trim();
  const input = sanitizeMemberInput(rawInput);

  // ตรวจสอบว่ามีสมาชิกนี้อยู่หรือไม่
  let existing = await prisma.member.findUnique({
    where: { member_no: strId },
  });

  if (!existing && /^\d+$/.test(strId)) {
    existing = await prisma.member.findFirst({
      where: { id: BigInt(strId) },
    });
  }

  if (!existing) return null;

  const member_no = existing.member_no;

  // ดำเนินการ Transaction สำหรับอัปเดตสมาชิกและรายการศึกษา
  const updated = await prisma.$transaction(async (tx) => {
    // อัปเดตตารางวุฒิการศึกษา หากส่งมา
    if (input.educations !== undefined) {
      // ลบรายการเดิมทั้งหมด
      await tx.member_educations.deleteMany({
        where: { member_no },
      });

      // เพิ่มรายการใหม่
      if (input.educations.length > 0) {
        await tx.member_educations.createMany({
          data: input.educations.map((edu) => ({
            member_no,
            degree: edu.degree || '',
            institution: edu.institution || '',
            graduation_year: edu.graduation_year ? String(edu.graduation_year) : null,
          })),
        });
      }
    }

    // อัปเดตข้อมูลหลักของสมาชิก
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    if (input.full_name_th !== undefined) updateData.fullNameTh = input.full_name_th;
    if (input.full_name_en !== undefined) updateData.fullNameEn = input.full_name_en;
    if (input.id_last4 !== undefined) updateData.idLast4 = input.id_last4;
    if (input.mobile !== undefined) updateData.mobile = input.mobile;
    if (input.email !== undefined) updateData.email = input.email;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.workplace !== undefined) updateData.workplace = input.workplace;
    if (input.work_phone !== undefined) updateData.work_phone = input.work_phone;
    if (input.start_date !== undefined) {
      updateData.work_start_date = input.start_date ? new Date(input.start_date) : null;
    }
    if (input.position !== undefined) updateData.position = input.position;
    if (input.job_category !== undefined) {
      updateData.job_category = input.job_category;
    } else if (input.member_type !== undefined) {
      updateData.job_category = input.member_type !== null ? (MEMBER_TYPE_LABELS[input.member_type as MemberType] || String(input.member_type)) : null;
    }
    if (input.member_type_other !== undefined) updateData.job_category_other = input.member_type_other;
    if (input.membership_type !== undefined) updateData.membership_type = input.membership_type;
    if (input.membership_status !== undefined) updateData.membership_status = input.membership_status;
    if (input.scientist_reg_no !== undefined) updateData.scientist_license_no = input.scientist_reg_no;
    if (input.photo_path !== undefined) updateData.photo_url = input.photo_path;

    return await tx.member.update({
      where: { member_no },
      data: updateData,
      include: {
        member_educations: true,
      },
    });
  });

  return toMemberDto(updated);
}

/**
 * 6. ลบสมาชิก (Delete Member)
 */
export async function deleteMember(id: string | number | bigint): Promise<boolean> {
  const strId = String(id).trim();

  try {
    let member_no = strId;
    const existing = await prisma.member.findUnique({
      where: { member_no: strId },
      select: { member_no: true },
    });

    if (!existing && /^\d+$/.test(strId)) {
      const byId = await prisma.member.findFirst({
        where: { id: BigInt(strId) },
        select: { member_no: true },
      });
      if (byId) member_no = byId.member_no;
    }

    await prisma.member.delete({
      where: { member_no },
    });
    return true;
  } catch (error) {
    console.error('Delete member error:', error);
    return false;
  }
}
