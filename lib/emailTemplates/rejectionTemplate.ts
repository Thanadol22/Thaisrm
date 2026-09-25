import { renderBaseEmailLayout } from './baseLayout';

export interface SlipRejectionEmailOptions {
  recipientName: string;
  meetingName: string;
  rejectionReason: string;
  resubmitUrl: string;
  ticketCode?: string;
  amount?: number;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantWorkplace?: string;
  isCorporate?: boolean;
  companyName?: string;
  rejectType?: 'info' | 'slip';
}

export function renderSlipRejectionEmail(options: SlipRejectionEmailOptions): string {
  const isInfoMode = options.rejectType === 'info' || (options.rejectionReason?.includes('ข้อมูล') && !options.rejectionReason?.includes('สลิป'));
  const isCorporate = Boolean(options.isCorporate || options.ticketCode?.startsWith('MEMGRP'));

  const headingText = isInfoMode
    ? 'โปรดตรวจสอบและแก้ไขข้อมูลการลงทะเบียน'
    : 'โปรดแนบหลักฐานการโอนเงิน (สลิป) ใหม่';

  const badgeText = isInfoMode
    ? 'แจ้งแก้ไขข้อมูลการลงทะเบียน'
    : 'แจ้งแนบหลักฐานการชำระเงินใหม่';

  const cardTitle = isInfoMode
    ? 'ขั้นตอนการตรวจสอบและแก้ไขข้อมูล'
    : 'ขั้นตอนการแนบหลักฐานการโอนเงินใหม่';

  const cardDesc = isInfoMode
    ? 'เจ้าหน้าที่ได้ตรวจสอบข้อมูลของท่าน และพบว่ามีข้อมูลบางส่วนไม่ถูกต้อง กรุณาคลิกปุ่มด้านล่างเพื่อเข้าสู่แบบฟอร์มแก้ไขข้อมูลส่วนตัวให้ถูกต้อง <strong>(ท่านไม่ต้องกรอกข้อมูลใหม่ทั้งหมด และไม่ต้องแนบสลิปใหม่ครับ)</strong>'
    : 'เจ้าหน้าที่ได้ตรวจสอบหลักฐานของท่าน และพบว่าสลิปการโอนเงินไม่ถูกต้องหรือไม่ชัดเจน กรุณาคลิกปุ่มด้านล่างเพื่อเข้าสู่แบบฟอร์ม <strong>อัปโหลดรูปภาพสลิปการโอนเงินใหม่</strong>';

  const buttonText = isInfoMode
    ? '📝 คลิกที่นี่เพื่อเข้าสู่แบบฟอร์มแก้ไขข้อมูล'
    : '📤 คลิกที่นี่เพื่อแนบสลิปการโอนเงินใหม่';

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">${isInfoMode ? '⚠️' : '🧾'}</div>
      <span class="badge-alert">${badgeText}</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        ${headingText}
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM) ขอแจ้งผลการตรวจสอบสำหรับรายการ ${options.meetingName}
      </p>
    </div>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 800; color: #991b1b; text-transform: uppercase; margin-bottom: 6px;">
        เหตุผล / รายละเอียดที่เจ้าหน้าที่แจ้งกลับ:
      </div>
      <div style="font-size: 15px; font-weight: 700; color: #b91c1c; line-height: 1.5;">
        "${options.rejectionReason}"
      </div>
    </div>

    <!-- Registration Details Form Summary -->
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
        📋 ข้อมูลแบบฟอร์มรายการเดิมที่ส่งลงทะเบียน:
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px; color: #334155;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; width: 35%;">รายการ / งานประชุม:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${options.meetingName}</td>
        </tr>
        ${options.ticketCode ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">รหัสอ้างอิง:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0026b3;">${options.ticketCode}</td>
        </tr>` : ''}
        ${isCorporate ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">บริษัท / นิติบุคคล:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${options.companyName || options.recipientName}</td>
        </tr>
        ${options.applicantEmail ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">อีเมลประสานงาน:</td>
          <td style="padding: 6px 0;">${options.applicantEmail}</td>
        </tr>` : ''}
        ` : `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">ชื่อ-นามสกุล:</td>
          <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${options.recipientName}</td>
        </tr>
        ${options.applicantEmail ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">อีเมล:</td>
          <td style="padding: 6px 0;">${options.applicantEmail}</td>
        </tr>` : ''}
        ${options.applicantPhone ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">เบอร์โทรศัพท์:</td>
          <td style="padding: 6px 0;">${options.applicantPhone}</td>
        </tr>` : ''}
        ${options.applicantWorkplace ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">หน่วยงาน / สถานที่ทำงาน:</td>
          <td style="padding: 6px 0;">${options.applicantWorkplace}</td>
        </tr>` : ''}
        `}
        ${options.amount !== undefined ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b;">ยอดเงินที่ต้องชำระ:</td>
          <td style="padding: 6px 0; font-weight: 800; color: #0026b3; font-size: 15px;">฿ ${options.amount.toLocaleString()}</td>
        </tr>` : ''}
      </table>
    </div>

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 8px;">
        ${cardTitle}
      </div>
      <p style="font-size: 13.5px; color: #475569; margin: 0 0 10px 0; line-height: 1.6;">
        ${cardDesc}
      </p>
    </div>

    <div style="text-align: center; margin: 28px 0;">
      <a href="${options.resubmitUrl}" class="btn btn-reject" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 14px; font-weight: bold; text-decoration: none; border-radius: 8px;">
        ${buttonText}
      </a>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 12px;">
        หรือคัดลอกลิงก์นี้เปิดในเบราว์เซอร์: <br/>
        <a href="${options.resubmitUrl}" style="color: #2563eb; word-break: break-all;">${options.resubmitUrl}</a>
      </div>
    </div>

    <div style="background-color: #f8fafc; border-radius: 8px; padding: 14px; text-align: center; border: 1px dashed #cbd5e1; margin-top: 24px;">
      <p style="font-size: 12.5px; color: #64748b; margin: 0;">
        หากท่านมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม โปรดตอบกลับอีเมลนี้หรือติดต่อเจ้าหน้าที่สมาคมฯ
      </p>
    </div>
  `;

  return renderBaseEmailLayout({
    title: `${isInfoMode ? 'แจ้งแก้ไขข้อมูลการลงทะเบียน' : 'แจ้งแนบสลิปการโอนเงินใหม่'} - ${options.meetingName}`,
    preheader: `${headingText} สำหรับรายการ ${options.meetingName} (เหตุผล: ${options.rejectionReason})`,
    contentHtml: content,
  });
}
