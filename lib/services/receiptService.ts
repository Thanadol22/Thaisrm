import prisma from '@/lib/prisma';
import { ReceiptData, ReceiptItemLine } from '@/types/receipt';
import { generateReceiptNo, DEFAULT_RECEIPT_START_SEQ } from '@/lib/receiptNumber';

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

  // Sanitize subDetails to ensure member number is not displayed in receipts
  const sanitizedItems = items.map((item) => ({
    ...item,
    subDetails: (item.subDetails || []).filter((line) => {
      const trimmed = (line || '').trim();
      return !/^รหัสสมาชิก/i.test(trimmed) && !/^Member No/i.test(trimmed);
    }),
  }));

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
    items: sanitizedItems,
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
 * Auto-sync approved payment slips into the receipts table so that all approved payments
 * have an associated receipt record with complete relationship.
 */
export async function syncApprovedSlipsToReceipts(): Promise<void> {
  try {
    const [existingReceipts, approvedSlips, meetings, dbSettings] = await Promise.all([
      prisma.$queryRawUnsafe<DbReceiptRow[]>(`SELECT * FROM receipts`),
      prisma.$queryRawUnsafe<any[]>(`
        SELECT s.*, 
               m.full_name_th as member_full_name_th, 
               m.address as member_address, 
               m.workplace as member_workplace,
               mtg.meeting_name, 
               mtg.meeting_date, 
               mtg.location as meeting_location,
               mtg.start_date as meeting_start_date,
               mtg.end_date as meeting_end_date
        FROM payment_slips s
        LEFT JOIN members m ON s.member_no = m.member_no
        LEFT JOIN meetings mtg ON s.meeting_id = mtg.meeting_id
        WHERE s.status = 'approved'
        ORDER BY s.created_at ASC
      `),
      prisma.$queryRawUnsafe<any[]>(`SELECT * FROM meetings`),
      prisma.$queryRawUnsafe<any[]>(`SELECT key, value FROM system_settings`),
    ]);

    if (!Array.isArray(approvedSlips) || approvedSlips.length === 0) {
      return;
    }

    const settingsMap: Record<string, string> = {};
    if (Array.isArray(dbSettings)) {
      dbSettings.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
    }

    const existingSlipIds = new Set<string>();
    let maxSeq = DEFAULT_RECEIPT_START_SEQ - 1;
    let maxId = 0;

    if (Array.isArray(existingReceipts)) {
      for (const r of existingReceipts) {
        if (r.slip_id) existingSlipIds.add(r.slip_id);
        const match = r.receipt_no?.match(/-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
        const numId = parseInt(r.id, 10);
        if (!isNaN(numId) && numId > maxId) maxId = numId;
      }
    }

    for (const slip of approvedSlips) {
      let parsedAct: any = slip.selected_activities;
      if (typeof parsedAct === 'string') {
        try {
          parsedAct = JSON.parse(parsedAct);
        } catch {
          parsedAct = null;
        }
      }

      const isGroup =
        Boolean(parsedAct?.isGroup) ||
        parsedAct?.type === 'membership_group_registration' ||
        parsedAct?.type === 'conference_group_registration' ||
        slip.ticket_code?.startsWith('GRP-') ||
        slip.ticket_code?.startsWith('MEMGRP');

      const isMembership =
        parsedAct?.type === 'membership_registration' ||
        parsedAct?.type === 'membership_group_registration' ||
        parsedAct?.isMembership;

      const groupPayload = parsedAct?.groupPayload || (isGroup && parsedAct?.applicants ? parsedAct : null) || (isGroup && parsedAct?.attendees ? parsedAct : null);

      const companyName = groupPayload?.companyName || slip.guest_workplace || slip.member_workplace || '';
      const payerType: 'company' | 'individual' = (isGroup && companyName) ? 'company' : 'individual';
      const payerName = payerType === 'company'
        ? companyName
        : (slip.member_full_name_th || slip.guest_name || 'ผู้ลงทะเบียน');

      const payerAddressLine1 = payerType === 'company'
        ? (groupPayload?.taxInvoiceAddress || groupPayload?.companyAddress || slip.guest_workplace || '')
        : (slip.member_address || slip.member_workplace || slip.guest_workplace || '');

      const payerTaxId = groupPayload?.taxId || '';

      let meetingDateStr = '';
      if (slip.meeting_start_date && slip.meeting_end_date) {
        const start = new Date(slip.meeting_start_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        const end = new Date(slip.meeting_end_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
        meetingDateStr = start === end ? `จัดขึ้นวันที่ ${start}` : `จัดขึ้นวันที่ ${start} - ${end}`;
      } else if (slip.meeting_date) {
        meetingDateStr = `จัดขึ้นวันที่ ${new Date(slip.meeting_date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      }

      const meetingLocationStr = slip.meeting_location ? `${slip.meeting_location}` : '';

      const subDetails: string[] = [];
      if (isMembership) {
        subDetails.push(settingsMap['association_name_th'] || 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย');
        if (payerType === 'company') {
          subDetails.push(companyName || payerName);
        } else {
          subDetails.push(payerName);
        }
      } else {
        if (slip.meeting_name) subDetails.push(slip.meeting_name);
        if (meetingDateStr) subDetails.push(meetingDateStr);
        if (meetingLocationStr) subDetails.push(meetingLocationStr);
        if (payerType === 'company') {
          subDetails.push(companyName || payerName);
        } else {
          subDetails.push(payerName);
        }
      }

      const itemTitle = isMembership
        ? (payerType === 'company' ? 'ค่าสมัครสมาชิกแบบกลุ่ม' : (settingsMap['receipt_tpl2_title'] || 'ค่าสมัครสมาชิกสมาคมฯ'))
        : (payerType === 'company' ? 'ค่าลงทะเบียนประชุมแบบกลุ่ม' : (settingsMap['receipt_tpl1_title'] || 'ค่าลงทะเบียนเข้าร่วมประชุมวิชาการ'));

      const purposeText = isMembership
        ? (settingsMap['receipt_tpl2_purpose'] || 'ได้รับเงินค่าสมัครสมาชิกสมาคมฯ ประจำปี 2569')
        : (settingsMap['receipt_tpl1_purpose'] || 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569');

      if (existingSlipIds.has(slip.slip_id)) {
        const existingRow = existingReceipts.find((r) => r.slip_id === slip.slip_id);
        if (existingRow) {
          let curItems: ReceiptItemLine[] = [];
          if (Array.isArray(existingRow.items)) curItems = existingRow.items;
          else if (typeof existingRow.items === 'string') {
            try { curItems = JSON.parse(existingRow.items); } catch { curItems = []; }
          }
          
          if (curItems.length === 0) {
            // Re-generate item if empty
            const generatedItems = [
              {
                id: `item-${existingRow.id}-1`,
                itemNumber: 1,
                title: itemTitle,
                subDetails: subDetails.filter(Boolean),
                amount: Number(slip.amount) || Number(existingRow.total_amount) || 0,
              },
            ];
            await prisma.$executeRawUnsafe(
              `UPDATE receipts SET items = $1::jsonb, payer_name = $2, purpose_text = $3, updated_at = NOW() WHERE id = $4`,
              JSON.stringify(generatedItems),
              payerName,
              purposeText,
              existingRow.id
            );
          } else {
            let hasChanges = false;
            const updatedItems = curItems.map((item) => {
              const cleanedSubDetails = (item.subDetails || []).filter((line) => {
                const trimmed = (line || '').trim();
                if (!trimmed) return false;
                if (/^รหัสสมาชิก/i.test(trimmed) || /^Member No/i.test(trimmed)) {
                  hasChanges = true;
                  return false;
                }
                if (payerType === 'company' || isGroup) {
                  if (/^\d+(\.|\))\s*/.test(trimmed) || /^\d+\.?$/.test(trimmed)) {
                    hasChanges = true;
                    return false;
                  }
                }
                return true;
              });
              if ((payerType === 'company' || isGroup) && !cleanedSubDetails.includes(companyName) && !cleanedSubDetails.includes(payerName)) {
                cleanedSubDetails.push(companyName || payerName);
                hasChanges = true;
              }
              return { 
                ...item, 
                title: (payerType === 'company' || isGroup) ? (itemTitle || item.title) : item.title,
                subDetails: cleanedSubDetails.filter(Boolean) 
              };
            });

            if (hasChanges || payerType === 'company' || isGroup) {
              await prisma.$executeRawUnsafe(
                `UPDATE receipts SET items = $1::jsonb, payer_name = $2, purpose_text = $3, updated_at = NOW() WHERE id = $4`,
                JSON.stringify(updatedItems),
                payerName,
                purposeText,
                existingRow.id
              );
            }
          }
        }
        continue;
      }

      maxSeq += 1;
      maxId += 1;

      const receiptDate = slip.transfer_date || new Date(slip.created_at || Date.now()).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

      const newReceiptData: ReceiptData = {
        id: String(maxId),
        receiptNo: generateReceiptNo(receiptDate, maxSeq),
        receiptDate,
        purposeText,
        payerType,
        payerName,
        payerAddressLine1,
        payerAddressLine2: '',
        payerPhone: slip.guest_phone || undefined,
        payerTaxId: payerTaxId || undefined,
        items: [
          {
            id: `item-${maxId}-1`,
            itemNumber: 1,
            title: itemTitle,
            subDetails: subDetails.filter(Boolean),
            amount: Number(slip.amount) || 0,
          },
        ],
        totalAmount: Number(slip.amount) || 0,
        payerSignerRole: 'ผู้จ่ายเงิน',
        authorizedSignerName: settingsMap['receipt_authorized_signer'] || 'แพทย์หญิงพิมพกา ชวนะเวสน์',
        authorizedSignerRole: settingsMap['receipt_authorized_role'] || 'เหรัญญิก / ผู้รับเงิน',
        preparedByName: settingsMap['receipt_prepared_by'] || 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
        preparedByRole: settingsMap['receipt_prepared_role'] || 'ผู้จัดทำ',
        associationNameTh: settingsMap['association_name_th'],
        associationNameEn: settingsMap['association_name_en'],
        associationAddress: settingsMap['association_address'],
        associationContact: settingsMap['association_contact'],
        associationTaxId: settingsMap['association_tax_id'],
        meetingId: slip.meeting_id || undefined,
        slipId: slip.slip_id,
        createdAt: slip.created_at ? new Date(slip.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: 'issued',
      };

      await saveReceipt(newReceiptData);
      existingSlipIds.add(slip.slip_id);
    }
  } catch (syncErr) {
    console.error('Error syncing approved slips to receipts:', syncErr);
  }
}

/**
 * Create or sync receipt for a specific approved slip immediately.
 */
export async function createReceiptForApprovedSlip(slipId: string): Promise<ReceiptData | null> {
  try {
    await syncApprovedSlipsToReceipts();
    const rows = await prisma.$queryRawUnsafe<DbReceiptRow[]>(
      `SELECT * FROM receipts WHERE slip_id = $1 LIMIT 1`,
      slipId
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return mapRowToReceiptData(rows[0]);
    }
    return null;
  } catch (error) {
    console.error(`Error in createReceiptForApprovedSlip (${slipId}):`, error);
    return null;
  }
}

/**
 * Get all receipts from the database, ordered by created_at DESC
 */
export async function getAllReceipts(): Promise<ReceiptData[]> {
  try {
    // Ensure all approved slips have a corresponding receipt
    await syncApprovedSlipsToReceipts();

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
