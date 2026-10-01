import { ReceiptData } from '@/types/receipt';
import { AdminTab } from '@/components/AdminNavbar';

/* ─── Data Types & Interfaces ─────────────────────────────────────────── */

export interface MeetingPricingTiers {
  programName: string;
  participant: {
    onsiteMember: number;
    onsiteNonMember: number;
    onlineMember: number;
  };
  /** ราคา fellow ของการประชุมหลัก ผูกกับฟอร์ม fellow อัตโนมัติ (0 ทั้งหมด = ไม่ผูก) */
  fellow?: {
    onsiteMember: number;
    onsiteNonMember: number;
    onlineMember: number;
  };
  changeFee: {
    enabled?: boolean;
    label?: string;
    conditionDate: string;
    deadlineDate?: string;
    policyText?: string;
    onsiteMember: number;
    onsiteNonMember: number;
    onlineMember: number;
  };
  remark: string;
}

export const DEFAULT_PRICING_TIERS: MeetingPricingTiers = {
  programName: '',
  participant: {
    onsiteMember: 0,
    onsiteNonMember: 0,
    onlineMember: 0,
  },
  fellow: {
    onsiteMember: 0,
    onsiteNonMember: 0,
    onlineMember: 0,
  },
  changeFee: {
    enabled: true,
    label: 'แจ้งเปลี่ยนรูปแบบ',
    conditionDate: 'After 10 Oct 2026',
    deadlineDate: '',
    policyText: '',
    onsiteMember: 1000,
    onsiteNonMember: 1000,
    onlineMember: 1000,
  },
  remark: '',
};

export interface MeetingItem {
  id: string;
  titleTh: string;
  titleEn: string;
  date: string;
  time: string;
  location: string;
  type: 'hybrid' | 'onsite' | 'online';
  staffCode?: string;
  maxSeats: number;
  basePrice?: number;
  pricingTiers?: MeetingPricingTiers;
  activities?: any[];
  registered: number;
  attended: number;
  revenue: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

export interface SlipItem {
  id: string;
  refNo: string;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  memberCode?: string;
  workplace: string;
  ticketType: string;
  meetingId: string;
  amount: number;
  bank: string;
  transferDate: string;
  transferTime: string;
  slipUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  /** เวลาที่ส่งสลิปเข้าระบบ (ISO) ใช้เมื่อวันที่โอนอ่านไม่ได้ */
  createdAt?: string;
  /** บันทึกแยกสำหรับผู้ดูแลระบบ ยอดรวมอยู่ในบิลอื่นแล้ว ไม่นับรายได้ซ้ำ */
  isAdminLedger?: boolean;
  selectedActivities?: Array<{
    id: string;
    name: string;
    type?: string;
    price: number;
    date?: string;
  }>;
}

export interface AttendeeItem {
  id: string;
  code: string;
  /** เลขสมาชิกที่ผูกไว้ (member_no) */
  memberNo?: string;
  /** ลงทะเบียนราคา fellow */
  isFellow?: boolean;
  nameTh: string;
  nameEn: string;
  id4Digits: string;
  email: string;
  phone: string;
  workplace: string;
  memberType: string;
  ticketType: string;
  ticketCode: string;
  meetingId: string;
  meetingTitle: string;
  registeredDate: string;
  paymentStatus: 'paid' | 'pending' | 'rejected' | 'unpaid';
  checkInStatus: 'checked_in' | 'not_checked_in';
  checkInTime?: string;
  slipId?: string | null;
  rejectionReason?: string | null;
  programs?: Array<{ id: string; name: string }>;
  attendanceType?: 'onsite' | 'online';
  amount?: number;
  position?: string;
}
