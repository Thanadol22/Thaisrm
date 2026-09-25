export interface SponsorOtpEmailOptions {
  companyName: string;
  contactEmail: string;
  otpCode: string;
  expiresInMinutes?: number;
  couponCode?: string;
  remainingQuota?: number;
  totalQuota?: number;
  meetingName?: string;
  systemType?: 'membership' | 'registration';
}

export function renderSponsorOtpEmail(options: SponsorOtpEmailOptions): string {
  const {
    companyName,
    otpCode,
    expiresInMinutes = 10,
    couponCode,
    remainingQuota,
    totalQuota,
    meetingName = 'การประชุมวิชาการประจำปี TSRM',
    systemType = 'registration',
  } = options;

  const isMembership = systemType === 'membership';
  const pageTitle = isMembership
    ? 'รหัสชั่วคราว (OTP) สำหรับเข้าสู่ระบบสมัครสมาชิกบริษัท - TSRM'
    : 'รหัสชั่วคราวและคูปองสิทธิ์สำหรับเข้าสู่ระบบลงทะเบียนสปอนเซอร์ - TSRM';
  const headerSubtitle = isMembership
    ? 'ระบบสมัครสมาชิกสมาคมแบบกลุ่มสำหรับบริษัท (Corporate Membership)'
    : 'ระบบลงทะเบียนผู้เข้าร่วมประชุมแบบกลุ่มสำหรับบริษัทสปอนเซอร์';
  const introMessage = isMembership
    ? `คุณได้ทำการร้องขอรหัสชั่วคราว (OTP) เพื่อเข้าสู่ระบบสมัครสมาชิกสมาคมแบบกลุ่มในนามบริษัท <strong>${companyName}</strong> กรุณาใช้รหัสด้านล่างนี้เพื่อยืนยันตัวตน:`
    : `คุณได้ทำการร้องขอรหัสชั่วคราว (OTP) เพื่อเข้าสู่ระบบลงทะเบียนและจัดการสิทธิ์ของบริษัทสำหรับงาน <strong>${meetingName}</strong> กรุณาใช้รหัสด้านล่างนี้เพื่อยืนยันตัวตน:`;

  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #0026b3 0%, #001773 100%); padding: 32px 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px;">
          สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)
        </h1>
        <p style="color: #93c5fd; margin: 0; font-size: 14px; font-weight: 500;">
          ${headerSubtitle}
        </p>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 36px 32px;">
        <p style="font-size: 16px; color: #334155; margin-top: 0; line-height: 1.6;">
          เรียน ตัวแทนผู้ประสานงาน <strong>${companyName}</strong>,
        </p>
        <p style="font-size: 15px; color: #475569; line-height: 1.6;">
          ${introMessage}
        </p>

        <!-- OTP Box -->
        <div style="margin: 24px 0; text-align: center;">
          <div style="display: inline-block; background: linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%); border: 2px dashed #2563eb; border-radius: 12px; padding: 18px 36px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1e40af;">
              ${otpCode}
            </span>
          </div>
          <p style="font-size: 13px; color: #dc2626; margin: 10px 0 0 0; font-weight: 600;">
            ⏳ รหัส OTP นี้จะหมดอายุภายใน ${expiresInMinutes} นาที
          </p>
        </div>

        ${
          !isMembership && couponCode
            ? `
        <!-- Rotated Coupon Code Box (Anti-Impersonation) -->
        <div style="margin: 28px 0; background: #faf5ff; border: 2px solid #d8b4fe; border-radius: 14px; padding: 20px 24px; text-align: center;">
          <div style="font-size: 12px; font-weight: 800; color: #7e22ce; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
            🎟️ รหัสคูปองสิทธิ์ฟรีสำหรับลงทะเบียน (สิทธิ์ปัจจุบัน)
          </div>
          <div style="font-size: 13px; color: #6b21a8; margin-bottom: 12px;">
            โควต้าสิทธิ์คงเหลือ: <strong style="font-size: 15px; color: #581c87;">${remainingQuota ?? '-'} / ${totalQuota ?? '-'} สิทธิ์</strong>
          </div>
          <div style="display: inline-block; background: #ffffff; border: 1.5px solid #a855f7; border-radius: 10px; padding: 10px 24px;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 22px; font-weight: 800; letter-spacing: 3px; color: #6b21a8;">
              ${couponCode}
            </span>
          </div>
          <p style="font-size: 12px; color: #7e22ce; margin: 12px 0 0 0; line-height: 1.5;">
            🔒 <em>รหัสคูปองนี้ถูกสุ่มสร้างใหม่ทุกครั้งที่ขอ OTP เพื่อความปลอดภัย (รหัสเดิมถูกยกเลิกแล้ว)</em>
          </p>
        </div>
        `
            : (!isMembership && totalQuota && totalQuota > 0)
            ? `
        <!-- Quota Exhausted Notice -->
        <div style="margin: 24px 0; background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px 20px;">
          <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
            ⚠️ <strong>แจ้งเตือนสถานะโควต้า:</strong> บริษัทของท่านได้ใช้สิทธิ์ลงทะเบียนครบตามจำนวนที่กำหนดแล้ว (${totalQuota}/${totalQuota} สิทธิ์) จึงไม่มีรหัสคูปองแนบมาในรอบนี้
          </p>
        </div>
        `
            : ''
        }

        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
            🔒 <strong>ข้อแนะนำความปลอดภัย:</strong><br/>
            • รหัส OTP ใช้ได้เพียง 1 ครั้งเท่านั้น และจะขอใหม่ทุกครั้งที่เข้าสู่ระบบ<br/>
            • ระบบจะทำการตัดเซสชัน (Logout) อัตโนมัติหากไม่มีการเคลื่อนไหวเกิน 5 นาที<br/>
            • หากคุณไม่ได้เป็นผู้ร้องขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้
          </p>
        </div>

        <p style="font-size: 14px; color: #64748b; margin-bottom: 0; line-height: 1.5;">
          หากพบปัญหาในการใช้งาน สามารถติดต่อฝ่ายประสานงาน TSRM ได้ทันที<br/>
          ขอแสดงความนับถือ,<br/>
          <strong>สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)</strong>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 18px 30px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
        อีเมลนี้เป็นระบบอัตโนมัติ กรุณาอย่าตอบกลับอีเมลนี้โดยตรง
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
