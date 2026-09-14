/**
 * สาขาวิชาชีพ / ตำแหน่ง (Job Category) ใน TSRM
 */
export enum MemberType {
  OTHER = 0,
  RM = 1,
  FELLOW_RM = 2,
  EMBRYOLOGIST = 3,
  TECHNOLOGIST_ANDROLOGY = 4,
  MOLECULAR_GENETICIST = 5,
  NURSE = 6,
}

export const MEMBER_TYPE_LABELS: Record<MemberType, string> = {
  [MemberType.OTHER]: "อื่นๆ",
  [MemberType.RM]: "RM",
  [MemberType.FELLOW_RM]: "Fellow RM",
  [MemberType.EMBRYOLOGIST]: "Embryologist",
  [MemberType.TECHNOLOGIST_ANDROLOGY]: "Technologist for Andrology",
  [MemberType.MOLECULAR_GENETICIST]: "Molecular Geneticist",
  [MemberType.NURSE]: "Nurse",
};

export const JOB_CATEGORIES = [
  'RM',
  'Fellow RM',
  'Embryologist',
  'Technologist for Andrology',
  'Molecular Geneticist',
  'Nurse',
  'อื่นๆ',
] as const;

/**
 * ประเภทสมาชิก TSRM (สามัญ / ตลอดชีพ)
 */
export const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  Regular: "สมาชิกสามัญ",
  Lifelong: "สมาชิกตลอดชีพ",
};

/**
 * สถานะสมาชิก TSRM (Active / Inactive)
 */
export const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  Active: "ปกติ",
  Inactive: "หมดอายุ",
};

/**
 * ข้อมูลสมาชิก TSRM (ตาราง members)
 */
export interface Member {
  member_id: string; // Serialized from BigInt for JSON safety
  member_no?: string; // เลขที่สมาชิก VARCHAR(20) เช่น "0001", "1281"
  code: string; // รหัสสมาชิก เช่น "0001"
  membership_no: string; // เลขสมาชิก เช่น "0001"
  full_name_th: string; // ชื่อ-นามสกุล ภาษาไทย
  full_name_en?: string | null; // Name ภาษาอังกฤษ
  id_last4?: string | null; // เลขบัตรประชาชน/บัตรอื่น 4 หลักท้าย
  mobile?: string | null; // หมายเลขโทรศัพท์
  email?: string | null; // อีเมล
  line_id?: string | null; // Line ID
  address?: string | null; // ที่อยู่
  workplace?: string | null; // ที่ทำงาน
  work_phone?: string | null; // เบอร์โทรที่ทำงาน
  start_date?: string | null; // วันที่เริ่มงาน (YYYY-MM-DD)
  position?: string | null; // ตำแหน่ง
  job_category?: string | null; // สาขาวิชาชีพ / ตำแหน่งวิชาชีพ เช่น RM, Embryologist
  member_type?: MemberType | null; // รหัสสาขาวิชาชีพ (0-6)
  member_type_other?: string | null; // ระบุกรณีเลือก 0 อื่นๆ
  scientist_reg_no?: string | null; // เลขทะเบียนนักวิทย์
  scientist_reg_nw?: string | null; // นว.
  membership_status?: string | null; // สถานะสมาชิก เช่น Active, Inactive
  membership_type?: string | null; // ประเภทสมาชิก เช่น Regular (สามัญ), Lifelong (ตลอดชีพ)
  expire_date?: string | null; // วันหมดอายุ
  photo_path?: string | null; // รูปถ่าย (path/URL)
  qr_code_path?: string | null; // QR code (path/URL หรือ Base64 Data URL)
  created_at: string;
  updated_at: string;
  educations?: MemberEducation[];
}

/**
 * ข้อมูลวุฒิการศึกษา (ตาราง member_education)
 */
export interface MemberEducation {
  education_id?: string; // Serialized from BigInt
  member_id?: string;
  degree?: string | null; // วุฒิ / Degree
  institution?: string | null; // สถาบัน / College / University
  graduation_year?: number | null; // ปีที่จบ
  display_order: number; // ลำดับแถวในฟอร์ม
}

/**
 * DTO สำหรับการสร้างสมาชิกใหม่
 */
export interface CreateMemberInput {
  full_name_th: string;
  full_name_en?: string | null;
  id_last4?: string | null;
  mobile?: string | null;
  email?: string | null;
  line_id?: string | null;
  address?: string | null;
  workplace?: string | null;
  work_phone?: string | null;
  start_date?: string | null;
  position?: string | null;
  job_category?: string | null;
  member_type?: MemberType | null;
  member_type_other?: string | null;
  membership_type?: string | null; // Regular | Lifelong
  membership_status?: string | null; // Active | Inactive
  scientist_reg_no?: string | null;
  scientist_reg_nw?: string | null;
  photo_path?: string | null;
  educations?: Omit<MemberEducation, 'education_id' | 'member_id'>[];
}

/**
 * DTO สำหรับการอัปเดตสมาชิก
 */
export interface UpdateMemberInput {
  full_name_th?: string;
  full_name_en?: string | null;
  id_last4?: string | null;
  mobile?: string | null;
  email?: string | null;
  line_id?: string | null;
  address?: string | null;
  workplace?: string | null;
  work_phone?: string | null;
  start_date?: string | null;
  position?: string | null;
  job_category?: string | null;
  member_type?: MemberType | null;
  member_type_other?: string | null;
  membership_type?: string | null; // Regular | Lifelong
  membership_status?: string | null; // Active | Inactive
  scientist_reg_no?: string | null;
  scientist_reg_nw?: string | null;
  photo_path?: string | null;
  educations?: Omit<MemberEducation, 'member_id'>[];
}

/**
 * Filter & Pagination query params
 */
export interface MemberQueryParams {
  search?: string;
  job_category?: string;
  membership_type?: string;
  membership_status?: string;
  member_type?: string | number;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'full_name_th' | 'code' | 'membership_no' | 'member_no';
  order?: 'asc' | 'desc';
}

/**
 * สถิติภาพรวมสมาชิกทั้งหมดในฐานข้อมูล
 */
export interface MemberStats {
  total: number;
  regular_count: number;
  lifelong_count: number;
  active_count: number;
  inactive_count: number;
}

/**
 * ApiResponse format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  stats?: MemberStats;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}

