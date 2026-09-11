import { CreateMemberInput, UpdateMemberInput } from '@/types/member';
import prisma from '@/lib/prisma';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Regex Patterns
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// เบอร์โทรศัพท์ไทย: 9 หลัก (เบอร์บ้าน 02, 03, 04, 05, 07) หรือ 10 หลัก (เบอร์มือถือ 06, 08, 09) หรือ +66
const THAI_PHONE_REGEX = /^(0[2-9][0-9]{7,8}|\+66[2-9][0-9]{7,8})$/;
const ID_LAST4_REGEX = /^[0-9]{4}$/;

/**
 * รูปแบบ Pattern อันตรายที่เสี่ยงต่อ SQL Injection หรือ Script Attack
 */
const SQL_INJECTION_PATTERNS = [
  /(\b(union|select|insert|update|delete|drop|alter|truncate|exec|execute|xp_)\b)/i,
  /(--|#|\/\*|\*\/)/,
  /('|\b)(or|and)\b\s*(\d+=\d+|'[^']*'='[^']*')/i,
  /(\b0x[0-9a-f]+\b)/i,
  /(<script\b[^>]*>([\s\S]*?)<\/script>)/i,
];

/**
 * ฟังก์ชันทำความสะอาดข้อความ (Sanitize Input)
 * - ตัดช่องว่างหัวท้าย
 * - ลบ Null bytes (\0) และ Control Characters
 * - ลบ HTML/Script tags เบื้องต้นเพื่อป้องกัน XSS
 */
export function sanitizeString(val: string | null | undefined): string {
  if (val === null || val === undefined) return '';
  return val
    .replace(/\0/g, '') // ลบ Null byte
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // ลบ Control characters
    .replace(/<[^>]*>?/gm, '') // ลบ HTML tags
    .trim();
}

/**
 * ตรวจสอบข้อความว่ามี SQL Injection Pattern ที่น่าสงสัยหรือไม่
 */
export function containsSuspiciousPattern(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(val));
}

/**
 * ทำความสะอาดและ Normalize ข้อมูลทั้งชุดของ Member Input
 */
export function sanitizeMemberInput<T extends CreateMemberInput | UpdateMemberInput>(input: T): T {
  const sanitized = { ...input };

  if (sanitized.full_name_th !== undefined && sanitized.full_name_th !== null) {
    sanitized.full_name_th = sanitizeString(sanitized.full_name_th);
  }
  if (sanitized.full_name_en !== undefined && sanitized.full_name_en !== null) {
    sanitized.full_name_en = sanitizeString(sanitized.full_name_en);
  }
  if (sanitized.id_last4 !== undefined && sanitized.id_last4 !== null) {
    sanitized.id_last4 = sanitizeString(sanitized.id_last4);
  }
  if (sanitized.mobile !== undefined && sanitized.mobile !== null) {
    // ลบช่องว่างและขีดออก เพื่อเก็บเป็นตัวเลขมาตรฐาน
    sanitized.mobile = sanitized.mobile.replace(/[\s\-]/g, '').trim();
  }
  if (sanitized.email !== undefined && sanitized.email !== null) {
    sanitized.email = sanitizeString(sanitized.email).toLowerCase();
  }
  if (sanitized.line_id !== undefined && sanitized.line_id !== null) {
    sanitized.line_id = sanitizeString(sanitized.line_id);
  }
  if (sanitized.workplace !== undefined && sanitized.workplace !== null) {
    sanitized.workplace = sanitizeString(sanitized.workplace);
  }
  if (sanitized.position !== undefined && sanitized.position !== null) {
    sanitized.position = sanitizeString(sanitized.position);
  }
  if (sanitized.member_type_other !== undefined && sanitized.member_type_other !== null) {
    sanitized.member_type_other = sanitizeString(sanitized.member_type_other);
  }
  if (sanitized.scientist_reg_no !== undefined && sanitized.scientist_reg_no !== null) {
    sanitized.scientist_reg_no = sanitizeString(sanitized.scientist_reg_no);
  }
  if (sanitized.scientist_reg_nw !== undefined && sanitized.scientist_reg_nw !== null) {
    sanitized.scientist_reg_nw = sanitizeString(sanitized.scientist_reg_nw);
  }

  if (sanitized.educations && Array.isArray(sanitized.educations)) {
    sanitized.educations = sanitized.educations.map((edu) => ({
      ...edu,
      degree: edu.degree ? sanitizeString(edu.degree) : null,
      institution: edu.institution ? sanitizeString(edu.institution) : null,
    }));
  }

  return sanitized;
}

/**
 * 1. ตรวจสอบความถูกต้องของข้อมูลใบสมัครสมาชิก (Create Member Validation)
 */
export async function validateCreateMember(
  rawInput: CreateMemberInput,
  options: { checkDuplicates?: boolean } = { checkDuplicates: true }
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const input = sanitizeMemberInput(rawInput);

  // ตรวจสอบ SQL Injection / Script Attack ในทุกฟิลด์ที่เป็นข้อความ
  const textFieldsToCheck: Array<[string, string | null | undefined]> = [
    ['full_name_th', input.full_name_th],
    ['full_name_en', input.full_name_en],
    ['workplace', input.workplace],
    ['position', input.position],
    ['line_id', input.line_id],
    ['member_type_other', input.member_type_other],
    ['scientist_reg_no', input.scientist_reg_no],
    ['scientist_reg_nw', input.scientist_reg_nw],
  ];

  for (const [fieldName, val] of textFieldsToCheck) {
    if (val && containsSuspiciousPattern(val)) {
      errors.push({
        field: fieldName,
        message: `ฟิลด์ ${fieldName} มีตัวอักษรหรือคำสั่งที่ไม่ปลอดภัย (ตรวจพบรูปแบบที่ต้องสงสัย)`,
      });
    }
  }

  // 1. ตรวจสอบชื่อ-นามสกุล ภาษาไทย (จำเป็นต้องกรอก)
  if (!input.full_name_th || input.full_name_th.trim() === '') {
    errors.push({ field: 'full_name_th', message: 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)' });
  } else if (input.full_name_th.length > 255) {
    errors.push({ field: 'full_name_th', message: 'ชื่อ-นามสกุล (ภาษาไทย) ต้องไม่เกิน 255 ตัวอักษร' });
  }

  // 2. ตรวจสอบชื่อ-นามสกุล ภาษาอังกฤษ
  if (input.full_name_en && input.full_name_en.length > 255) {
    errors.push({ field: 'full_name_en', message: 'ชื่อ-นามสกุล (ภาษาอังกฤษ) ต้องไม่เกิน 255 ตัวอักษร' });
  }

  // 3. ตรวจสอบเลขบัตรประชาชน 4 หลักท้าย
  if (input.id_last4 && input.id_last4 !== '') {
    if (!ID_LAST4_REGEX.test(input.id_last4)) {
      errors.push({ field: 'id_last4', message: 'เลขประจำตัว 4 หลักท้ายต้องเป็นตัวเลข 4 หลักเท่านั้น (เช่น 1234)' });
    }
  }

  // 4. ตรวจสอบเบอร์โทรศัพท์ (จำกัด 9 หรือ 10 หลักตามมาตรฐานไทย เช่น 0812345678 หรือ 021234567)
  if (input.mobile && input.mobile !== '') {
    const cleanPhone = input.mobile.replace(/[\s\-]/g, '');
    if (!THAI_PHONE_REGEX.test(cleanPhone)) {
      errors.push({
        field: 'mobile',
        message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9 หรือ 10 หลัก และขึ้นต้นด้วย 0 หรือ +66 (เช่น 0812345678, 021234567)',
      });
    }
  }

  // 5. ตรวจสอบอีเมล
  if (input.email && input.email !== '') {
    if (!EMAIL_REGEX.test(input.email)) {
      errors.push({ field: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง (เช่น user@example.com)' });
    } else if (options.checkDuplicates) {
      // ตรวจสอบอีเมลซ้ำในระบบ (ใช้ Prisma Parameterized Query ปลอดภัยจาก SQLi)
      const existingEmail = await prisma.member.findFirst({
        where: { email: { equals: input.email, mode: 'insensitive' } },
        select: { member_no: true },
      });

      if (existingEmail) {
        errors.push({
          field: 'email',
          message: `อีเมลนี้ (${input.email}) มีผู้ใช้งานในระบบแล้ว (รหัสสมาชิก: ${existingEmail.member_no})`,
        });
      }
    }
  }

  // 6. ตรวจสอบประเภทสมาชิก (member_type: 0-6)
  if (input.member_type !== undefined && input.member_type !== null) {
    const typeNum = Number(input.member_type);
    if (isNaN(typeNum) || typeNum < 0 || typeNum > 6) {
      errors.push({ field: 'member_type', message: 'ประเภทสมาชิกต้องมีค่าระหว่าง 0 ถึง 6' });
    } else if (typeNum === 0 && (!input.member_type_other || input.member_type_other.trim() === '')) {
      errors.push({ field: 'member_type_other', message: 'กรณีเลือกประเภทสมาชิก "อื่นๆ" กรุณาระบุรายละเอียดเพิ่มเติม' });
    }
  }

  // 7. ตรวจสอบวันที่เริ่มงาน (start_date)
  if (input.start_date && input.start_date.trim() !== '') {
    const dateParsed = new Date(input.start_date);
    if (isNaN(dateParsed.getTime())) {
      errors.push({ field: 'start_date', message: 'รูปแบบวันที่เริ่มงานไม่ถูกต้อง (ต้องเป็นรูปแบบ YYYY-MM-DD)' });
    }
  }

  // 8. ตรวจสอบข้อมูลวุฒิการศึกษา (educations)
  if (input.educations && Array.isArray(input.educations)) {
    input.educations.forEach((edu, index) => {
      const rowNum = index + 1;
      if (edu.graduation_year) {
        const year = Number(edu.graduation_year);
        // รองรับทั้ง พ.ศ. (2450-2650) และ ค.ศ. (1900-2100)
        if (isNaN(year) || year < 1900 || (year > 2100 && year < 2450) || year > 2650) {
          errors.push({
            field: `educations[${index}].graduation_year`,
            message: `แถวที่ ${rowNum}: ปีที่จบการศึกษา (${edu.graduation_year}) ไม่ถูกต้อง`,
          });
        }
      }
      if (edu.degree && edu.degree.length > 255) {
        errors.push({
          field: `educations[${index}].degree`,
          message: `แถวที่ ${rowNum}: ชื่อวุฒิการศึกษาต้องไม่เกิน 255 ตัวอักษร`,
        });
      }
      if (edu.institution && edu.institution.length > 255) {
        errors.push({
          field: `educations[${index}].institution`,
          message: `แถวที่ ${rowNum}: ชื่อสถาบันการศึกษาต้องไม่เกิน 255 ตัวอักษร`,
        });
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 2. ตรวจสอบความถูกต้องของการแก้ไขข้อมูล (Update Member Validation)
 */
export async function validateUpdateMember(
  memberId: string | number | bigint,
  rawInput: UpdateMemberInput
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];
  const currentId = typeof memberId === 'bigint' ? memberId : BigInt(memberId);
  const input = sanitizeMemberInput(rawInput);

  // ตรวจสอบ SQL Injection / Script Attack ในทุกฟิลด์ที่ส่งมาแก้ไข
  const textFieldsToCheck: Array<[string, string | null | undefined]> = [
    ['full_name_th', input.full_name_th],
    ['full_name_en', input.full_name_en],
    ['workplace', input.workplace],
    ['position', input.position],
    ['line_id', input.line_id],
    ['member_type_other', input.member_type_other],
    ['scientist_reg_no', input.scientist_reg_no],
    ['scientist_reg_nw', input.scientist_reg_nw],
  ];

  for (const [fieldName, val] of textFieldsToCheck) {
    if (val && containsSuspiciousPattern(val)) {
      errors.push({
        field: fieldName,
        message: `ฟิลด์ ${fieldName} มีตัวอักษรหรือคำสั่งที่ไม่ปลอดภัย (ตรวจพบรูปแบบที่ต้องสงสัย)`,
      });
    }
  }

  // 1. ตรวจสอบชื่อ-นามสกุล ภาษาไทย (ถ้าส่งมา)
  if (input.full_name_th !== undefined) {
    if (!input.full_name_th || input.full_name_th.trim() === '') {
      errors.push({ field: 'full_name_th', message: 'ชื่อ-นามสกุล (ภาษาไทย) ไม่สามารถเว้นว่างได้' });
    } else if (input.full_name_th.length > 255) {
      errors.push({ field: 'full_name_th', message: 'ชื่อ-นามสกุล (ภาษาไทย) ต้องไม่เกิน 255 ตัวอักษร' });
    }
  }

  // 2. ตรวจสอบเลขบัตรประชาชน 4 หลักท้าย
  if (input.id_last4 !== undefined && input.id_last4 !== null && input.id_last4 !== '') {
    if (!ID_LAST4_REGEX.test(input.id_last4)) {
      errors.push({ field: 'id_last4', message: 'เลขประจำตัว 4 หลักท้ายต้องเป็นตัวเลข 4 หลักเท่านั้น' });
    }
  }

  // 3. ตรวจสอบเบอร์โทรศัพท์ (9 หรือ 10 หลัก)
  if (input.mobile !== undefined && input.mobile !== null && input.mobile !== '') {
    const cleanPhone = input.mobile.replace(/[\s\-]/g, '');
    if (!THAI_PHONE_REGEX.test(cleanPhone)) {
      errors.push({
        field: 'mobile',
        message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 9 หรือ 10 หลัก และขึ้นต้นด้วย 0 หรือ +66 (เช่น 0812345678, 021234567)',
      });
    }
  }

  // 4. ตรวจสอบอีเมล (ไม่ให้ซ้ำกับสมาชิกคนอื่น)
  if (input.email !== undefined && input.email !== null && input.email !== '') {
    if (!EMAIL_REGEX.test(input.email)) {
      errors.push({ field: 'email', message: 'รูปแบบอีเมลไม่ถูกต้อง' });
    } else {
      const strCurrentId = String(currentId).trim();
      const duplicateMember = await prisma.member.findFirst({
        where: {
          email: { equals: input.email, mode: 'insensitive' },
          member_no: { not: strCurrentId },
        },
        select: { member_no: true },
      });

      if (duplicateMember) {
        errors.push({
          field: 'email',
          message: `อีเมลนี้ (${input.email}) มีสมาชิกคนอื่นใช้งานแล้ว (รหัส: ${duplicateMember.member_no})`,
        });
      }
    }
  }

  // 5. ตรวจสอบประเภทสมาชิก
  if (input.member_type !== undefined && input.member_type !== null) {
    const typeNum = Number(input.member_type);
    if (isNaN(typeNum) || typeNum < 0 || typeNum > 6) {
      errors.push({ field: 'member_type', message: 'ประเภทสมาชิกต้องมีค่าระหว่าง 0 ถึง 6' });
    } else if (typeNum === 0 && (!input.member_type_other || input.member_type_other.trim() === '')) {
      errors.push({ field: 'member_type_other', message: 'กรณีเลือกประเภทสมาชิก "อื่นๆ" กรุณาระบุรายละเอียดเพิ่มเติม' });
    }
  }

  // 6. ตรวจสอบวันที่เริ่มงาน
  if (input.start_date !== undefined && input.start_date !== null && input.start_date.trim() !== '') {
    const dateParsed = new Date(input.start_date);
    if (isNaN(dateParsed.getTime())) {
      errors.push({ field: 'start_date', message: 'รูปแบบวันที่เริ่มงานไม่ถูกต้อง' });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
