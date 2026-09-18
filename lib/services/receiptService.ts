import prisma from '@/lib/prisma';
import { ReceiptData, ReceiptItemLine } from '@/types/receipt';

interface DbReceiptRow {
  id: string;
  receipt_no: string;
  receipt_date: string;
  purpose_text: string;
  payer_type: string;
  payer_name: string;
  branch_name: string | null;
  payer_address_line1: string | null;
  payer_address_line2: string | null;
  payer_phone: string | null;
  payer_tax_id: string | null;
  items: any;
  total_amount: number;
  thai_baht_text_override: string | null;
  payer_signer_name: string | null;
  payer_signer_role: string | null;
  payer_signed_date: string | null;
  authorized_signer_name: string;
  authorized_signer_role: string | null;
  authorized_signed_date: string | null;
  prepared_by_name: string;
  prepared_by_role: string | null;
  prepared_by_signed_date: string | null;
  association_name_th: string | null;
  association_name_en: string | null;
  association_address: string | null;
  association_contact: string | null;
  association_tax_id: string | null;
  meeting_id: string | null;
  attendee_id: string | null;
  slip_id: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function mapRowToReceiptData(row: DbReceiptRow): ReceiptData {
  let items: ReceiptItemLine[] = [];
  if (Array.isArray(row.items)) {
    items = row.items;
  } else if (typeof row.items === 'string') {
    try {
      items = JSON.parse(row.items);
    } catch {
      items = [];
    }
  }

  return {
    id: row.id,
    receiptNo: row.receipt_no,
    receiptDate: row.receipt_date,
    purposeText: row.purpose_text,
    payerType: (row.payer_type as any) || 'individual',
    payerName: row.payer_name,
    branchName: row.branch_name || undefined,
    payerAddressLine1: row.payer_address_line1 || '',
    payerAddressLine2: row.payer_address_line2 || '',
    payerPhone: row.payer_phone || undefined,
    payerTaxId: row.payer_tax_id || undefined,
    items,
    totalAmount: Number(row.total_amount) || 0,
    thaiBahtTextOverride: row.thai_baht_text_override || undefined,
    payerSignerName: row.payer_signer_name || undefined,
    payerSignerRole: row.payer_signer_role || 'ผู้จ่ายเงิน',
    payerSignedDate: row.payer_signed_date || undefined,
    authorizedSignerName: row.authorized_signer_name,
    authorizedSignerRole: row.authorized_signer_role || undefined,
    authorizedSignedDate: row.authorized_signed_date || undefined,
    preparedByName: row.prepared_by_name,
    preparedByRole: row.prepared_by_role || 'ผู้จัดทำ',
    preparedBySignedDate: row.prepared_by_signed_date || undefined,
    associationNameTh: row.association_name_th || undefined,
    associationNameEn: row.association_name_en || undefined,
    associationAddress: row.association_address || undefined,
    associationContact: row.association_contact || undefined,
    associationTaxId: row.association_tax_id || undefined,
    meetingId: row.meeting_id || undefined,
    attendeeId: row.attendee_id || undefined,
    slipId: row.slip_id || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: (row.status as any) || 'issued',
  };
}

/**
 * Get all receipts from the database, ordered by created_at DESC
 */
export async function getAllReceipts(): Promise<ReceiptData[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<DbReceiptRow[]>(
      `SELECT * FROM receipts ORDER BY created_at DESC`
    );
    if (!Array.isArray(rows)) return [];
    return rows.map(mapRowToReceiptData);
  } catch (error) {
    console.error('Error in getAllReceipts:', error);
    return [];
  }
}

/**
 * Get a single receipt by ID or Receipt Number
 */
export async function getReceiptById(id: string): Promise<ReceiptData | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<DbReceiptRow[]>(
      `SELECT * FROM receipts WHERE id = $1 OR receipt_no = $1 LIMIT 1`,
      id
    );
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return mapRowToReceiptData(rows[0]);
  } catch (error) {
    console.error(`Error in getReceiptById (${id}):`, error);
    return null;
  }
}

export async function getNextReceiptId(): Promise<string> {
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM receipts`);
    let maxId = 0;
    if (Array.isArray(rows)) {
      for (const r of rows) {
        const num = parseInt(r.id, 10);
        if (!isNaN(num) && num > maxId) {
          maxId = num;
        }
      }
    }
    return String(maxId + 1);
  } catch {
    return '1';
  }
}

/**
 * Save or update a receipt in the database
 */
export async function saveReceipt(receipt: ReceiptData): Promise<{ success: boolean; data?: ReceiptData; error?: string }> {
  try {
    let id = receipt.id;
    if (!id || id.startsWith('REC-')) {
      id = await getNextReceiptId();
    }
    const itemsJson = JSON.stringify(receipt.items || []);
    const totalAmount = Number(receipt.totalAmount) || 0;

    await prisma.$executeRawUnsafe(
      `INSERT INTO receipts (
        id, receipt_no, receipt_date, purpose_text, payer_type, payer_name,
        branch_name, payer_address_line1, payer_address_line2, payer_phone, payer_tax_id,
        items, total_amount, thai_baht_text_override, payer_signer_name, payer_signer_role,
        payer_signed_date, authorized_signer_name, authorized_signer_role, authorized_signed_date,
        prepared_by_name, prepared_by_role, prepared_by_signed_date,
        association_name_th, association_name_en, association_address, association_contact,
        association_tax_id, meeting_id, attendee_id, slip_id, status, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11,
        $12::jsonb, $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25, $26, $27,
        $28, $29, $30, $31, $32, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        receipt_no = EXCLUDED.receipt_no,
        receipt_date = EXCLUDED.receipt_date,
        purpose_text = EXCLUDED.purpose_text,
        payer_type = EXCLUDED.payer_type,
        payer_name = EXCLUDED.payer_name,
        branch_name = EXCLUDED.branch_name,
        payer_address_line1 = EXCLUDED.payer_address_line1,
        payer_address_line2 = EXCLUDED.payer_address_line2,
        payer_phone = EXCLUDED.payer_phone,
        payer_tax_id = EXCLUDED.payer_tax_id,
        items = EXCLUDED.items,
        total_amount = EXCLUDED.total_amount,
        thai_baht_text_override = EXCLUDED.thai_baht_text_override,
        payer_signer_name = EXCLUDED.payer_signer_name,
        payer_signer_role = EXCLUDED.payer_signer_role,
        payer_signed_date = EXCLUDED.payer_signed_date,
        authorized_signer_name = EXCLUDED.authorized_signer_name,
        authorized_signer_role = EXCLUDED.authorized_signer_role,
        authorized_signed_date = EXCLUDED.authorized_signed_date,
        prepared_by_name = EXCLUDED.prepared_by_name,
        prepared_by_role = EXCLUDED.prepared_by_role,
        prepared_by_signed_date = EXCLUDED.prepared_by_signed_date,
        association_name_th = EXCLUDED.association_name_th,
        association_name_en = EXCLUDED.association_name_en,
        association_address = EXCLUDED.association_address,
        association_contact = EXCLUDED.association_contact,
        association_tax_id = EXCLUDED.association_tax_id,
        meeting_id = EXCLUDED.meeting_id,
        attendee_id = EXCLUDED.attendee_id,
        slip_id = EXCLUDED.slip_id,
        status = EXCLUDED.status,
        updated_at = NOW()`,
      id,
      receipt.receiptNo,
      receipt.receiptDate,
      receipt.purposeText,
      receipt.payerType || 'individual',
      receipt.payerName,
      receipt.branchName || null,
      receipt.payerAddressLine1 || null,
      receipt.payerAddressLine2 || null,
      receipt.payerPhone || null,
      receipt.payerTaxId || null,
      itemsJson,
      totalAmount,
      receipt.thaiBahtTextOverride || null,
      receipt.payerSignerName || null,
      receipt.payerSignerRole || 'ผู้จ่ายเงิน',
      receipt.payerSignedDate || null,
      receipt.authorizedSignerName,
      receipt.authorizedSignerRole || null,
      receipt.authorizedSignedDate || null,
      receipt.preparedByName,
      receipt.preparedByRole || 'ผู้จัดทำ',
      receipt.preparedBySignedDate || null,
      receipt.associationNameTh || null,
      receipt.associationNameEn || null,
      receipt.associationAddress || null,
      receipt.associationContact || null,
      receipt.associationTaxId || null,
      receipt.meetingId || null,
      receipt.attendeeId || null,
      receipt.slipId || null,
      receipt.status || 'issued'
    );

    const saved = await getReceiptById(id);
    return { success: true, data: saved || receipt };
  } catch (error: any) {
    console.error('Error saving receipt:', error);
    return { success: false, error: error?.message || 'Failed to save receipt' };
  }
}

/**
 * Delete a receipt by ID
 */
export async function deleteReceipt(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM receipts WHERE id = $1`, id);
    return { success: true };
  } catch (error: any) {
    console.error(`Error deleting receipt (${id}):`, error);
    return { success: false, error: error?.message || 'Failed to delete receipt' };
  }
}
