/**
 * ประเภทสมาชิก TSRM
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
  workplace?: string | null; // ที่ทำงาน
  start_date?: string | null; // วันที่เริ่มงาน (YYYY-MM-DD)
  position?: string | null; // ตำแหน่ง
  member_type?: MemberType | null; // ประเภทสมาชิก (0-6)
  member_type_other?: string | null; // ระบุกรณีเลือก 0 อื่นๆ
  scientist_reg_no?: string | null; // เลขทะเบียนนักวิทย์
  scientist_reg_nw?: string | null; // นว.
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
  workplace?: string | null;
  start_date?: string | null;
  position?: string | null;
  member_type?: MemberType | null;
  member_type_other?: string | null;
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
  workplace?: string | null;
  start_date?: string | null;
  position?: string | null;
  member_type?: MemberType | null;
  member_type_other?: string | null;
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
  member_type?: string | number;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'updated_at' | 'full_name_th' | 'code' | 'membership_no' | 'member_no';
  order?: 'asc' | 'desc';
}

/**
 * ApiResponse format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
