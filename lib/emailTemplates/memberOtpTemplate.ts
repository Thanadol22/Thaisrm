export interface MemberOtpEmailOptions {
  otpCode: string;
  recipientName: string;
  memberNo: string;
  expiresInMinutes?: number;
}

export function renderMemberOtpEmail(options: MemberOtpEmailOptions): string {
  const {
    otpCode,
    recipientName,
    memberNo,
    expiresInMinutes = 10,
  } = options;

  const content = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
      <!-- Header Banner -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #1d4ed8 50%, #2563eb 100%); padding: 32px 24px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.025em; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM)
        </h1>
        <p style="margin: 6px 0 0; font-size: 14px; color: #bfdbfe; font-weight: 500;">
          ระบบจัดการและอัปเดตข้อมูลสมาชิก
        </p>
      </div>

      <!-- Main Body -->
      <div style="padding: 32px 24px; color: #1e293b; line-height: 1.6;">
        <h2 style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #0f172a;">
          เรียน คุณ ${recipientName} (เลขที่สมาชิก: ${memberNo})
        </h2>
        
        <p style="margin: 0 0 20px; font-size: 15px; color: #475569;">
          ท่านได้ทำการร้องขอรหัสชั่วคราว (OTP) เพื่อเข้าสู่ระบบตรวจสอบและอัปเดตข้อมูลส่วนตัวของสมาชิกสมาคมฯ กรุณาใช้รหัสด้านล่างนี้เพื่อยืนยันตัวตน:
        </p>

        <!-- OTP Display Box -->
        <div style="background: #f8fafc; border: 2px dashed #93c5fd; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="display: block; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">
            รหัสยืนยันตัวตนชั่วคราว (OTP)
          </span>
          <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #1e40af; letter-spacing: 0.25em; padding: 4px 12px; background: #eff6ff; border-radius: 8px;">
            ${otpCode}
          </span>
          <span style="display: block; font-size: 12px; color: #ef4444; margin-top: 12px; font-weight: 500;">
            ⏳ รหัสนี้จะหมดอายุภายใน ${expiresInMinutes} นาที
          </span>
        </div>

        <!-- Instructions -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px; margin-top: 24px;">
          <p style="margin: 0; font-size: 13px; color: #166534; line-height: 1.5;">
            <strong>💡 คำแนะนำ:</strong> หากข้อมูลส่วนตัวของท่านในระบบยังมีช่องว่าง เช่น เบอร์โทรศัพท์ สถานที่ทำงาน หรือวุฒิการศึกษา ท่านสามารถระบุข้อมูลเพิ่มเติมให้ครบถ้วนในระบบได้ทันที
          </p>
        </div>

        <p style="margin: 24px 0 0; font-size: 13px; color: #94a3b8; text-align: center;">
          หากท่านไม่ได้เป็นผู้ทำรายการนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #f8fafc; padding: 20px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b;">
        <p style="margin: 0 0 4px; font-weight: 600;">สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (Thai Society for Reproductive Medicine - TSRM)</p>
        <p style="margin: 0;">Email: tsrm.info@gmail.com | Website: https://thaisrm.org</p>
      </div>
    </div>
  `;

  return content;
}
