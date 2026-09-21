import { renderBaseEmailLayout } from './baseLayout';

export interface MembershipApprovalEmailOptions {
  recipientName: string;
  memberNo: string;
  amountPaid: number;
  qrCodeUrl?: string;
  loginUrl?: string;
}

export function renderMembershipApprovedEmail(options: MembershipApprovalEmailOptions): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">🎉</div>
      <span class="badge-success">ใบสมัครได้รับการอนุมัติแล้ว</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        ยินดีต้อนรับสมาชิกใหม่
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        สมาคมเวชศาสตร์การเจริญพันธุ์ไทยได้ตรวจสอบและอนุมัติการสมัครสมาชิกของท่านเรียบร้อยแล้ว
      </p>
    </div>

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0026b3; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
        ข้อมูลสมาชิกของท่าน
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่อ-นามสกุล</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.recipientName}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสสมาชิก (Member No.)</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0026b3; font-size: 16px;">${options.memberNo}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ยอดค่าบำรุงที่ชำระ</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">${options.amountPaid.toLocaleString()} บาท</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">สถานะสมาชิก</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">ปกติ (Active)</td>
        </tr>
      </table>
    </div>

    ${options.qrCodeUrl ? `
      <div style="text-align: center; margin: 24px 0; padding: 18px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 12px;">
          QR Code ข้อมูลสมาชิกของท่าน
        </div>
        <img src="${options.qrCodeUrl}" alt="Member QR Code" style="width: 170px; height: 170px; border-radius: 8px; border: 4px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
      </div>
    ` : ''}

    <div style="text-align: center; margin-top: 28px;">
      <a href="${options.loginUrl || 'https://tsrm.com/login'}" class="btn" target="_blank">
        เข้าสู่ระบบสมาชิก TSRM
      </a>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
      ท่านสามารถใช้รหัสสมาชิกหรืออีเมลนี้ในการเข้าสู่ระบบและลงทะเบียนเข้าร่วมกิจกรรมวิชาการในอัตราสมาชิกได้ทันที
    </p>
  `;

  return renderBaseEmailLayout({
    title: 'ยืนยันการอนุมัติสมาชิก - สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
    preheader: `ยินดีต้อนรับ ${options.recipientName} รหัสสมาชิกของท่านคือ ${options.memberNo}`,
    contentHtml: content,
  });
}

export interface MeetingApprovalEmailOptions {
  recipientName: string;
  meetingName: string;
  meetingDate?: string;
  ticketCode: string;
  amountPaid: number;
  isMember: boolean;
  qrCodeUrl?: string;
}

export function renderMeetingApprovedEmail(options: MeetingApprovalEmailOptions): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">🎟️</div>
      <span class="badge-success">การลงทะเบียนได้รับการยืนยันแล้ว</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        ยืนยันการลงทะเบียนเข้าร่วมประชุม
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        เจ้าหน้าที่ได้ตรวจสอบหลักฐานการชำระเงินของท่านเรียบร้อยแล้ว
      </p>
    </div>

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0026b3; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
        รายละเอียดการลงทะเบียน
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่องานประชุม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.meetingName}</td>
        </tr>
        ${options.meetingDate ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">กำหนดการ</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.meetingDate}</td>
        </tr>
        ` : ''}
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ผู้ลงทะเบียน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.recipientName}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสบัตรเข้าร่วม (Ticket Code)</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0026b3; font-size: 16px;">${options.ticketCode}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ประเภทผู้เข้าร่วม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.isMember ? 'สมาชิกสมาคม (Member)' : 'บุคคลทั่วไป (Non-Member)'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ยอดเงินที่ชำระ</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">${options.amountPaid.toLocaleString()} บาท</td>
        </tr>
      </table>
    </div>

    ${options.qrCodeUrl ? `
      <div style="text-align: center; margin: 24px 0; padding: 20px; background-color: #ffffff; border-radius: 12px; border: 2px dashed #cbd5e1;">
        <div style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 4px;">
          QR Code สำหรับเช็คอินเข้างาน (E-Ticket)
        </div>
        <p style="font-size: 12px; color: #64748b; margin: 0 0 12px 0;">
          กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่ ณ จุดลงทะเบียนหน้างาน
        </p>
        <img src="${options.qrCodeUrl}" alt="Check-in QR Code" style="width: 180px; height: 180px; border-radius: 8px; border: 4px solid #f8fafc; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
        <div style="font-size: 14px; font-weight: 800; color: #0026b3; margin-top: 8px; letter-spacing: 1px;">
          ${options.ticketCode}
        </div>
      </div>
    ` : ''}

    <div style="background-color: #eff6ff; border-left: 4px solid #0026b3; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 20px;">
      <div style="font-size: 13px; font-weight: 700; color: #0026b3; margin-bottom: 4px;">คำแนะนำในวันงาน:</div>
      <p style="font-size: 13px; color: #1e3a8a; margin: 0; line-height: 1.5;">
        โปรดเตรียมภาพ QR Code นี้ หรือเปิดอีเมลฉบับนี้แสดงต่อเจ้าหน้าที่เพื่อรับเอกสารและป้ายชื่อผู้เข้าร่วมประชุม
      </p>
    </div>
  `;

  return renderBaseEmailLayout({
    title: `ยืนยันการลงทะเบียน ${options.meetingName} - TSRM`,
    preheader: `ยืนยันการลงทะเบียน ${options.recipientName} รหัสบัตร ${options.ticketCode}`,
    contentHtml: content,
  });
}
