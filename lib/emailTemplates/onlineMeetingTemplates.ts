import { renderBaseEmailLayout } from './baseLayout';

// อีเมลสำหรับผู้เข้าร่วมแบบออนไลน์: เตือนก่อนวันงาน 1 วัน (ไม่มีลิงก์) และส่งลิงก์จริงในวันงาน

export interface OnlineMeetingEmailOptions {
  recipientName: string;
  meetingName: string;
  dateLabel: string; // วันที่แบบไทย เช่น 21 ตุลาคม 2569
  timeLabel?: string; // เวลาเริ่ม เช่น 08:30 - 16:30 น.
  programNames?: string[];
}

export interface OnlineLinkEmailOptions extends OnlineMeetingEmailOptions {
  meetingLink: string;
}

function esc(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function detailsTable(o: OnlineMeetingEmailOptions): string {
  const rows: Array<[string, string]> = [
    ['ชื่องาน', esc(o.meetingName)],
    ['วันที่', esc(o.dateLabel)],
  ];
  if (o.timeLabel) rows.push(['เวลา', esc(o.timeLabel)]);
  if (o.programNames && o.programNames.length > 0) rows.push(['รายการ', o.programNames.map(esc).join('<br>')]);
  rows.push(['รูปแบบการเข้าร่วม', 'ออนไลน์']);

  return `
    <div class="info-card">
      <div style="font-size: 13px; font-weight: 800; color: #0369a1; margin-bottom: 10px;">รายละเอียดการประชุม</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${rows
          .map(
            ([label, value], i) => `
          <tr${i < rows.length - 1 ? ' style="border-bottom: 1px dashed #e2e8f0;"' : ''}>
            <td class="kv-label" style="padding: 8px 0; color: #64748b; font-size: 14px; vertical-align: top;">${label}</td>
            <td class="kv-value" style="padding: 8px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">${value}</td>
          </tr>`
          )
          .join('')}
      </table>
    </div>`;
}

export function renderOnlineReminderEmail(o: OnlineMeetingEmailOptions): string {
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: #fef3c7; color: #92400e; font-weight: 800; font-size: 13px;">
        ⏰ แจ้งเตือนการประชุมออนไลน์พรุ่งนี้
      </span>
      <h2 style="color: #0f172a; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800;">${esc(o.meetingName)}</h2>
      <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
        เรียน คุณ <strong>${esc(o.recipientName)}</strong><br>
        ขอแจ้งเตือนว่าการประชุมที่ท่านลงทะเบียนแบบออนไลน์ไว้จะจัดขึ้นใน<strong>วันพรุ่งนี้</strong>
      </p>
    </div>

    ${detailsTable(o)}

    <div class="m-pad" style="background-color: #f0f9ff; border: 2px solid #bae6fd; border-radius: 16px; padding: 20px; margin: 24px 0; text-align: center;">
      <div style="font-size: 15px; font-weight: 800; color: #0369a1; margin-bottom: 8px;">📩 ลิงก์เข้าห้องประชุม</div>
      <p style="font-size: 14px; color: #0f172a; margin: 0; line-height: 1.6;">
        ระบบจะส่งลิงก์เข้าห้องประชุมเฉพาะของท่านมาที่อีเมลนี้<br>
        <strong>ในวันงาน ก่อนเริ่มการประชุมประมาณ 1 ชั่วโมง</strong>
      </p>
    </div>

    <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 0 8px 8px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 6px;">📌 การเตรียมตัว</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.7;">
        <li>ติดตั้งโปรแกรมหรือแอปพลิเคชันสำหรับเข้าร่วมประชุม และตรวจสอบกล้อง ไมโครโฟน และอินเทอร์เน็ตล่วงหน้า</li>
        <li>หากไม่พบอีเมลส่งลิงก์ในวันงาน กรุณาตรวจสอบกล่องจดหมายขยะหรือจดหมายที่ไม่พึงประสงค์</li>
        <li>ลิงก์ที่ได้รับเป็นลิงก์เฉพาะบุคคล ใช้เข้าร่วมได้ครั้งละ 1 อุปกรณ์ และไม่สามารถส่งต่อให้ผู้อื่นได้</li>
      </ul>
    </div>
  `;

  return renderBaseEmailLayout({
    title: `แจ้งเตือนการประชุมออนไลน์ ${o.meetingName}`,
    preheader: `การประชุม ${o.meetingName} จะจัดขึ้นวันพรุ่งนี้ ลิงก์เข้าห้องประชุมจะส่งให้ก่อนเริ่ม 1 ชั่วโมง`,
    contentHtml: content,
  });
}

export function renderOnlineLinkEmail(o: OnlineLinkEmailOptions): string {
  const link = esc(o.meetingLink);
  const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="display: inline-block; padding: 6px 16px; border-radius: 9999px; background-color: #dcfce7; color: #166534; font-weight: 800; font-size: 13px;">
        🎥 ลิงก์เข้าห้องประชุมออนไลน์ของท่าน
      </span>
      <h2 style="color: #0f172a; margin: 14px 0 6px 0; font-size: 22px; font-weight: 800;">${esc(o.meetingName)}</h2>
      <p style="color: #475569; font-size: 14px; margin: 0; line-height: 1.6;">
        เรียน คุณ <strong>${esc(o.recipientName)}</strong><br>
        การประชุมจะเริ่มในอีกไม่นาน กรุณาใช้ลิงก์ด้านล่างเพื่อเข้าห้องประชุม
      </p>
    </div>

    <div class="m-pad" style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #075985 100%); border-radius: 16px; padding: 26px 20px; text-align: center; margin: 20px 0;">
      <div style="font-size: 14px; color: #e0f2fe; margin-bottom: 14px;">${esc(o.dateLabel)}${o.timeLabel ? ` · ${esc(o.timeLabel)}` : ''}</div>
      <a href="${link}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #0369a1; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 900; font-size: 16px;">
        คลิกเพื่อเข้าห้องประชุม
      </a>
      <div style="font-size: 12px; color: #bae6fd; margin-top: 16px;">หากกดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปเปิดในเบราว์เซอร์</div>
      <div style="font-size: 12px; color: #ffffff; margin-top: 6px; word-break: break-all; font-family: monospace;">${link}</div>
    </div>

    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 14px 18px; margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 800; color: #b91c1c; margin-bottom: 4px;">🔒 ลิงก์นี้เป็นลิงก์เฉพาะของท่าน</div>
      <p style="font-size: 13px; color: #7f1d1d; margin: 0; line-height: 1.6;">
        ใช้เข้าร่วมได้ครั้งละ 1 อุปกรณ์ หากลิงก์กำลังถูกใช้งานอยู่ ผู้อื่นจะไม่สามารถเข้าได้ กรุณาอย่าส่งต่อลิงก์นี้ให้ผู้อื่น
      </p>
    </div>

    ${detailsTable(o)}

    <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 18px;">
      <div style="font-size: 13px; font-weight: 700; color: #0369a1; margin-bottom: 6px;">📌 คำแนะนำ</div>
      <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #334155; line-height: 1.7;">
        <li>กรุณาเข้าห้องประชุมก่อนเวลาเริ่มอย่างน้อย 10-15 นาที</li>
        <li>ตั้งชื่อที่แสดงในห้องประชุมให้ตรงกับ <strong>${esc(o.recipientName)}</strong> เพื่อให้เจ้าหน้าที่ตรวจสอบการเข้าร่วม</li>
        <li>ปิดไมโครโฟนระหว่างการบรรยาย และส่งคำถามผ่านช่องแชทได้ตลอดการประชุม</li>
      </ul>
    </div>
  `;

  return renderBaseEmailLayout({
    title: `ลิงก์เข้าห้องประชุมออนไลน์ ${o.meetingName}`,
    preheader: `ลิงก์เข้าห้องประชุมเฉพาะของคุณ ${o.recipientName} สำหรับ ${o.meetingName}`,
    contentHtml: content,
  });
}
