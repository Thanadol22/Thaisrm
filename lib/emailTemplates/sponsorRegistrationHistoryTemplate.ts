import { renderBaseEmailLayout } from './baseLayout';

export type SponsorHistoryEmailKind = 'history' | 'overdue';

export interface SponsorHistoryEmailAttendee {
  seq: number;
  name: string;
  memberNo: string;
  programs: string;
  /** หลักสูตรรายตัวพร้อมราคาเต็ม (ไม่มีราคาเมื่อแยกราคาไม่ได้) */
  programItems?: { name: string; price?: number }[];
  format: string;
  /** ส่วนลดคูปองบริษัทของผู้เข้าร่วมคนนี้ */
  discount?: number;
  /** ยอดก่อนหักส่วนลด */
  originalPrice?: number;
  netPrice: number;
}

export interface SponsorHistoryEmailBill {
  billNo: string;
  billDate: string | Date;
  billType: string;
  billStatusLabel: string;
  billAmount: number;
  couponCode?: string | null;
  isOutstanding: boolean;
  meetingName: string;
  attendees: SponsorHistoryEmailAttendee[];
}

export interface SponsorHistoryEmailOptions {
  kind: SponsorHistoryEmailKind;
  companyName: string;
  contactName?: string | null;
  /** คำอธิบายขอบเขตข้อมูล เช่น ทุกบิล, บิลเลขที่ ..., งานประชุม ... */
  scopeLabel: string;
  bills: SponsorHistoryEmailBill[];
  extraNote?: string;
  /** วันครบกำหนดชำระ (แสดงเฉพาะอีเมลแจ้งค้างชำระ) */
  dueDate?: string | null;
  bank?: { name: string; accountNo: string; accountName: string } | null;
}

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n: number) => `${(Number(n) || 0).toLocaleString('th-TH')} บาท`;

const thaiDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' });

export function sponsorHistoryEmailSubject(kind: SponsorHistoryEmailKind, companyName: string): string {
  return kind === 'overdue'
    ? `แจ้งเตือนยอดค้างชำระค่าลงทะเบียน ${companyName}`
    : `สรุปประวัติการลงทะเบียน ${companyName}`;
}

/** แจกแจงหลักสูตร ราคาเต็ม ส่วนลด และยอดสุทธิ ให้บริษัทเห็นที่มาของยอดแต่ละคน */
function renderPriceBreakdown(a: SponsorHistoryEmailAttendee): string {
  const items = a.programItems?.length ? a.programItems : a.programs ? [{ name: a.programs }] : [];
  const discount = Number(a.discount) || 0;
  const original = Number(a.originalPrice) || a.netPrice + discount;
  const hasItemPrices = items.length > 0 && items.every((x) => typeof x.price === 'number');
  if (items.length === 0 && discount <= 0) return '';

  const line = (label: string, value: string, color = '#475569', bold = false) => `
          <tr>
            <td style="padding: 1px 0; font-size: 12px; color: ${color};${bold ? ' font-weight: 700;' : ''}">${label}</td>
            <td style="padding: 1px 0 1px 12px; font-size: 12px; color: ${color}; text-align: right; white-space: nowrap;${bold ? ' font-weight: 700;' : ''}">${value}</td>
          </tr>`;

  const itemLines = items
    .map((x) => line(`• ${esc(x.name)}`, hasItemPrices ? money(x.price!) : ''))
    .join('');
  const discountLines =
    discount > 0
      ? `${hasItemPrices && items.length > 1 ? '' : line('ราคาเต็ม', money(original))}${line('ส่วนลดคูปองบริษัท', `-${money(discount)}`, '#047857', true)}`
      : '';
  return `
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="padding: 8px 10px; background-color: #f8fafc; border-radius: 8px;">
          ${items.length ? line(`หลักสูตรที่ลงทะเบียน ${items.length} รายการ`, '', '#334155', true) : ''}
          ${itemLines}
          ${discountLines}
          ${discount > 0 || (hasItemPrices && items.length > 1) ? `<tr><td colspan="2" style="border-top: 1px dashed #cbd5e1; padding-top: 2px;"></td></tr>${line('ยอดสุทธิ', money(a.netPrice), '#0f172a', true)}` : ''}
        </table>`;
}

function renderBill(bill: SponsorHistoryEmailBill): string {
  const statusColor = bill.isOutstanding ? '#c2410c' : '#047857';
  const statusBg = bill.isOutstanding ? '#fff7ed' : '#ecfdf5';
  const billDiscount = bill.attendees.reduce((sum, a) => sum + (Number(a.discount) || 0), 0);
  const rows = bill.attendees
    .map(
      (a) => `
      <tr>
        <td style="padding: 8px 10px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center; vertical-align: top;">${a.seq}</td>
        <td style="padding: 8px 10px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; vertical-align: top;">
          <div style="font-weight: 700;">${esc(a.name)}</div>
          ${a.memberNo ? `<div style="font-size: 12px; color: #64748b;">เลขสมาชิก ${esc(a.memberNo)}</div>` : ''}
          ${a.format ? `<div style="font-size: 12px; color: #64748b;">รูปแบบการเข้าร่วม ${esc(a.format)}</div>` : ''}
        </td>
        <td style="padding: 8px 10px; border-top: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; text-align: right; white-space: nowrap; vertical-align: top;">
          ${(Number(a.discount) || 0) > 0 ? `<div style="font-size: 12px; color: #94a3b8; text-decoration: line-through;">${money(Number(a.originalPrice) || a.netPrice + Number(a.discount))}</div>` : ''}
          <div style="font-weight: 700;">${money(a.netPrice)}</div>
        </td>
      </tr>
      ${(() => {
        // แจกแจงราคาเต็มความกว้างของตาราง ไม่บีบอยู่ในคอลัมน์ชื่อบนจอมือถือ
        const breakdown = renderPriceBreakdown(a);
        return breakdown
          ? `<tr><td colspan="3" class="m-pad" style="padding: 0 10px 10px 10px;">${breakdown}</td></tr>`
          : '';
      })()}`
    )
    .join('');

  return `
    <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin: 0 0 16px 0;">
      <div class="m-pad" style="background-color: #f8fafc; padding: 12px 14px; border-bottom: 1px solid #e2e8f0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="kv-label" style="font-size: 14px; font-weight: 800; color: #0f172a; vertical-align: middle;">บิลเลขที่ <span style="white-space: nowrap;">${esc(bill.billNo)}</span></td>
            <td class="kv-value" style="text-align: right; vertical-align: middle; padding-left: 8px;">
              <span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; white-space: nowrap; color: ${statusColor}; background-color: ${statusBg};">${esc(bill.billStatusLabel)}</span>
            </td>
          </tr>
        </table>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.6;">
          ${esc(bill.meetingName)} · ${esc(bill.billType)} · วันที่ ${thaiDate(bill.billDate)}
        </div>
        ${bill.couponCode ? `<div style="font-size: 12px; color: #047857; margin-top: 2px; font-weight: 700;">ใช้คูปองบริษัท ${esc(bill.couponCode)}${billDiscount > 0 ? ` ส่วนลดรวม ${money(billDiscount)}` : ''}</div>` : ''}
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <th style="padding: 8px 10px; font-size: 12px; color: #64748b; font-weight: 700; text-align: center; width: 36px;">ลำดับ</th>
          <th style="padding: 8px 10px; font-size: 12px; color: #64748b; font-weight: 700; text-align: left;">ผู้เข้าร่วม</th>
          <th style="padding: 8px 10px; font-size: 12px; color: #64748b; font-weight: 700; text-align: right;">ยอดสุทธิ</th>
        </tr>
        ${rows}
        ${
          billDiscount > 0
            ? `<tr>
          <td colspan="2" style="padding: 8px 10px 0 10px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: right;">ราคาเต็มรวม</td>
          <td style="padding: 8px 10px 0 10px; border-top: 2px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: right; white-space: nowrap;">${money(bill.billAmount + billDiscount)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 2px 10px 0 10px; font-size: 12px; font-weight: 700; color: #047857; text-align: right;">หักส่วนลดคูปองบริษัท</td>
          <td style="padding: 2px 10px 0 10px; font-size: 12px; font-weight: 700; color: #047857; text-align: right; white-space: nowrap;">-${money(billDiscount)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td colspan="2" style="padding: 10px; border-top: 2px solid #e2e8f0; font-size: 13px; font-weight: 800; color: #0f172a; text-align: right;">ยอดบิล ${bill.attendees.length} ท่าน</td>
          <td style="padding: 10px; border-top: 2px solid #e2e8f0; font-size: 14px; font-weight: 800; color: #0026b3; text-align: right; white-space: nowrap;">${money(bill.billAmount)}</td>
        </tr>
      </table>
    </div>`;
}

export function renderSponsorHistoryEmail(options: SponsorHistoryEmailOptions): string {
  const { kind, companyName, contactName, scopeLabel, bills, extraNote, dueDate, bank } = options;
  const isOverdue = kind === 'overdue';
  const subject = sponsorHistoryEmailSubject(kind, companyName);

  const totalPeople = bills.reduce((sum, b) => sum + b.attendees.length, 0);
  const totalAmount = bills.reduce((sum, b) => sum + b.billAmount, 0);
  const outstandingAmount = bills.filter((b) => b.isOutstanding).reduce((sum, b) => sum + b.billAmount, 0);

  const intro = isOverdue
    ? `สมาคมขอแจ้งรายการค่าลงทะเบียนของ <strong>${esc(companyName)}</strong> ที่ยังไม่ได้รับหลักฐานการชำระเงิน ตามรายละเอียดด้านล่าง กรุณาชำระเงินและแนบสลิปผ่านเมนูบริษัทในระบบลงทะเบียน`
    : `สมาคมขอส่งสรุปประวัติการลงทะเบียนของ <strong>${esc(companyName)}</strong> ตามรายละเอียดด้านล่าง`;

  const summaryCell = (label: string, value: string, color = '#0f172a') => `
    <td class="summary-cell" style="padding: 12px; text-align: center; vertical-align: top;">
      <div style="font-size: 12px; color: #64748b;">${label}</div>
      <div style="font-size: 17px; font-weight: 800; color: ${color}; margin-top: 2px;">${value}</div>
    </td>`;

  const noteHtml = extraNote?.trim()
    ? `<div style="margin: 0 0 20px 0; padding: 14px 16px; border-left: 4px solid #0026b3; background-color: #eff6ff; border-radius: 8px; font-size: 14px; color: #1e3a8a; line-height: 1.7;">${esc(extraNote.trim()).replace(/\n/g, '<br/>')}</div>`
    : '';

  const paymentHtml =
    isOverdue && bank
      ? `
    <div style="margin: 8px 0 0 0; padding: 16px; border: 1px solid #fed7aa; background-color: #fff7ed; border-radius: 12px; font-size: 14px; color: #7c2d12; line-height: 1.8;">
      <div style="font-weight: 800; margin-bottom: 4px;">ช่องทางการชำระเงิน</div>
      ธนาคาร ${esc(bank.name)}<br/>
      เลขที่บัญชี <strong>${esc(bank.accountNo)}</strong><br/>
      ชื่อบัญชี ${esc(bank.accountName)}
      ${dueDate ? `<div style="margin-top: 8px; font-weight: 800; color: #c2410c;">กรุณาชำระภายในวันที่ ${thaiDate(dueDate)}</div>` : ''}
      <div style="margin-top: 8px; font-size: 13px; color: #9a3412;">หากชำระเงินเรียบร้อยแล้ว ขออภัยหากอีเมลนี้ซ้ำซ้อน และรบกวนแนบสลิปในระบบเพื่อให้เจ้าหน้าที่ตรวจสอบ</div>
    </div>`
      : '';

  const content = `
    <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 14px;">
      เรียน ${esc(contactName || `ผู้ประสานงาน ${companyName}`)}
    </div>
    <p style="margin: 0 0 18px 0; font-size: 15px; line-height: 1.7; color: #334155;">${intro}</p>
    <div style="font-size: 13px; color: #64748b; margin: 0 0 12px 0;">ขอบเขตข้อมูล: <strong style="color: #334155;">${esc(scopeLabel)}</strong></div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border: 1px solid #e2e8f0; border-radius: 12px; margin: 0 0 20px 0; background-color: #ffffff;">
      <tr>
        ${summaryCell('จำนวนบิล', `${bills.length.toLocaleString('th-TH')}`)}
        ${summaryCell('ผู้เข้าร่วม', `${totalPeople.toLocaleString('th-TH')} ท่าน`)}
        ${isOverdue ? summaryCell('ยอดค้างชำระ', money(outstandingAmount), '#c2410c') : summaryCell('ยอดรวม', money(totalAmount), '#0026b3')}
      </tr>
      ${
        !isOverdue && outstandingAmount > 0
          ? `<tr><td colspan="3" style="padding: 0 12px 12px 12px; text-align: center; font-size: 13px; font-weight: 700; color: #c2410c;">ในจำนวนนี้มียอดรอชำระ ${money(outstandingAmount)}</td></tr>`
          : ''
      }
    </table>

    ${noteHtml}
    ${bills.map(renderBill).join('')}
    ${paymentHtml}
  `;

  return renderBaseEmailLayout({
    title: subject,
    preheader: isOverdue ? `ยอดค้างชำระ ${money(outstandingAmount)}` : `${bills.length} บิล ${totalPeople} ท่าน`,
    contentHtml: content,
  });
}
