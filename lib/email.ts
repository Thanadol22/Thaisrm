import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import {
  renderMembershipApprovedEmail,
  renderMeetingApprovedEmail,
  MembershipApprovalEmailOptions,
  MeetingApprovalEmailOptions,
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

export interface SmtpConfig {
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  from?: string;
}

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

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export function getDefaultFromAddress(): string {
  return process.env.SMTP_FROM || 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (TSRM) <tsrm.info@gmail.com>';
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
 * Core Generic Mail Dispatcher
 */
async function dispatchEmail({
  to,
  subject,
  html,
  text,
  customConfig,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  customConfig?: SmtpConfig;
}): Promise<EmailSendResult> {
  const transporter = getMailTransporter(customConfig);
  const from = customConfig?.from || getDefaultFromAddress();

  if (!transporter) {
    console.log('📧 [EMAIL FALLBACK / TEST MODE] Outgoing Email:', {
      to,
      subject,
      timestamp: new Date().toISOString(),
      previewSnippet: html.substring(0, 150) + '...',
    });

    return {
      success: true,
      fallback: true,
      messageId: `mock-msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
  }

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || subject,
    });

    console.log('📧 [EMAIL DELIVERED] Successfully sent to:', to, 'ID:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      fallback: false,
    };
  } catch (error: any) {
    console.error('❌ [EMAIL SEND ERROR] Failed to send email to:', to, error);
    return {
      success: false,
      error: error?.message || 'SMTP Transmission failed',
    };
  }
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
}

/**
 * Send email when membership application slip is approved
 */
export async function sendMembershipApprovedEmail(params: SendMembershipApprovedParams): Promise<EmailSendResult> {
  let qrCodeUrl = '';
  if (params.qrCodeData || params.memberNo) {
    qrCodeUrl = await generateQrCodeDataUrl(params.qrCodeData || `TSRM-MEMBER:${params.memberNo}`);
  }

  const html = renderMembershipApprovedEmail({
    recipientName: params.recipientName,
    memberNo: params.memberNo,
    amountPaid: params.amountPaid,
    qrCodeUrl,
  });

  return dispatchEmail({
    to: params.to,
    subject: `ยินดีต้อนรับสมาชิกใหม่ - รหัสสมาชิกของคุณคือ ${params.memberNo} (TSRM)`,
    html,
  });
}

export interface SendRegistrationApprovedParams {
  to: string;
  recipientName: string;
  meetingName: string;
  meetingDate?: string;
  ticketCode: string;
  amountPaid: number;
  isMember: boolean;
  qrCodeData?: string;
}

/**
 * Send email when meeting registration payment slip is approved
 */
export async function sendRegistrationApprovedEmail(params: SendRegistrationApprovedParams): Promise<EmailSendResult> {
  let qrCodeUrl = '';
  if (params.qrCodeData || params.ticketCode) {
    qrCodeUrl = await generateQrCodeDataUrl(params.qrCodeData || `TSRM-TICKET:${params.ticketCode}`);
  }

  const html = renderMeetingApprovedEmail({
    recipientName: params.recipientName,
    meetingName: params.meetingName,
    meetingDate: params.meetingDate,
    ticketCode: params.ticketCode,
    amountPaid: params.amountPaid,
    isMember: params.isMember,
    qrCodeUrl,
  });

  return dispatchEmail({
    to: params.to,
    subject: `ยืนยันการลงทะเบียน ${params.meetingName} (รหัสบัตร ${params.ticketCode}) - TSRM`,
    html,
  });
}

export interface SendSlipRejectionParams {
  to: string;
  recipientName: string;
  meetingName: string;
  rejectionReason: string;
  resubmitUrl: string;
}

/**
 * Send email when payment slip is rejected with a direct resubmit link
 */
export async function sendSlipRejectionEmail(params: SendSlipRejectionParams): Promise<EmailSendResult> {
  const html = renderSlipRejectionEmail({
    recipientName: params.recipientName,
    meetingName: params.meetingName,
    rejectionReason: params.rejectionReason,
    resubmitUrl: params.resubmitUrl,
  });

  return dispatchEmail({
    to: params.to,
    subject: `[โปรดตรวจสอบ] แจ้งผลการตรวจสอบหลักฐานการชำระเงิน - ${params.meetingName}`,
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
  const qrCodeUrl = await generateQrCodeDataUrl(qrPayload);

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

  const subjectPrefix = params.dailyProgram ? `🎟️ [${params.dailyProgram}] ` : `🎟️ `;
  return dispatchEmail({
    to: params.to,
    subject: `${subjectPrefix}บัตรเข้างาน (E-Ticket) ${params.meetingName} - คุณ ${params.recipientName}`,
    html,
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
    subject: `🌐 ยืนยันสิทธิ์เข้าร่วมประชุมออนไลน์ (Online Pass) ${params.meetingName} - คุณ ${params.recipientName}`,
    html,
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
