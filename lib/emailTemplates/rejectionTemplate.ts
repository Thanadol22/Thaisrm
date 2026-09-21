import { renderBaseEmailLayout } from './baseLayout';

export interface SlipRejectionEmailOptions {
  recipientName: string;
  meetingName: string;
  rejectionReason: string;
  resubmitUrl: string;
}

export function renderSlipRejectionEmail(options: SlipRejectionEmailOptions): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">⚠️</div>
      <span class="badge-alert">แจ้งผลการตรวจสอบสลิป</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        โปรดแนบหลักฐานการโอนเงินใหม่
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        สมาคมฯ ขอแจ้งผลการตรวจสอบหลักฐานการชำระเงินสำหรับรายการ ${options.meetingName}
      </p>
    </div>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #dc2626; border-radius: 8px; padding: 18px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 800; color: #991b1b; text-transform: uppercase; margin-bottom: 6px;">
        เหตุผลที่เจ้าหน้าที่ไม่อนุมัติ:
      </div>
      <div style="font-size: 15px; font-weight: 600; color: #b91c1c; line-height: 1.5;">
        "${options.rejectionReason}"
      </div>
    </div>

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #334155; text-transform: uppercase; margin-bottom: 8px;">
        ขั้นตอนการส่งหลักฐานใหม่ (In-place Resubmit)
      </div>
      <p style="font-size: 13.5px; color: #475569; margin: 0 0 12px 0; line-height: 1.6;">
        ท่าน<strong>ไม่ต้องทำการกรอกใบสมัครหรือลงทะเบียนใหม่</strong> เพียงคลิกปุ่มด้านล่างเพื่อเข้าสู่หน้าอัปโหลดสลิปที่ถูกต้อง ระบบจะทำการปรับปรุงข้อมูลเดิมและส่งให้เจ้าหน้าที่ตรวจสอบใหม่อัตโนมัติครับ
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${options.resubmitUrl}" class="btn btn-reject" target="_blank">
        📤 คลิกที่นี่เพื่ออัปโหลดสลิปใหม่
      </a>
      <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
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
    title: `แจ้งผลการตรวจสอบการชำระเงิน - ${options.meetingName}`,
    preheader: `โปรดแนบสลิปชำระเงินใหม่สำหรับรายการ ${options.meetingName} (เหตุผล: ${options.rejectionReason})`,
    contentHtml: content,
  });
}
