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
} from '@/types/member';

// Type helper for raw query sequence result
interface NextSeqResult {
  code?: string;
  membership_no?: string;
}

/**
 * Format Prisma Member Model to Frontend/API Safe DTO (Handles BigInt & Dates)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMemberDto(member: any): Member {
  return {
    member_id: member.memberId.toString(),
    code: member.code,
    membership_no: member.membershipNo,
    full_name_th: member.fullNameTh,
    full_name_en: member.fullNameEn ?? null,
    id_last4: member.idLast4 ?? null,
    mobile: member.mobile ?? null,
    email: member.email ?? null,
    line_id: member.lineId ?? null,
    workplace: member.workplace ?? null,
    start_date: member.startDate ? new Date(member.startDate).toISOString().split('T')[0] : null,
    position: member.position ?? null,
    member_type: member.memberType as MemberType | null,
    member_type_other: member.memberTypeOther ?? null,
    scientist_reg_no: member.scientistRegNo ?? null,
    scientist_reg_nw: member.scientistRegNw ?? null,
    photo_path: member.photoPath ?? null,
    qr_code_path: member.qrCodePath ?? null,
    created_at: new Date(member.createdAt).toISOString(),
    updated_at: new Date(member.updatedAt).toISOString(),
    educations: Array.isArray(member.educations)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? member.educations.map((edu: any): MemberEducation => ({
          education_id: edu.educationId ? edu.educationId.toString() : undefined,
          member_id: edu.memberId ? edu.memberId.toString() : undefined,
          degree: edu.degree ?? null,
          institution: edu.institution ?? null,
          graduation_year: edu.graduationYear ?? null,
          display_order: edu.displayOrder ?? 1,
        }))
      : undefined,
  };
}

/**
 * ดึงเลขรหัส (code) และเลขสมาชิก (membership_no) ถัดไปจาก Sequence ใน PostgreSQL
 */
export async function getNextMemberCodes(): Promise<{ code: string; membershipNo: string }> {
  try {
    const rawResult = await prisma.$queryRaw<NextSeqResult[]>`
      SELECT 
        lpad(nextval('code_seq')::TEXT, 6, '0') AS code,
        lpad(nextval('membership_no_seq')::TEXT, 6, '0') AS membership_no
    `;

    if (rawResult && rawResult.length > 0 && rawResult[0].code && rawResult[0].membership_no) {
      return {
        code: rawResult[0].code,
        membershipNo: rawResult[0].membership_no,
      };
    }
  } catch (error) {
    console.warn('Postgres sequence nextval failed or not yet initialized, falling back to manual generation:', error);
  }

  // Fallback if sequences are not created in database
  const count = await prisma.member.count();
  const nextNum = (count + 1).toString().padStart(6, '0');
  return {
    code: nextNum,
    membershipNo: nextNum,
  };
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
 * 1. สร้างสมาชิกใหม่ (Create Member) พร้อมประวัติการศึกษาและ QR Code
 */
export async function createMember(rawInput: CreateMemberInput): Promise<Member> {
  const input = sanitizeMemberInput(rawInput);

  // ดึงรหัสอัตโนมัติ
  const { code, membershipNo } = await getNextMemberCodes();

  // สร้าง QR Code (อ้างอิงจาก code หรือ verify URL)
  const qrCodeData = await generateQrCode(code);

  // Parse start_date if provided
  const parsedStartDate = input.start_date ? new Date(input.start_date) : null;

  const newMember = await prisma.member.create({
    data: {
      code,
      membershipNo,
      fullNameTh: input.full_name_th,
      fullNameEn: input.full_name_en,
      idLast4: input.id_last4,
      mobile: input.mobile,
      email: input.email,
      lineId: input.line_id,
      workplace: input.workplace,
      startDate: parsedStartDate,
      position: input.position,
      memberType: input.member_type !== undefined ? input.member_type : null,
      memberTypeOther: input.member_type_other,
      scientistRegNo: input.scientist_reg_no,
      scientistRegNw: input.scientist_reg_nw,
      photoPath: input.photo_path,
      qrCodePath: qrCodeData,
      educations: input.educations && input.educations.length > 0
        ? {
            create: input.educations.map((edu, idx) => ({
              degree: edu.degree,
              institution: edu.institution,
              graduationYear: edu.graduation_year,
              displayOrder: edu.display_order ?? idx + 1,
            })),
          }
        : undefined,
    },
    include: {
      educations: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
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

  // ค้นหาตามคำค้นหา (ทำความสะอาดข้อความเพื่อความปลอดภัย)
  if (params.search && params.search.trim() !== '') {
    const searchClean = sanitizeString(params.search);
    if (searchClean !== '') {
      where.OR = [
        { fullNameTh: { contains: searchClean, mode: 'insensitive' } },
        { fullNameEn: { contains: searchClean, mode: 'insensitive' } },
        { code: { contains: searchClean, mode: 'insensitive' } },
        { membershipNo: { contains: searchClean, mode: 'insensitive' } },
        { mobile: { contains: searchClean, mode: 'insensitive' } },
        { email: { contains: searchClean, mode: 'insensitive' } },
        { workplace: { contains: searchClean, mode: 'insensitive' } },
      ];
    }
  }

  // กรองตามประเภทสมาชิก
  if (params.member_type !== undefined && params.member_type !== '' && params.member_type !== null) {
    where.memberType = Number(params.member_type);
  }

  // การจัดเรียง
  const sortBy = params.sort_by || 'created_at';
  const order = params.order === 'asc' ? 'asc' : 'desc';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any = {};
  if (sortBy === 'created_at') orderBy.createdAt = order;
  else if (sortBy === 'updated_at') orderBy.updatedAt = order;
  else if (sortBy === 'full_name_th') orderBy.fullNameTh = order;
  else if (sortBy === 'code') orderBy.code = order;
  else if (sortBy === 'membership_no') orderBy.membershipNo = order;
  else orderBy.createdAt = 'desc';

  const [total, members] = await Promise.all([
    prisma.member.count({ where }),
    prisma.member.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        educations: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    }),
  ]);

  return {
    data: members.map(toMemberDto),
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    },
  };
}

/**
 * 3. ดึงข้อมูลสมาชิกระบุ ID
 */
export async function getMemberById(id: string | number | bigint): Promise<Member | null> {
  const memberId = typeof id === 'bigint' ? id : BigInt(id);

  const member = await prisma.member.findUnique({
    where: { memberId },
    include: {
      educations: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  if (!member) return null;
  return toMemberDto(member);
}

/**
 * 4. ค้นหาหรือตรวจสอบสมาชิกด้วย code หรือ membership_no (สำหรับสแกน QR)
 */
export async function getMemberByCodeOrNo(identifier: string): Promise<Member | null> {
  const trimmed = sanitizeString(identifier);
  if (!trimmed) return null;

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        { code: trimmed },
        { membershipNo: trimmed },
      ],
    },
    include: {
      educations: {
        orderBy: {
          displayOrder: 'asc',
        },
      },
    },
  });

  if (!member) return null;
  return toMemberDto(member);
}

/**
 * 5. อัปเดตข้อมูลสมาชิก (Update Member)
 */
export async function updateMember(id: string | number | bigint, rawInput: UpdateMemberInput): Promise<Member | null> {
  const memberId = typeof id === 'bigint' ? id : BigInt(id);
  const input = sanitizeMemberInput(rawInput);

  // ตรวจสอบว่ามีสมาชิกนี้อยู่หรือไม่
  const existing = await prisma.member.findUnique({
    where: { memberId },
  });

  if (!existing) return null;

  // ดำเนินการ Transaction สำหรับอัปเดตสมาชิกและรายการศึกษา
  const updated = await prisma.$transaction(async (tx) => {
    // อัปเดตตารางวุฒิการศึกษา หากส่งมา
    if (input.educations !== undefined) {
      // ลบรายการเดิมทั้งหมด
      await tx.memberEducation.deleteMany({
        where: { memberId },
      });

      // เพิ่มรายการใหม่
      if (input.educations.length > 0) {
        await tx.memberEducation.createMany({
          data: input.educations.map((edu, idx) => ({
            memberId,
            degree: edu.degree,
            institution: edu.institution,
            graduationYear: edu.graduation_year,
            displayOrder: edu.display_order ?? idx + 1,
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
    if (input.line_id !== undefined) updateData.lineId = input.line_id;
    if (input.workplace !== undefined) updateData.workplace = input.workplace;
    if (input.start_date !== undefined) {
      updateData.startDate = input.start_date ? new Date(input.start_date) : null;
    }
    if (input.position !== undefined) updateData.position = input.position;
    if (input.member_type !== undefined) updateData.memberType = input.member_type;
    if (input.member_type_other !== undefined) updateData.memberTypeOther = input.member_type_other;
    if (input.scientist_reg_no !== undefined) updateData.scientistRegNo = input.scientist_reg_no;
    if (input.scientist_reg_nw !== undefined) updateData.scientistRegNw = input.scientist_reg_nw;
    if (input.photo_path !== undefined) updateData.photoPath = input.photo_path;

    return await tx.member.update({
      where: { memberId },
      data: updateData,
      include: {
        educations: {
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });
  });

  return toMemberDto(updated);
}

/**
 * 6. ลบสมาชิก (Delete Member)
 */
export async function deleteMember(id: string | number | bigint): Promise<boolean> {
  const memberId = typeof id === 'bigint' ? id : BigInt(id);

  try {
    await prisma.member.delete({
      where: { memberId },
    });
    return true;
  } catch (error) {
    console.error('Delete member error:', error);
    return false;
  }
}
