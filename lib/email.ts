import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import { writeEmailLog, serializeAttachments, getEmailLog, markEmailLogResent } from './services/emailLog';
import {
  renderOnlineReminderEmail,
  renderOnlineLinkEmail,
  OnlineMeetingEmailOptions,
  OnlineLinkEmailOptions,
} from './emailTemplates/onlineMeetingTemplates';
import {
  renderMembershipApprovedEmail,
  renderMeetingApprovedEmail,
  renderCompanyGroupMembershipApprovedEmail,
  renderAttendeeSponsoredRegistrationEmail,
  MembershipApprovalEmailOptions,
  MeetingApprovalEmailOptions,
  CompanyGroupMembershipApprovalEmailOptions,
  AttendeeSponsoredRegistrationEmailOptions,
  MeetingApprovalItem,
} from './emailTemplates/approvalTemplate';
import {
  renderSlipRejectionEmail,
  SlipRejectionEmailOptions,
} from './emailTemplates/rejectionTemplate';
import {
  renderAttendeeTicketEmail,
  AttendeeTicketEmailOptions,
} from './emailTemplates/attendeeQrTemplate';
import {
  renderAttendeeOnlineEmail,
  AttendeeOnlineEmailOptions,
} from './emailTemplates/attendeeOnlineTemplate';
import {
  renderCustomBroadcastEmail,
  CustomBroadcastEmailOptions,
} from './emailTemplates/customTemplate';
import {
  renderSponsorOtpEmail,
  SponsorOtpEmailOptions,
} from './emailTemplates/sponsorOtpTemplate';
import {
  renderMemberOtpEmail,
  MemberOtpEmailOptions,
} from './emailTemplates/memberOtpTemplate';

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

const globalForMail = globalThis as unknown as {
  cachedTransporter?: nodemailer.Transporter | null;
  cachedTransporterKey?: string;
};

/**
 * Get configured Nodemailer Transporter
 */
export function getMailTransporter(customConfig?: SmtpConfig) {
  const host = customConfig?.host || process.env.SMTP_HOST;
  const port = customConfig?.port || (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587);
  const secure = customConfig?.secure !== undefined ? customConfig.secure : (process.env.SMTP_SECURE === 'true' || port === 465);
  const user = customConfig?.user || process.env.SMTP_USER;
  const pass = customConfig?.pass || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null; // Return null if SMTP is not fully configured to trigger fallback log mode
  }

  // If customConfig is provided, create a dedicated instance
  if (customConfig) {
    return nodemailer.createTransport({
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 8000,
    });
  }

  const key = `${host}:${port}:${user}:${secure}`;
  if (globalForMail.cachedTransporter && globalForMail.cachedTransporterKey === key) {
    return globalForMail.cachedTransporter;
  }

  const transporter = nodemailer.createTransport({
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    },
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000,
  });

  globalForMail.cachedTransporter = transporter;
  globalForMail.cachedTransporterKey = key;
  return transporter;
}

export function getDefaultFromAddress(): string {
  const fromEnv = process.env.SMTP_FROM;
  const userEnv = process.env.SMTP_USER || 'tsrm.support2026@gmail.com';
  if (!fromEnv) {
    return `สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM) <${userEnv}>`;
  }
  if (!fromEnv.includes('<') && !fromEnv.includes('@')) {
    return `${fromEnv.replace(/"/g, '')} <${userEnv}>`;
  }
  return fromEnv;
}

/**
 * Generate a QR Code base64 Data URL
 */
export async function generateQrCodeDataUrl(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#0026b3',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code Data URL:', err);
    return '';
  }
}

/**
 * Generate a QR Code Buffer for inline CID email attachment
 */
export async function generateQrCodeBuffer(data: string): Promise<Buffer | null> {
  try {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
      color: {
        dark: '#0026b3',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code Buffer:', err);
    return null;
  }
}

/**
 * Replace dynamic placeholders in subject and content
 */
export function substitutePlaceholders(text: string, values: Record<string, string | number | undefined | null>): string {
  let result = text;
  for (const [key, val] of Object.entries(values)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, val !== undefined && val !== null ? String(val) : '');
  }
  return result;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  fallback?: boolean;
  error?: string;
}

/**
 * Utility to strip HTML tags and generate clean plain text representation
 * Prevents MIME_HTML_ONLY anti-spam penalty
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/tr>|<\/p>|<\/div>|<br\s*\/?>/gi, '\n')
    .replace(/<\/td>/gi, '  ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// ข้อผิดพลาดชั่วคราว (การเชื่อมต่อหลุด/หมดเวลา/เซิร์ฟเวอร์ขอให้ลองใหม่) — ส่งซ้ำได้โดยเปิดการเชื่อมต่อใหม่
function isTransientSmtpError(error: any): boolean {
  const code = String(error?.code || '');
  if (['ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'ECONNRESET', 'EPIPE', 'EDNS'].includes(code)) return true;
  const responseCode = Number(error?.responseCode);
  if (responseCode >= 400 && responseCode < 500) return true;
  return /timeout|closed|reset|socket/i.test(String(error?.message || ''));
}

function resetCachedTransporter() {
  try {
    globalForMail.cachedTransporter?.close();
  } catch {
    // ignore
  }
  globalForMail.cachedTransporter = null;
  globalForMail.cachedTransporterKey = undefined;
}

const MAX_SEND_ATTEMPTS = 3;

/**
 * Core Generic Mail Dispatcher
 */
async function dispatchEmail({
  to,
  subject,
  html,
  text,
  attachments,
  customConfig,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: any[];
  customConfig?: SmtpConfig;
}): Promise<EmailSendResult> {
  const from = customConfig?.from || getDefaultFromAddress();

  if (!getMailTransporter(customConfig)) {
    console.warn('📧 [EMAIL FALLBACK / TEST MODE] SMTP not configured — email NOT sent:', {
      to,
      subject,
      timestamp: new Date().toISOString(),
    });
    await writeEmailLog({ to, subject, status: 'fallback', error: 'ยังไม่ได้ตั้งค่า SMTP', attempts: 0, at: new Date().toISOString() });

    return {
      success: true,
      fallback: true,
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  const replyTo = process.env.SMTP_REPLY_TO || process.env.SMTP_USER || 'tsrm.support2026@gmail.com';
  const plainTextContent = text || htmlToPlainText(html) || subject;
  let lastError: any = null;
  let attempts = 0;

  for (attempts = 1; attempts <= MAX_SEND_ATTEMPTS; attempts++) {
    const transporter = getMailTransporter(customConfig);
    if (!transporter) break;
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo,
        subject,
        html,
        text: plainTextContent,
        attachments,
        headers: {
          'X-Mailer': 'TSRM Notification System',
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
        },
      });
      if (customConfig) transporter.close();

      console.log('📧 [EMAIL DELIVERED] Successfully sent to:', to, 'ID:', info.messageId, attempts > 1 ? `(attempt ${attempts})` : '');
      await writeEmailLog({ to, subject, status: 'sent', messageId: info.messageId, attempts, at: new Date().toISOString() });
      return {
        success: true,
        messageId: info.messageId,
        fallback: false,
      };
    } catch (error: any) {
      lastError = error;
      if (customConfig) transporter.close();
      console.error(`❌ [EMAIL SEND ERROR] Failed to send email to: ${to} (attempt ${attempts}/${MAX_SEND_ATTEMPTS})`, error?.code, error?.responseCode, error?.message);
      if (!isTransientSmtpError(error) || attempts >= MAX_SEND_ATTEMPTS) break;
      // การเชื่อมต่อใน pool อาจค้างจากการที่ serverless ถูกพักไว้ — ทิ้งแล้วเปิดใหม่ก่อนลองอีกครั้ง
      if (!customConfig) resetCachedTransporter();
      await new Promise((r) => setTimeout(r, 1000 * attempts));
    }
  }

  const errorMessage = lastError?.message || 'SMTP Transmission failed';
  await writeEmailLog({
    to,
    subject,
    status: 'failed',
    error: errorMessage,
    attempts: Math.min(attempts, MAX_SEND_ATTEMPTS),
    at: new Date().toISOString(),
    payload: { html, text: plainTextContent, attachments: serializeAttachments(attachments) },
  });
  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * ส่งอีเมลที่เคยส่งไม่สำเร็จซ้ำจากเนื้อหาที่บันทึกไว้
 */
export async function resendLoggedEmail(logId: string): Promise<EmailSendResult> {
  const entry = await getEmailLog(logId);
  if (!entry) return { success: false, error: 'ไม่พบประวัติอีเมลนี้' };
  if (entry.resentAt) return { success: false, error: 'อีเมลนี้ส่งซ้ำสำเร็จไปแล้ว' };
  if (!entry.payload?.html) return { success: false, error: 'ไม่มีเนื้อหาอีเมลสำหรับส่งซ้ำ' };

  const result = await dispatchEmail({
    to: entry.to,
    subject: entry.subject,
    html: entry.payload.html,
    text: entry.payload.text,
    attachments: entry.payload.attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
      encoding: 'base64',
      cid: a.cid,
      contentType: a.contentType,
      contentDisposition: a.cid ? 'inline' : undefined,
    })),
  });

  if (result.success && !result.fallback) {
    await markEmailLogResent(logId, null);
  }
  return result;
}

/* ──────────────────────────────────────────────────────────────────────────
   TRANSACTIONAL EMAIL HANDLERS
   ────────────────────────────────────────────────────────────────────────── */

export interface SendMembershipApprovedParams {
  to: string;
  recipientName: string;
  memberNo: string;
  amountPaid: number;
  qrCodeData?: string;
  qrCodeImageUrl?: string;
}

/**
 * Send email when membership application slip is approved
 */
export async function sendMembershipApprovedEmail(params: SendMembershipApprovedParams): Promise<EmailSendResult> {
  const qrPayload = params.qrCodeData || `TSRM-MEMBER:${params.memberNo}`;
  const qrBuffer = await generateQrCodeBuffer(qrPayload);
  const cid = `member-qr-${params.memberNo}`;
  
  // Public HTTPS QR Code URL ensures universal display across all mobile email clients (Gmail iOS/Android, Apple Mail, Outlook)
  const httpsQrUrl = params.qrCodeImageUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}&color=0026b3`;
  const qrCodeUrl = httpsQrUrl;

  const html = renderMembershipApprovedEmail({
    recipientName: params.recipientName,
    memberNo: params.memberNo,
    amountPaid: params.amountPaid,
    qrCodeUrl,
  });

  return dispatchEmail({
    to: params.to,
    subject: `ยินดีต้อนรับสมาชิกใหม่ - รหัสสมาชิกของคุณคือ ${params.memberNo}`,
    html,
    attachments: qrBuffer ? [{
      filename: `member-qr-${params.memberNo}.png`,
      content: qrBuffer,
      cid,
      contentType: 'image/png',
      contentDisposition: 'inline',
      headers: {
        'Content-ID': `<${cid}>`,
        'X-Attachment-Id': cid,
      },
    }] : undefined,
  });
}

export interface SendCompanyGroupApprovalParams {
  to: string;
  companyName: string;
  coordinatorName?: string;
  ticketCode: string;
  amountPaid: number;
  isPayLater: boolean;
  applicants: Array<{
    name: string;
    email: string;
    memberNo: string;
  }>;
}

/**
 * Send email to company / coordinator when group membership application is approved
 */
export async function sendCompanyGroupMembershipApprovedEmail(params: SendCompanyGroupApprovalParams): Promise<EmailSendResult> {
  const html = renderCompanyGroupMembershipApprovedEmail({
    companyName: params.companyName,
    coordinatorName: params.coordinatorName || params.companyName,
    ticketCode: params.ticketCode,
    amountPaid: params.amountPaid,
    isPayLater: params.isPayLater,
    applicants: params.applicants,
  });

  return dispatchEmail({
    to: params.to,
    subject: `แจ้งผลการอนุมัติสมาชิกแบบกลุ่ม - ${params.companyName} (${params.applicants.length} ท่าน)`,
    html,
  });
}

export interface SendRegistrationApprovedParams {
  to: string;
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
  qrCodeData?: string;
  selectedActivities?: any;
  items?: MeetingApprovalItem[];
}

/**
 * Send email when meeting registration payment slip is approved or free registration completed
 */
export async function sendRegistrationApprovedEmail(params: SendRegistrationApprovedParams): Promise<EmailSendResult> {
  const html = renderMeetingApprovedEmail({
    recipientName: params.recipientName,
    meetingName: params.meetingName,
    meetingDate: params.meetingDate,
    ticketCode: params.ticketCode,
    amountPaid: params.amountPaid,
    isMember: params.isMember,
    nameEn: params.nameEn,
    memberNo: params.memberNo,
    position: params.position,
    workplace: params.workplace,
    email: params.email || params.to,
    phone: params.phone,
    attendanceType: params.attendanceType,
    sponsorCompanyName: params.sponsorCompanyName,
    isCouponSponsored: params.isCouponSponsored,
    couponCode: params.couponCode,
    isFreeRegistration: params.isFreeRegistration,
    selectedActivities: params.selectedActivities,
    items: params.items,
  });

  return dispatchEmail({
    to: params.to,
    subject: `ยืนยันการลงทะเบียนเข้าร่วมประชุม ${params.meetingName}`,
    html,
  });
}

export interface SendAttendeeSponsoredRegistrationParams {
  to: string;
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

/**
 * Send email to individual attendee whose registration was sponsored and registered by a corporate/sponsor
 */
export async function sendAttendeeSponsoredRegistrationEmail(params: SendAttendeeSponsoredRegistrationParams): Promise<EmailSendResult> {
  const html = renderAttendeeSponsoredRegistrationEmail({
    recipientName: params.recipientName,
    recipientEmail: params.recipientEmail || params.to,
    memberNo: params.memberNo,
    workplace: params.workplace,
    companyName: params.companyName,
    meetingName: params.meetingName,
    meetingDate: params.meetingDate,
    ticketCode: params.ticketCode,
    items: params.items,
    format: params.format,
  });

  return dispatchEmail({
    to: params.to,
    subject: `ยืนยันการลงทะเบียนเข้าร่วมประชุม ${params.meetingName} - ได้รับการสนับสนุนโดย ${params.companyName}`,
    html,
  });
}

export interface SendSlipRejectionParams {
  to: string;
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

/**
 * Send email when payment slip is rejected with a direct resubmit link
 */
export async function sendSlipRejectionEmail(params: SendSlipRejectionParams): Promise<EmailSendResult> {
  const isInfoMode = params.rejectType === 'info' || (params.rejectionReason?.includes('ข้อมูล') && !params.rejectionReason?.includes('สลิป'));
  const html = renderSlipRejectionEmail({
    recipientName: params.recipientName,
    meetingName: params.meetingName,
    rejectionReason: params.rejectionReason,
    resubmitUrl: params.resubmitUrl,
    ticketCode: params.ticketCode,
    amount: params.amount,
    applicantEmail: params.applicantEmail,
    applicantPhone: params.applicantPhone,
    applicantWorkplace: params.applicantWorkplace,
    isCorporate: params.isCorporate,
    companyName: params.companyName,
    rejectType: params.rejectType,
  });

  const subjectPrefix = isInfoMode ? 'แจ้งผลการตรวจสอบข้อมูล' : 'แจ้งผลการตรวจสอบสลิปการโอนเงิน';
  const refSuffix = params.ticketCode ? ` - ${params.ticketCode}` : '';

  return dispatchEmail({
    to: params.to,
    subject: `${subjectPrefix} รายการ ${params.meetingName}${refSuffix}`,
    html,
  });
}

export interface SendAttendeeTicketParams {
  to: string;
  recipientName: string;
  meetingName: string;
  meetingDate?: string;
  location?: string;
  ticketCode: string;
  memberNo?: string;
  attendanceStatus?: string;
  extraNote?: string;
  qrCodeData?: string;
  dailyProgram?: string;
  customConfig?: SmtpConfig;
}

/**
 * Send Attendee E-Ticket with QR Code to meeting participants
 */
export async function sendAttendeeTicketEmail(params: SendAttendeeTicketParams): Promise<EmailSendResult> {
  const qrPayload = params.qrCodeData || `TSRM-PASS:${params.ticketCode}`;
  const qrBuffer = await generateQrCodeBuffer(qrPayload);
  const cid = `pass-qr-${params.ticketCode}`;
  
  // Public HTTPS QR Code URL ensures universal display across all mobile email clients (Gmail iOS/Android, Apple Mail, Outlook)
  const httpsQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrPayload)}&color=0026b3`;
  const qrCodeUrl = httpsQrUrl;

  const html = renderAttendeeTicketEmail({
    recipientName: params.recipientName,
    meetingName: params.meetingName,
    meetingDate: params.meetingDate,
    location: params.location,
    ticketCode: params.ticketCode,
    memberNo: params.memberNo,
    attendanceStatus: params.attendanceStatus,
    qrCodeUrl,
    extraNote: params.extraNote,
  });

  const programText = params.dailyProgram ? ` ${params.dailyProgram}` : '';
  return dispatchEmail({
    to: params.to,
    subject: `บัตรเข้างาน${programText} ${params.meetingName} - คุณ ${params.recipientName}`,
    html,
    attachments: qrBuffer ? [{
      filename: `pass-qr-${params.ticketCode}.png`,
      content: qrBuffer,
      cid,
      contentType: 'image/png',
      contentDisposition: 'inline',
      headers: {
        'Content-ID': `<${cid}>`,
        'X-Attachment-Id': cid,
      },
    }] : undefined,
    customConfig: params.customConfig,
  });
}

export interface SendAttendeeOnlineParams {
  to: string;
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
  customConfig?: SmtpConfig;
}

/**
 * Send Online Access Confirmation (No QR code) to online meeting participants
 */
export async function sendAttendeeOnlineEmail(params: SendAttendeeOnlineParams): Promise<EmailSendResult> {
  const html = renderAttendeeOnlineEmail({
    recipientName: params.recipientName,
    meetingName: params.meetingName,
    meetingDate: params.meetingDate,
    ticketCode: params.ticketCode,
    memberNo: params.memberNo,
    attendanceStatus: params.attendanceStatus,
    zoomUrl: params.zoomUrl,
    meetingIdCredentials: params.meetingIdCredentials,
    passcode: params.passcode,
    onlineInstructions: params.onlineInstructions,
    extraNote: params.extraNote,
  });

  return dispatchEmail({
    to: params.to,
    subject: `ยืนยันสิทธิ์เข้าร่วมประชุมออนไลน์ ${params.meetingName} - คุณ ${params.recipientName}`,
    html,
    customConfig: params.customConfig,
  });
}

/**
 * อีเมลเตือนผู้เข้าร่วมออนไลน์ก่อนวันงาน 1 วัน (ยังไม่มีลิงก์)
 */
export async function sendOnlineReminderEmail(
  params: OnlineMeetingEmailOptions & { to: string; customConfig?: SmtpConfig }
): Promise<EmailSendResult> {
  return dispatchEmail({
    to: params.to,
    subject: `แจ้งเตือนการประชุมออนไลน์พรุ่งนี้ ${params.meetingName}`,
    html: renderOnlineReminderEmail(params),
    customConfig: params.customConfig,
  });
}

/**
 * อีเมลส่งลิงก์เข้าห้องประชุมเฉพาะบุคคลในวันงาน
 */
export async function sendOnlineLinkEmail(
  params: OnlineLinkEmailOptions & { to: string; customConfig?: SmtpConfig }
): Promise<EmailSendResult> {
  return dispatchEmail({
    to: params.to,
    subject: `ลิงก์เข้าห้องประชุมออนไลน์ ${params.meetingName} - คุณ ${params.recipientName}`,
    html: renderOnlineLinkEmail(params),
    customConfig: params.customConfig,
  });
}

export interface SendCustomBroadcastParams {
  to: string;
  subject: string;
  recipientName?: string;
  rawHtmlContent: string;
  placeholders?: Record<string, string | number | undefined | null>;
  customConfig?: SmtpConfig;
}

/**
 * Send custom or broadcast email with placeholder replacement
 */
export async function sendCustomBroadcastEmail(params: SendCustomBroadcastParams): Promise<EmailSendResult> {
  let subject = params.subject;
  let content = params.rawHtmlContent;

  if (params.placeholders) {
    subject = substitutePlaceholders(subject, params.placeholders);
    content = substitutePlaceholders(content, params.placeholders);
  }

  const html = renderCustomBroadcastEmail({
    subject,
    recipientName: params.recipientName,
    rawHtmlContent: content,
  });

  return dispatchEmail({
    to: params.to,
    subject,
    html,
    customConfig: params.customConfig,
  });
}

/**
 * Test SMTP Server Connection
 */
export async function testSmtpConnection(config?: SmtpConfig): Promise<{ success: boolean; message: string; error?: string }> {
  const transporter = getMailTransporter(config);
  if (!transporter) {
    return {
      success: true,
      message: 'อยู่ในโหมด Fallback / Simulation Mode (ยังไม่ได้ตั้งค่า SMTP Host/User/Pass ในระบบ)',
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      message: 'เชื่อมต่อกับเซิร์ฟเวอร์ SMTP สำเร็จ พร้อมใช้งานส่งอีเมลจริง',
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ SMTP ได้',
      error: err?.message || 'Verification failed',
    };
  }
}

/**
 * Send OTP Email to Corporate Sponsor Representative
 */
export async function sendSponsorOtpEmail(
  to: string,
  options: SponsorOtpEmailOptions,
  customConfig?: SmtpConfig
) {
  const isMembership = options.systemType === 'membership';
  const subject = isMembership
    ? `รหัสผ่านชั่วคราวสำหรับเข้าสู่ระบบสมัครสมาชิกบริษัท: ${options.otpCode}`
    : `รหัสผ่านชั่วคราวสำหรับเข้าสู่ระบบลงทะเบียนบริษัท: ${options.otpCode}`;
  const html = renderSponsorOtpEmail(options);

  return dispatchEmail({
    to,
    subject,
    html,
    customConfig,
  });
}

/**
 * Send OTP Email to Individual Member for Profile Update
 */
export async function sendMemberOtpEmail(
  to: string,
  options: MemberOtpEmailOptions,
  customConfig?: SmtpConfig
) {
  const subject = `รหัสผ่านชั่วคราวสำหรับตรวจสอบและแก้ไขข้อมูลสมาชิก: ${options.otpCode}`;
  const html = renderMemberOtpEmail(options);

  return dispatchEmail({
    to,
    subject,
    html,
    customConfig,
  });
}


