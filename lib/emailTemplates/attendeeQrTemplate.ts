import { renderBaseEmailLayout } from './baseLayout';

export interface AttendeeTicketEmailOptions {
  recipientName: string;
  meetingName: string;
  meetingDate?: string;
  location?: string;
  ticketCode: string;
  memberNo?: string;
  attendanceStatus?: string;
  qrCodeUrl: string;
  extraNote?: string;
}

export function renderAttendeeTicketEmail(options: AttendeeTicketEmailOptions): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge-success">บัตรเข้างาน E-Ticket อย่างเป็นทางการ</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        ${options.meetingName}
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        เรียน คุณ <strong>${options.recipientName}</strong> บัตรเข้าร่วมงานประชุมของท่านพร้อมใช้งานแล้ว
      </p>
    </div>

    <!-- Ticket Visual Card -->
    <div style="background: linear-gradient(135deg, #0026b3 0%, #001768 100%); border-radius: 16px; padding: 24px; color: #ffffff; text-align: center; margin: 20px 0; box-shadow: 0 10px 20px -5px rgba(0, 38, 179, 0.3);">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #93c5fd; margin-bottom: 4px;">
        CONFERENCE PASS
      </div>
      <div style="font-size: 18px; font-weight: 800; margin-bottom: 16px; color: #ffffff;">
        ${options.recipientName}
      </div>

      <div style="background-color: #ffffff; padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 14px;">
        <img src="${options.qrCodeUrl}" alt="Check-in QR Code" style="width: 190px; height: 190px; display: block;" />
      </div>

      <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #4ade80; font-family: monospace;">
        ${options.ticketCode}
      </div>
      <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">
        ${options.memberNo ? `รหัสสมาชิก: ${options.memberNo} • ` : ''}สถานะ: ${options.attendanceStatus || 'ยืนยันแล้ว'}
      </div>
    </div>

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0026b3; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
        ข้อมูลการเข้าร่วมงาน
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่องาน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.meetingName}</td>
        </tr>
        ${options.meetingDate ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">วันและเวลา</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.meetingDate}</td>
        </tr>
        ` : ''}
        ${options.location ? `
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">สถานที่จัดงาน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.location}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    ${options.extraNote ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 16px;">
        <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">ข้อความจากผู้จัดงาน:</div>
        <p style="font-size: 13px; color: #334155; margin: 0; line-height: 1.5;">${options.extraNote}</p>
      </div>
    ` : ''}

    <p style="font-size: 12.5px; color: #64748b; margin-top: 24px; text-align: center;">
      กรุณาบันทึกภาพหน้าจอนี้ หรือเปิดอีเมลแสดง QR Code แก่เจ้าหน้าที่ ณ จุดลงทะเบียนเพื่อความรวดเร็วในการรับป้ายชื่อ
    </p>
  `;

  return renderBaseEmailLayout({
    title: `บัตรเข้างาน (E-Ticket) ${options.meetingName} - TSRM`,
    preheader: `บัตรเข้าร่วมงานของคุณ ${options.recipientName} รหัส ${options.ticketCode}`,
    contentHtml: content,
  });
}
