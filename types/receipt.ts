export interface ReceiptItemLine {
  id: string;
  itemNumber: number;
  title: string;
  subDetails: string[]; // e.g. ["ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์", "จัดขึ้นวันที่ 10-12 มีนาคม 2569", "โรงแรมอีสติน แกรนด์ พญาไท กรุงเทพฯ"]
  amount: number;
}

export interface ReceiptData {
  id: string;
  receiptNo: string; // e.g. "2569/02-094"
  receiptDate: string; // e.g. "10 มีนาคม 2569"
  
  // Header details (Association info)
  associationNameTh?: string;
  associationNameEn?: string;
  associationAddress?: string;
  associationContact?: string;
  associationTaxId?: string;

  // Purpose prefix
  purposeText: string; // e.g. "ได้รับเงินสนับสนุน ประจำปี 2569" or "ได้รับเงินค่าลงทะเบียน ประจำปี 2569"
  
  // Payer details
  payerType: 'company' | 'individual' | 'organization';
  payerName: string; // e.g. "บริษัท ออร์กานอน (ประเทศไทย) จำกัด" or "นพ. วรวัฒน์ เกียรติอนันต์"
  branchName?: string; // e.g. "สำนักงานแห่งใหญ่"
  payerAddressLine1: string; // e.g. "เลขที่ 88 อาคารเดอะปาร์ค ชั้นที่ 7 ฝั่งอีสต์วิง ห้องเลขที่ 07-101 ถนนรัชดาภิเษก แขวงคลองเตย เขตคลองเตย"
  payerAddressLine2: string; // e.g. "กรุงเทพมหานคร 10110"
  payerPhone?: string; // e.g. "+662-257-2500"
  payerTaxId?: string; // e.g. "0105563092355"
  
  // Items & Amount
  items: ReceiptItemLine[];
  totalAmount: number;
  thaiBahtTextOverride?: string;

  // Signatures
  payerSignerName?: string; // ( ......................................................................... )
  payerSignerRole?: string; // "ผู้จ่ายเงิน"
  payerSignedDate?: string;

  authorizedSignerName: string; // "แพทย์หญิงพิมพกา ชวนะเวสน์"
  authorizedSignerRole?: string; // "" or "เหรัญญิก / ผู้รับเงิน"
  authorizedSignedDate?: string;

  preparedByName: string; // "ปณตพร ภวภูตานนท์ ณ มหาสารคาม"
  preparedByRole?: string; // "ผู้จัดทำ"
  preparedBySignedDate?: string;

  // Metadata
  meetingId?: string;
  attendeeId?: string;
  slipId?: string;
  createdAt: string;
  status: 'issued' | 'draft' | 'cancelled';
}

export const DEFAULT_ASSOCIATION_INFO = {
  nameTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
  nameEn: 'THAI SOCIETY FOR REPRODUCTIVE MEDICINE',
  address: 'ชั้น 8 อาคารเฉลิมพระบารมี ๕๐ ปี เลขที่ 2 ซอยศูนย์วิจัย ถนนเพชรบุรีตัดใหม่ กรุงเทพฯ',
  contact: 'Website: https://thaisrm.com/ E-mail: tsrm.info@gmail.com',
  taxId: '0-9930-00367-70-7',
};


