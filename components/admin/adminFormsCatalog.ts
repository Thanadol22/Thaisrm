import type { AdminTab } from '@/components/AdminNavbar';

/**
 * รายการฟอร์มทั้งหมดของระบบ แยกตามกลุ่มผู้ใช้ — ใช้ร่วมกันในหน้าแดชบอร์ดและเมนูฟอร์มลงทะเบียนของแอดมิน
 * เพิ่มฟอร์มใหม่ที่นี่ที่เดียว แล้วจะแสดงในทุกหน้าที่ใช้รายการนี้
 */

export type FormAudience = 'public' | 'company' | 'staff' | 'admin';

export type FormAction =
  /** เปิดหน้าฟอร์มในแท็บใหม่ (และคัดลอกลิงก์ได้) */
  | { kind: 'open'; label: string; href: string }
  /** ไปยังเมนูของแอดมิน */
  | { kind: 'tab'; label: string; tab: AdminTab }
  /** เปิดฟอร์มลงทะเบียน/สมัครสมาชิกแทนบริษัท */
  | { kind: 'company-register'; label: string };

export interface AdminFormItem {
  id: string;
  audience: FormAudience;
  title: string;
  description: string;
  /** วิธีที่ผู้ใช้เข้าถึงฟอร์ม */
  access: string;
  /** ลิงก์หลักของฟอร์ม (ใช้กับปุ่มคัดลอกลิงก์) */
  href?: string;
  /** ยังไม่เปิดใช้งาน */
  planned?: boolean;
  actions: FormAction[];
}

export const FORM_AUDIENCES: { id: FormAudience; title: string; shortTitle: string; description: string }[] = [
  {
    id: 'public',
    title: 'ฟอร์มสำหรับสมาชิกและบุคคลทั่วไป',
    shortTitle: 'สมาชิกและบุคคลทั่วไป',
    description: 'ฟอร์มที่เปิดจากหน้าแรกของระบบ ทุกคนเข้าใช้งานได้',
  },
  {
    id: 'company',
    title: 'ฟอร์มสำหรับตัวแทนบริษัท',
    shortTitle: 'ตัวแทนบริษัท',
    description: 'บริษัทยืนยันตัวตนด้วยอีเมลที่ลงทะเบียนไว้และรหัสผ่านชั่วคราว',
  },
  {
    id: 'staff',
    title: 'ฟอร์มสำหรับเจ้าหน้าที่หน้างาน',
    shortTitle: 'เจ้าหน้าที่หน้างาน',
    description: 'ใช้ในวันจัดงาน ต้องกรอกรหัสเจ้าหน้าที่ของแต่ละการประชุม',
  },
  {
    id: 'admin',
    title: 'ฟอร์มที่แอดมินกรอกเอง',
    shortTitle: 'แอดมิน',
    description: 'สร้างและแก้ไขข้อมูลในระบบ หรือทำรายการแทนบริษัท',
  },
];

export const ADMIN_FORMS: AdminFormItem[] = [
  // ── สมาชิกและบุคคลทั่วไป ─────────────────────────────────────────────
  {
    id: 'conference-individual',
    audience: 'public',
    title: 'ลงทะเบียนเข้าร่วมประชุม',
    description: 'ลงทะเบียนรายบุคคล เลือกหลักสูตรและรูปแบบการเข้าร่วม แล้วแนบสลิปชำระเงิน',
    access: 'หน้าแรก แท็บลงทะเบียนประชุม',
    href: '/login?tab=conference',
    actions: [
      { kind: 'open', label: 'เปิดฟอร์ม', href: '/login?tab=conference' },
      { kind: 'tab', label: 'ตรวจสอบการชำระเงิน', tab: 'verify-slip' },
    ],
  },
  {
    id: 'membership',
    audience: 'public',
    title: 'สมัครสมาชิกสมาคม',
    description: 'สมัครสมาชิกใหม่ กรอกประวัติการศึกษาและแนบเอกสาร',
    access: 'หน้าแรก แท็บสมัครสมาชิก',
    href: '/login?tab=membership',
    actions: [
      { kind: 'open', label: 'เปิดฟอร์ม', href: '/login?tab=membership' },
      { kind: 'tab', label: 'จัดการสมาชิก', tab: 'members' },
    ],
  },
  {
    id: 'profile-update',
    audience: 'public',
    title: 'อัปเดตข้อมูลสมาชิกและบริษัท',
    description: 'สมาชิกแก้ไขข้อมูลส่วนตัว บริษัทตรวจสอบรายชื่อที่ลงทะเบียน โควต้า และแนบสลิปที่ค้างชำระ',
    access: 'หน้าแรก ปุ่มอัปเดตข้อมูลมุมขวาบน',
    href: '/login',
    actions: [{ kind: 'open', label: 'เปิดหน้าแรก', href: '/login' }],
  },

  // ── ตัวแทนบริษัท ───────────────────────────────────────────────────────
  {
    id: 'conference-group',
    audience: 'company',
    title: 'ลงทะเบียนประชุมแบบกลุ่ม',
    description: 'ตัวแทนบริษัทส่งรายชื่อหลายท่านพร้อมกัน ใช้คูปองสิทธิ์ฟรีได้เฉพาะสมาชิก ตามลำดับการกรอกข้อมูล',
    access: 'หน้าแรก แท็บลงทะเบียนประชุม เลือกลงทะเบียนแบบกลุ่ม',
    href: '/login?tab=conference',
    actions: [
      { kind: 'open', label: 'เปิดฟอร์ม', href: '/login?tab=conference' },
      { kind: 'company-register', label: 'ลงทะเบียนแทนบริษัท' },
    ],
  },
  {
    id: 'sponsor-portal',
    audience: 'company',
    title: 'พอร์ทัลลงทะเบียนสมาชิกของบริษัท',
    description: 'ตรวจสอบเลขสมาชิกให้ตรงกับชื่อ ใช้โควต้าของบริษัท และดูประวัติรายชื่อที่เคยส่ง',
    access: 'ลิงก์ที่แอดมินส่งให้บริษัท',
    href: '/sponsor/group-register',
    actions: [
      { kind: 'open', label: 'เปิดฟอร์ม', href: '/sponsor/group-register' },
      { kind: 'tab', label: 'จัดการบริษัทและคูปอง', tab: 'sponsors' },
    ],
  },
  {
    id: 'membership-group',
    audience: 'company',
    title: 'สมัครสมาชิกแบบกลุ่ม',
    description: 'บริษัทสมัครสมาชิกให้หลายท่านพร้อมกัน',
    access: 'หน้าแรก แท็บสมัครสมาชิก เลือกสมัครแบบกลุ่ม',
    href: '/login?tab=membership',
    actions: [
      { kind: 'open', label: 'เปิดฟอร์ม', href: '/login?tab=membership' },
      { kind: 'company-register', label: 'สมัครแทนบริษัท' },
    ],
  },
  {
    id: 'resubmit-slip',
    audience: 'company',
    title: 'แนบสลิปใหม่',
    description: 'ลิงก์เฉพาะรายการ ส่งให้ผู้ลงทะเบียนอัตโนมัติเมื่อแอดมินปฏิเสธสลิป',
    access: 'ลิงก์ในอีเมลแจ้งผลการตรวจสลิป',
    actions: [{ kind: 'tab', label: 'ตรวจสอบการชำระเงิน', tab: 'verify-slip' }],
  },
  // ── เจ้าหน้าที่หน้างาน ────────────────────────────────────────────────
  {
    id: 'staff-scanner',
    audience: 'staff',
    title: 'สแกนเช็คอินหน้างาน',
    description: 'สแกน QR บัตรเข้างานของผู้เข้าร่วม และดูสถิติการเช็คอินรายวัน',
    access: 'ลิงก์สำหรับเจ้าหน้าที่ ใช้รหัสเจ้าหน้าที่ของการประชุม',
    href: '/staff',
    actions: [
      { kind: 'open', label: 'เปิดหน้าสแกน', href: '/staff' },
      { kind: 'tab', label: 'ตรวจสอบผู้เข้าร่วม', tab: 'verify-attendees' },
    ],
  },

  // ── แอดมินกรอกเอง ─────────────────────────────────────────────────────
  {
    id: 'admin-company-register',
    audience: 'admin',
    title: 'ลงทะเบียนหรือสมัครสมาชิกแทนบริษัท',
    description: 'ใช้ฟอร์มชุดเดียวกับหน้าเว็บจริง ไม่บังคับแนบสลิป',
    access: 'แอดมินเท่านั้น',
    actions: [{ kind: 'company-register', label: 'เริ่มทำรายการ' }],
  },
  {
    id: 'admin-meeting',
    audience: 'admin',
    title: 'สร้างการประชุม',
    description: 'ตั้งวันที่ สถานที่ หลักสูตร ราคา จำนวนที่นั่ง และรหัสเจ้าหน้าที่',
    access: 'แอดมินเท่านั้น',
    actions: [
      { kind: 'tab', label: 'สร้างการประชุม', tab: 'add-meeting' },
      { kind: 'tab', label: 'แก้ไขการประชุม', tab: 'meeting-history' },
    ],
  },
  {
    id: 'admin-member',
    audience: 'admin',
    title: 'เพิ่มและแก้ไขข้อมูลสมาชิก',
    description: 'เพิ่มสมาชิก แก้ไขสถานะ วันหมดอายุ และเอกสารประกอบ',
    access: 'แอดมินเท่านั้น',
    actions: [{ kind: 'tab', label: 'จัดการสมาชิก', tab: 'members' }],
  },
  {
    id: 'admin-sponsor',
    audience: 'admin',
    title: 'เพิ่มบริษัท โควต้า และคูปอง',
    description: 'ตั้งอีเมลตัวแทน ระดับสปอนเซอร์ จำนวนสิทธิ์ฟรี และออกรหัสคูปอง',
    access: 'แอดมินเท่านั้น',
    actions: [{ kind: 'tab', label: 'จัดการบริษัทและคูปอง', tab: 'sponsors' }],
  },
  {
    id: 'admin-receipt',
    audience: 'admin',
    title: 'ออกใบเสร็จรับเงิน',
    description: 'ออกใบเสร็จจากรายการที่ชำระแล้ว หรือออกใบเสร็จแยก',
    access: 'แอดมินเท่านั้น',
    actions: [{ kind: 'tab', label: 'ออกใบเสร็จ', tab: 'receipts' }],
  },
  {
    id: 'admin-email',
    audience: 'admin',
    title: 'ส่งอีเมลถึงผู้เข้าร่วม',
    description: 'ส่งลิงก์ประชุมออนไลน์ แจ้งเตือน และอีเมลประกาศ',
    access: 'แอดมินเท่านั้น',
    actions: [{ kind: 'tab', label: 'ระบบจัดการอีเมล', tab: 'emails' }],
  },
];

export function formsByAudience(audience: FormAudience): AdminFormItem[] {
  return ADMIN_FORMS.filter((f) => f.audience === audience);
}
