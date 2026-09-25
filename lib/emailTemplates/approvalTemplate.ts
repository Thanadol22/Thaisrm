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
        <img src="${options.qrCodeUrl}" alt="Member QR Code" width="170" height="170" style="display: block; margin: 0 auto; width: 170px; height: 170px; border-radius: 8px; border: 4px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);" />
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
  amountPaid: number;
  isMember: boolean;
}

export function renderMeetingApprovedEmail(options: MeetingApprovalEmailOptions): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">✅</div>
      <span class="badge-success">การลงทะเบียนและการชำระเงินสำเร็จ</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        ยืนยันการลงทะเบียนเข้าร่วมประชุม
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        สมาคมฯ ได้ตรวจสอบหลักฐานการชำระเงินของท่านเรียบร้อยแล้ว
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
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">กำหนดการจัดงาน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.meetingDate}</td>
        </tr>
        ` : ''}
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ผู้ลงทะเบียน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.recipientName}</td>
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

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px 20px; margin-top: 24px; text-align: center;">
      <div style="font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">
        🎟️ การรับบัตรเข้างาน (E-Ticket / Online Pass)
      </div>
      <p style="font-size: 13px; color: #1e3a8a; margin: 0; line-height: 1.6;">
        ระบบจะจัดส่ง <strong>บัตรเข้างาน (E-Ticket พร้อม QR Code สำหรับ Onsite)</strong> หรือ <strong>ลิงก์ห้องประชุม (Online Pass สำหรับ Online)</strong> ให้ท่านทางอีเมลนี้อีกครั้ง ก่อนถึงกำหนดวันเริ่มงานประชุม
      </p>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
      หากมีข้อสงสัยหรือต้องการสอบถามข้อมูลเพิ่มเติม สามารถติดต่อสมาคมฯ ได้ทางอีเมลนี้
    </p>
  `;

  return renderBaseEmailLayout({
    title: `ยืนยันการลงทะเบียน ${options.meetingName} - TSRM`,
    preheader: `ยืนยันการลงทะเบียน ${options.recipientName} สำหรับ ${options.meetingName}`,
    contentHtml: content,
  });
}

export interface CompanyGroupMembershipApprovalEmailOptions {
  companyName: string;
  coordinatorName: string;
  ticketCode: string;
  amountPaid: number;
  isPayLater: boolean;
  applicants: Array<{
    name: string;
    email: string;
    memberNo: string;
  }>;
}

export function renderCompanyGroupMembershipApprovedEmail(options: CompanyGroupMembershipApprovalEmailOptions): string {
  const applicantRows = options.applicants
    .map(
      (app, idx) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; text-align: center; color: #64748b; font-size: 13px; font-weight: 700;">${idx + 1}</td>
        <td style="padding: 10px 8px; color: #0f172a; font-size: 14px; font-weight: 700;">
          ${app.name}
          <div style="font-size: 12px; color: #64748b; font-weight: normal; margin-top: 2px;">${app.email}</div>
        </td>
        <td style="padding: 10px 8px; text-align: right; color: #0026b3; font-weight: 800; font-family: monospace; font-size: 14px;">
          #${app.memberNo}
        </td>
      </tr>
    `
    )
    .join('');

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">🏢</div>
      <span class="badge-success">อนุมัติคำขอสมัครสมาชิกแบบกลุ่มเรียบร้อยแล้ว</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        แจ้งผลการอนุมัติสมาชิกแบบกลุ่ม
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        เรียน ${options.coordinatorName || options.companyName} (${options.companyName})
      </p>
    </div>

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0026b3; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
        สรุปรายการสมัครสมาชิกของบริษัท
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">บริษัท / หน่วยงาน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.companyName}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสอ้างอิง (Ref Code)</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0026b3; font-size: 15px; font-family: monospace;">${options.ticketCode}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">จำนวนสมาชิกที่อนุมัติ</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.applicants.length} ท่าน</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ยอดรวมค่าบำรุง</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">${options.amountPaid.toLocaleString()} บาท</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">สถานะการชำระเงิน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; font-size: 14px; color: ${options.isPayLater ? '#d97706' : '#16a34a'};">
            ${options.isPayLater ? 'รอชำระเงินภายหลัง (Awaiting Payment)' : 'ชำระเงินเรียบร้อยแล้ว (Paid)'}
          </td>
        </tr>
      </table>
    </div>

    <div style="margin: 24px 0;">
      <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">
        📋 รายชื่อสมาชิกและรหัสสมาชิกที่ได้รับ (${options.applicants.length} ท่าน)
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <thead>
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <th style="padding: 10px 8px; text-align: center; color: #475569; font-size: 12px; font-weight: 800; width: 40px;">ลำดับ</th>
            <th style="padding: 10px 8px; text-align: left; color: #475569; font-size: 12px; font-weight: 800;">ชื่อ-นามสกุล / อีเมล</th>
            <th style="padding: 10px 8px; text-align: right; color: #475569; font-size: 12px; font-weight: 800;">เลขสมาชิก</th>
          </tr>
        </thead>
        <tbody>
          ${applicantRows}
        </tbody>
      </table>
    </div>

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px 18px; margin-top: 24px;">
      <div style="font-size: 13px; font-weight: 700; color: #1e40af; margin-bottom: 4px;">
        ℹ️ การจัดส่งบัตรสมาชิกและ QR Code
      </div>
      <p style="font-size: 13px; color: #1e3a8a; margin: 0; line-height: 1.6;">
        ระบบได้ทำการจัดส่งอีเมลต้อนรับสมาชิกพร้อมไฟล์ QR Code ประจำตัวสมาชิกไปยังอีเมลส่วนตัวของผู้สมัครแต่ละท่านเรียบร้อยแล้ว
      </p>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
      หากมีข้อสงสัยหรือต้องการสอบถามข้อมูลเพิ่มเติม สามารถติดต่อสมาคมฯ ได้ทางอีเมลนี้
    </p>
  `;

  return renderBaseEmailLayout({
    title: `แจ้งผลการอนุมัติสมาชิกแบบกลุ่ม - ${options.companyName} (TSRM)`,
    preheader: `อนุมัติสมาชิกแบบกลุ่ม ${options.companyName} จำนวน ${options.applicants.length} ท่าน`,
    contentHtml: content,
  });
}
