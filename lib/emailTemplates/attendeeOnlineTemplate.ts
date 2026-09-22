import { renderBaseEmailLayout } from './baseLayout';

export interface AttendeeOnlineEmailOptions {
  recipientName: string;
  meetingName: string;
  meetingDate?: string;
  ticketCode: string;
  memberNo?: string;
  attendanceStatus?: string;
  zoomUrl?: string;
  meetingIdCredentials?: string;
  passcode?: string;
  onlineInstructions?: string;
  extraNote?: string;
}

export function renderAttendeeOnlineEmail(options: AttendeeOnlineEmailOptions): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge-info" style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 13px; letter-spacing: 0.5px;">
        🌐 ยืนยันสิทธิ์เข้าร่วมการประชุมแบบออนไลน์ (Online Access Pass)
      </span>
      <h2 style="color: #0f172a; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800;">
        ${options.meetingName}
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        เรียน คุณ <strong>${options.recipientName}</strong> สิทธิ์การเข้าชมการถ่ายทอดสดออนไลน์ของท่านได้รับการยืนยันเรียบร้อยแล้ว
      </p>
    </div>

    <!-- Online Pass Visual Card (No Onsite QR Code) -->
    <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%); border-radius: 16px; padding: 26px 20px; color: #ffffff; text-align: center; margin: 20px 0; box-shadow: 0 10px 25px -5px rgba(2, 132, 199, 0.35);">
      <div style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #bae6fd; margin-bottom: 6px;">
        ONLINE ATTENDANCE PASS
      </div>
      <div style="font-size: 20px; font-weight: 800; margin-bottom: 12px; color: #ffffff;">
        ${options.recipientName}
      </div>

      <div style="display: inline-block; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 12px; padding: 10px 20px; margin-bottom: 16px;">
        <span style="font-size: 12px; color: #e0f2fe; text-transform: uppercase; letter-spacing: 1px;">รหัสบัตรเข้าร่วมงาน</span>
        <div style="font-size: 20px; font-weight: 900; letter-spacing: 2px; color: #ffffff; font-family: monospace; margin-top: 2px;">
          ${options.ticketCode}
        </div>
      </div>

      <div style="font-size: 13px; color: #e0f2fe;">
        ${options.memberNo ? `รหัสสมาชิก: <strong>${options.memberNo}</strong> • ` : ''}รูปแบบ: <strong>ออนไลน์ (Online Web Conference)</strong>
      </div>
    </div>

    <!-- Online Conference Access Box -->
    <div style="background-color: #f0f9ff; border: 2px solid #bae6fd; border-radius: 16px; padding: 20px; margin: 24px 0;">
      <div style="font-size: 15px; font-weight: 800; color: #0369a1; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;">
        💻 ข้อมูลการเข้าสู่ระบบประชุมออนไลน์
      </div>

      ${options.zoomUrl ? `
        <div style="text-align: center; margin: 16px 0;">
          <a href="${options.zoomUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 800; font-size: 15px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);">
            🎥 คลิกที่นี่เพื่อเข้าร่วมห้องประชุมออนไลน์ (Join Meeting)
          </a>
        </div>
      ` : `
        <div style="text-align: center; color: #0284c7; font-size: 14px; font-weight: 700; margin: 10px 0;">
          ลิงก์เข้าร่วมห้องประชุมจะส่งให้ทางอีเมลนี้ก่อนเริ่มการประชุม
        </div>
      `}

      ${(options.meetingIdCredentials || options.passcode) ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 14px; background-color: #ffffff; border-radius: 10px; border: 1px solid #e0f2fe; overflow: hidden;">
          ${options.meetingIdCredentials ? `
            <tr style="border-bottom: 1px solid #f0f9ff;">
              <td style="padding: 10px 14px; color: #64748b; font-size: 13.5px; font-weight: 600;">Meeting ID / ห้องประชุม</td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #0f172a; font-size: 14px; font-family: monospace;">${options.meetingIdCredentials}</td>
            </tr>
          ` : ''}
          ${options.passcode ? `
            <tr>
              <td style="padding: 10px 14px; color: #64748b; font-size: 13.5px; font-weight: 600;">Passcode / รหัสผ่านเข้าห้อง</td>
              <td style="padding: 10px 14px; text-align: right; font-weight: 800; color: #0369a1; font-size: 14px; font-family: monospace;">${options.passcode}</td>
            </tr>
          ` : ''}
        </table>
      ` : ''}
    </div>

    <!-- Meeting Details -->
    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0369a1; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px;">
        รายละเอียดงานประชุม
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
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รูปแบบการเข้าร่วม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0284c7; font-size: 14px;">ถ่ายทอดสดออนไลน์ (Online Web Conference)</td>
        </tr>
      </table>
    </div>

    <!-- Instructions & Notes -->
    <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 18px;">
      <div style="font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 6px;">
        📌 คำแนะนำและข้อปฏิบัติสำหรับการเข้าร่วมออนไลน์:
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.6;">
        ${options.onlineInstructions ? `
          <li>${options.onlineInstructions}</li>
        ` : `
          <li>กรุณาตั้งชื่อในระบบ Zoom หรือระบบการประชุมให้ตรงกับ <strong>"${options.recipientName}"</strong> เพื่อให้เจ้าหน้าที่ตรวจสอบสิทธิ์</li>
          <li>แนะนำให้เข้าสู่ห้องประชุมก่อนเวลาเริ่มการบรรยายอย่างน้อย 10-15 นาที</li>
          <li>กรุณาปิดไมโครโฟนระหว่างการบรรยาย และสามารถพิมพ์คำถามผ่านช่องแชท (Q&A) ได้ตลอดรายการ</li>
        `}
      </ul>
    </div>

    ${options.extraNote ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 14px;">
        <div style="font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 4px;">ข้อความเพิ่มเติมจากผู้จัดงาน:</div>
        <p style="font-size: 13px; color: #475569; margin: 0; line-height: 1.5;">${options.extraNote}</p>
      </div>
    ` : ''}

    <p style="font-size: 12.5px; color: #94a3b8; margin-top: 24px; text-align: center;">
      (หมายเหตุ: สำหรับผู้เข้าร่วมแบบออนไลน์ ไม่จำเป็นต้องแสดง QR Code ณ สถานที่จัดงาน)
    </p>
  `;

  return renderBaseEmailLayout({
    title: `ยืนยันสิทธิ์เข้าร่วมออนไลน์ (Online Pass) ${options.meetingName} - TSRM`,
    preheader: `สิทธิ์เข้าร่วมประชุมออนไลน์ของคุณ ${options.recipientName} รหัส ${options.ticketCode}`,
    contentHtml: content,
  });
}
