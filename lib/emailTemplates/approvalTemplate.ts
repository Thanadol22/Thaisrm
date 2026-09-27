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
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสสมาชิก</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0026b3; font-size: 16px;">${options.memberNo}</td>
        </tr>
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ยอดค่าบำรุงที่ชำระ</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">${options.amountPaid.toLocaleString()} บาท</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">สถานะสมาชิก</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">ปกติ</td>
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

export interface MeetingApprovalItem {
  id?: string;
  name: string;
  price?: number;
  date?: string;
  type?: string;
  format?: string;
}

export function parseMeetingActivities(raw: any, fallbackAmount?: number): MeetingApprovalItem[] {
  if (!raw) {
    if (fallbackAmount !== undefined && Number(fallbackAmount) > 0) {
      return [{ name: 'ค่าลงทะเบียนเข้าร่วมประชุม', price: Number(fallbackAmount) }];
    }
    return [];
  }

  let data = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [{ name: raw, price: fallbackAmount }];
    }
  }

  if (Array.isArray(data)) {
    return data.map((item: any) => {
      if (typeof item === 'string') {
        return { name: item, price: data.length === 1 ? fallbackAmount : undefined };
      }
      const rawFmt = item.format || item.attendanceType;
      const isMain = item.type === 'main' || item.id === 'main';
      const resolvedFormat = (rawFmt === 'both' || isMain)
        ? (item.attendanceType || (rawFmt !== 'both' ? rawFmt : undefined))
        : rawFmt;

      return {
        id: item.id,
        name: item.name || item.title || item.programNameTh || item.programNameEn || item.id || 'กิจกรรมการประชุม',
        price: item.price !== undefined && Number(item.price) >= 0 ? Number(item.price) : (data.length === 1 ? fallbackAmount : undefined),
        date: item.date || undefined,
        type: item.type || undefined,
        format: resolvedFormat,
      };
    });
  }

  if (typeof data === 'object' && data !== null) {
    // 1. Group conference registration
    if (data.isGroup && Array.isArray(data.attendees)) {
      const items: MeetingApprovalItem[] = [];
      data.attendees.forEach((att: any, idx: number) => {
        const attName = att.nameTh || att.nameEn || `ผู้เข้าร่วมท่านที่ ${idx + 1}`;
        const subActs = att.selectedActivities || [];
        if (Array.isArray(subActs) && subActs.length > 0) {
          const actNames = subActs.map((a: any) => a.name || a.title || 'กิจกรรม').join(' + ');
          items.push({
            name: `${attName} (${actNames})`,
            price: Number(att.subtotal || att.price || 0),
          });
        } else {
          items.push({
            name: `${attName} - ${att.programNameTh || att.programNameEn || 'บัตรเข้าร่วมประชุม'}`,
            price: Number(att.subtotal || att.price || 0),
          });
        }
      });
      return items;
    }

    // 2. Format change
    if (data.isFormatChange) {
      const origFmt = data.originalFormat === 'onsite' ? 'Onsite' : 'Online';
      const targetFmt = data.targetFormat === 'onsite' ? 'Onsite' : 'Online';
      return [{
        name: `ค่าธรรมเนียมเปลี่ยนรูปแบบการเข้าร่วม (${origFmt} ➔ ${targetFmt})`,
        price: Number(data.changeFee) || fallbackAmount,
      }];
    }

    // 3. Wrapper { activities: [...] }
    if (Array.isArray(data.activities)) {
      return parseMeetingActivities(data.activities, fallbackAmount);
    }
  }

  return [];
}

export interface MeetingApprovalEmailOptions {
  recipientName: string;
  meetingName: string;
  meetingDate?: string;
  ticketCode?: string;
  amountPaid: number;
  isMember: boolean;
  nameEn?: string;
  memberNo?: string;
  position?: string;
  workplace?: string;
  email?: string;
  phone?: string;
  attendanceType?: string;
  sponsorCompanyName?: string;
  isCouponSponsored?: boolean;
  couponCode?: string;
  isFreeRegistration?: boolean;
  items?: MeetingApprovalItem[];
  selectedActivities?: any;
}

export function renderMeetingApprovedEmail(options: MeetingApprovalEmailOptions): string {
  // Extract extra fields from selectedActivities payload if not passed at root
  let actObj: any = null;
  if (typeof options.selectedActivities === 'string') {
    try {
      actObj = JSON.parse(options.selectedActivities);
    } catch {}
  } else if (typeof options.selectedActivities === 'object' && options.selectedActivities !== null) {
    actObj = options.selectedActivities;
  }

  const effectiveNameEn = options.nameEn || actObj?.nameEn || actObj?.guestNameEn || (actObj?.attendees?.[0]?.nameEn);
  const effectiveMemberNo = options.memberNo || actObj?.memberNo || (actObj?.attendees?.[0]?.memberNo);
  const effectivePosition = options.position || actObj?.position || actObj?.guestPosition || (actObj?.attendees?.[0]?.position);
  const effectiveWorkplace = options.workplace || actObj?.workplace || actObj?.guestWorkplace || (actObj?.attendees?.[0]?.workplace);
  const effectiveEmail = options.email || actObj?.email || actObj?.guestEmail || (actObj?.attendees?.[0]?.email);
  const effectivePhone = options.phone || actObj?.phone || actObj?.guestPhone || actObj?.mobile || (actObj?.attendees?.[0]?.phone);
  const rawAttendanceType = options.attendanceType || actObj?.attendanceType || (actObj?.attendees?.[0]?.attendanceType);
  const effectiveAttendanceType = rawAttendanceType === 'online' ? 'Online' : (rawAttendanceType === 'onsite' ? 'Onsite' : rawAttendanceType);

  const effectiveSponsorCompany = options.sponsorCompanyName || actObj?.companyName || actObj?.sponsorCompanyName;

  const items = (options.items && options.items.length > 0)
    ? options.items
    : parseMeetingActivities(options.selectedActivities, options.amountPaid);

  const isFree = options.isFreeRegistration || options.amountPaid === 0 || Boolean(options.isCouponSponsored);

  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">🎉</div>
      <span class="badge-success">การลงทะเบียนสำเร็จเรียบร้อยแล้ว</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        ยืนยันการลงทะเบียนเข้าร่วมประชุม
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        สมาคมเวชศาสตร์การเจริญพันธุ์ไทยได้บันทึกและยืนยันข้อมูลการลงทะเบียนของท่านเรียบร้อยแล้ว
      </p>
    </div>

    ${effectiveSponsorCompany ? `
      <!-- Sponsor Banner Card -->
      <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border: 1.5px solid #86efac; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; text-align: center;">
        <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 3px;">
          🏢 ผู้สนับสนุนการลงทะเบียน
        </div>
        <div style="font-size: 17px; font-weight: 800; color: #0f172a;">
          ${effectiveSponsorCompany}
        </div>
      </div>
    ` : ''}

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0026b3; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
        ข้อมูลการลงทะเบียนของท่าน
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่องานประชุม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.meetingName}</td>
        </tr>
        ${options.ticketCode ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสการลงทะเบียน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0026b3; font-size: 15px; font-family: monospace;">${options.ticketCode}</td>
        </tr>
        ` : ''}
        ${options.meetingDate ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">กำหนดการจัดงาน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.meetingDate}</td>
        </tr>
        ` : ''}
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่อ-นามสกุล</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.recipientName}</td>
        </tr>
        ${effectiveNameEn ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่อภาษาอังกฤษ</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${effectiveNameEn}</td>
        </tr>
        ` : ''}
        ${effectiveMemberNo ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสสมาชิก</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0026b3; font-size: 14px;">#${effectiveMemberNo}</td>
        </tr>
        ` : ''}
        ${effectivePosition ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ตำแหน่ง</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${effectivePosition}</td>
        </tr>
        ` : ''}
        ${effectiveWorkplace ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">หน่วยงาน / โรงพยาบาล</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${effectiveWorkplace}</td>
        </tr>
        ` : ''}
        ${effectiveEmail ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">อีเมล</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0026b3; font-size: 13.5px; font-family: monospace;">${effectiveEmail}</td>
        </tr>
        ` : ''}
        ${effectivePhone ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">เบอร์โทรศัพท์</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${effectivePhone}</td>
        </tr>
        ` : ''}
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ประเภทผู้เข้าร่วม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: ${options.isMember ? '#0026b3' : '#b45309'}; font-size: 14px;">
            ${options.isMember ? 'สมาชิกสมาคม' : 'บุคคลทั่วไป'}
          </td>
        </tr>
        ${effectiveAttendanceType ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รูปแบบการเข้าร่วม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">
            <span style="background-color: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 800;">
              ${effectiveAttendanceType}
            </span>
          </td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">สถานะการลงทะเบียน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">ยืนยันสิทธิ์เรียบร้อย</td>
        </tr>

        ${items.length > 0 ? `
        <tr style="border-top: 1px dashed #e2e8f0;">
          <td colspan="2" style="padding: 14px 0 8px 0;">
            <div style="font-size: 12.5px; font-weight: 800; color: #0026b3; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
              📋 รายการกิจกรรมที่ท่านลงทะเบียน (${items.length} รายการ)
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${items.map((item, idx) => {
                  let itemFmt = item.format || effectiveAttendanceType;
                  if (itemFmt === 'both') itemFmt = effectiveAttendanceType || 'Onsite';
                  return `
                  <tr style="${idx < items.length - 1 ? 'border-bottom: 1px dashed #e2e8f0;' : ''}">
                    <td style="padding: 8px 0; vertical-align: top;">
                      <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                        ${item.name}
                      </div>
                      ${item.date ? `
                        <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                          🗓️ ${item.date}
                        </div>
                      ` : ''}
                    </td>
                    <td style="padding: 8px 0 8px 12px; text-align: right; vertical-align: top; white-space: nowrap;">
                      ${itemFmt ? `
                        <span style="font-size: 11px; font-weight: 700; color: #1e40af; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 2px 6px; border-radius: 4px; margin-right: 6px;">
                          ${itemFmt}
                        </span>
                      ` : ''}
                      ${item.price !== undefined && Number(item.price) > 0 ? `
                        <span style="font-size: 13.5px; font-weight: 700; color: #0f172a;">
                          ${Number(item.price).toLocaleString()} บาท
                        </span>
                      ` : (item.price === 0 || isFree ? `
                        <span style="font-size: 12px; font-weight: 700; color: #16a34a; background-color: #dcfce7; padding: 2px 8px; border-radius: 4px;">
                          ฟรี
                        </span>
                      ` : '')}
                    </td>
                  </tr>
                `;
                }).join('')}
              </table>
            </div>
          </td>
        </tr>
        ` : ''}

        <tr style="border-top: 1px dashed #e2e8f0;">
          <td style="padding: 12px 0 4px 0; color: #0f172a; font-size: 14px; font-weight: 700;">ยอดเงินที่ชำระ</td>
          <td style="padding: 12px 0 4px 0; text-align: right; font-weight: 800; color: #16a34a; font-size: 17px;">
            ${options.amountPaid > 0 ? `${options.amountPaid.toLocaleString()} บาท` : '0 บาท (ได้รับสิทธิ์ฟรี)'}
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px 20px; margin-top: 24px; text-align: center;">
      <div style="font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">
        🎟️ การรับบัตรเข้างาน
      </div>
      <p style="font-size: 13px; color: #1e3a8a; margin: 0; line-height: 1.6;">
        ระบบจะจัดส่ง <strong>บัตรเข้างาน (QR Code สำหรับ Onsite)</strong> หรือ <strong>ลิงก์ห้องประชุม (สำหรับ Online)</strong> ให้ท่านทางอีเมลนี้อีกครั้ง ก่อนถึงกำหนดวันเริ่มงานประชุม
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
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสอ้างอิง</td>
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
            ${options.isPayLater ? 'รอชำระเงินภายหลัง' : 'ชำระเงินเรียบร้อยแล้ว'}
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

export interface AttendeeSponsoredRegistrationEmailOptions {
  recipientName: string;
  recipientEmail?: string;
  memberNo?: string;
  workplace?: string;
  companyName: string;
  meetingName: string;
  meetingDate?: string;
  ticketCode?: string;
  items?: MeetingApprovalItem[];
  format?: string;
}

export function renderAttendeeSponsoredRegistrationEmail(options: AttendeeSponsoredRegistrationEmailOptions): string {
  const items = options.items || [];
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 44px; margin-bottom: 8px;">🎉</div>
      <span class="badge-success">ได้รับการยืนยันการลงทะเบียนแล้ว</span>
      <h2 style="color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;">
        ยืนยันการลงทะเบียนเข้าร่วมประชุม
      </h2>
      <p style="color: #64748b; font-size: 14px; margin: 0;">
        ท่านได้รับการสนับสนุนการลงทะเบียนเข้าร่วมประชุมจาก <strong>${options.companyName}</strong>
      </p>
    </div>

    <!-- Sponsor Banner Card -->
    <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%); border: 1.5px solid #86efac; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; text-align: center;">
      <div style="font-size: 12px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
        🏢 ผู้สนับสนุนและลงทะเบียนให้ท่าน
      </div>
      <div style="font-size: 18px; font-weight: 800; color: #0f172a;">
        ${options.companyName}
      </div>
    </div>

    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0026b3; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
        ข้อมูลการเข้าร่วมประชุมของท่าน
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่องานประชุม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.meetingName}</td>
        </tr>
        ${options.ticketCode ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสการลงทะเบียน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #0026b3; font-size: 14px; font-family: monospace;">${options.ticketCode}</td>
        </tr>
        ` : ''}
        ${options.meetingDate ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">กำหนดการจัดงาน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.meetingDate}</td>
        </tr>
        ` : ''}
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ชื่อผู้เข้าร่วม</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${options.recipientName}</td>
        </tr>
        ${options.memberNo ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">รหัสสมาชิก</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #0026b3; font-size: 14px;">${options.memberNo}</td>
        </tr>
        ` : ''}
        ${options.workplace ? `
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">หน่วยงาน / โรงพยาบาล</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #334155; font-size: 14px;">${options.workplace}</td>
        </tr>
        ` : ''}
        <tr style="border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">ผู้สนับสนุนการลงทะเบียน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">${options.companyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">สถานะการลงทะเบียน</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 700; color: #16a34a; font-size: 14px;">ยืนยันสิทธิ์เรียบร้อย</td>
        </tr>

        ${items.length > 0 ? `
        <tr style="border-top: 1px dashed #e2e8f0;">
          <td colspan="2" style="padding: 12px 0 6px 0;">
            <div style="font-size: 12.5px; font-weight: 800; color: #0026b3; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
              📋 รายการกิจกรรมที่ท่านได้รับการลงทะเบียน (${items.length} รายการ)
            </div>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${items.map((item, idx) => {
                  const isMain = item.type === 'main' || item.id === 'main';
                  let itemFormat = item.format || options.format || 'onsite';
                  if (itemFormat === 'both' || isMain) {
                    itemFormat = options.format || (item.format && item.format !== 'both' ? item.format : 'onsite');
                  }
                  return `
                  <tr style="${idx < items.length - 1 ? 'border-bottom: 1px dashed #e2e8f0;' : ''}">
                    <td style="padding: 7px 0; vertical-align: top;">
                      <div style="font-size: 13.5px; font-weight: 700; color: #0f172a; line-height: 1.4;">
                        ${item.name}
                      </div>
                      ${item.date ? `
                        <div style="font-size: 12px; color: #64748b; margin-top: 3px;">
                          🗓️ ${item.date}
                        </div>
                      ` : ''}
                    </td>
                    <td style="padding: 7px 0 7px 12px; text-align: right; vertical-align: top; white-space: nowrap;">
                      <span style="font-size: 12px; font-weight: 700; color: #15803d; background-color: #dcfce7; padding: 2px 8px; border-radius: 4px;">
                        ${itemFormat}
                      </span>
                    </td>
                  </tr>
                `;
                }).join('')}
              </table>
            </div>
          </td>
        </tr>
        ` : ''}
      </table>
    </div>

    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 18px 20px; margin-top: 24px; text-align: center;">
      <div style="font-size: 14px; font-weight: 700; color: #1e40af; margin-bottom: 6px;">
        🎟️ การรับบัตรเข้างาน
      </div>
      <p style="font-size: 13px; color: #1e3a8a; margin: 0; line-height: 1.6;">
        ระบบจะจัดส่ง <strong>บัตรเข้างาน (QR Code สำหรับ Onsite)</strong> หรือ <strong>ลิงก์ห้องประชุม (สำหรับ Online)</strong> ให้ท่านทางอีเมลนี้อีกครั้ง ก่อนถึงกำหนดวันเริ่มงานประชุม
      </p>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
      หากมีข้อสงสัยหรือต้องการสอบถามข้อมูลเพิ่มเติม สามารถติดต่อสมาคมฯ ได้ทางอีเมลนี้
    </p>
  `;

  return renderBaseEmailLayout({
    title: `ยืนยันการลงทะเบียน ${options.meetingName} - โดย ${options.companyName}`,
    preheader: `ยืนยันการลงทะเบียน ${options.recipientName} สนับสนุนโดย ${options.companyName}`,
    contentHtml: content,
  });
}

