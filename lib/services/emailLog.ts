import prisma from '@/lib/prisma';

// บันทึกประวัติการส่งอีเมลทุกฉบับ (ไม่แตะโครงสร้างตาราง — เก็บใน system_settings แถวละ 1 ฉบับ)
// key: email_log:<เวลา ms 13 หลัก>:<สุ่ม> → เรียงตาม key ได้ตามเวลา และไม่ชนกันเมื่อส่งพร้อมกัน
// ฉบับที่ส่งไม่สำเร็จจะเก็บเนื้อหาไว้ด้วยเพื่อให้กดส่งซ้ำได้

export const EMAIL_LOG_PREFIX = 'email_log:';
const RETENTION_DAYS = 90;

export type EmailLogStatus = 'sent' | 'failed' | 'fallback';

export interface EmailLogPayload {
  html: string;
  text?: string;
  attachments?: Array<{
    filename?: string;
    content: string; // base64
    cid?: string;
    contentType?: string;
  }>;
}

export interface EmailLogEntry {
  to: string;
  subject: string;
  status: EmailLogStatus;
  error?: string;
  messageId?: string;
  attempts: number;
  at: string;
  resentAt?: string;
  resentBy?: string; // key ของ log ฉบับที่ส่งซ้ำสำเร็จ
  payload?: EmailLogPayload;
}

export interface EmailLogRow extends Omit<EmailLogEntry, 'payload'> {
  id: string;
  canResend: boolean;
}

function newKey(): string {
  return `${EMAIL_LOG_PREFIX}${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function serializeAttachments(attachments?: any[]): EmailLogPayload['attachments'] {
  if (!Array.isArray(attachments) || attachments.length === 0) return undefined;
  return attachments
    .filter((a) => a && a.content)
    .map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content) ? a.content.toString('base64') : Buffer.from(String(a.content)).toString('base64'),
      cid: a.cid,
      contentType: a.contentType,
    }));
}

export async function writeEmailLog(entry: EmailLogEntry): Promise<string | null> {
  const key = newKey();
  try {
    await prisma.system_settings.create({
      data: { key, value: JSON.stringify(entry), description: `email ${entry.status}` },
    });
  } catch (err) {
    console.error('❌ [EMAIL LOG] Failed to write email log:', err);
    return null;
  }

  // ล้าง log เก่าเป็นครั้งคราว ไม่ให้ตารางโตไม่สิ้นสุด
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    prisma.system_settings
      .deleteMany({ where: { key: { startsWith: EMAIL_LOG_PREFIX }, updated_at: { lt: cutoff } } })
      .catch((err) => console.warn('[EMAIL LOG] prune failed:', err));
  }
  return key;
}

function parseEntry(value: string): EmailLogEntry | null {
  try {
    return JSON.parse(value) as EmailLogEntry;
  } catch {
    return null;
  }
}

export async function getEmailLog(id: string): Promise<EmailLogEntry | null> {
  if (!id.startsWith(EMAIL_LOG_PREFIX)) return null;
  const row = await prisma.system_settings.findUnique({ where: { key: id } });
  return row ? parseEntry(row.value) : null;
}

export async function markEmailLogResent(id: string, resentBy: string | null): Promise<void> {
  const entry = await getEmailLog(id);
  if (!entry) return;
  entry.resentAt = new Date().toISOString();
  if (resentBy) entry.resentBy = resentBy;
  delete entry.payload; // ส่งซ้ำสำเร็จแล้ว ไม่ต้องเก็บเนื้อหาต่อ
  await prisma.system_settings.update({ where: { key: id }, data: { value: JSON.stringify(entry) } });
}

export async function listEmailLogs(opts: {
  status?: EmailLogStatus | 'all';
  query?: string;
  days?: number;
}): Promise<{ rows: EmailLogRow[]; summary: Record<EmailLogStatus, number> & { unresolvedFailed: number } }> {
  const days = opts.days && opts.days > 0 ? opts.days : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const raw = await prisma.system_settings.findMany({
    where: { key: { startsWith: EMAIL_LOG_PREFIX }, updated_at: { gte: since } },
    orderBy: { key: 'desc' },
  });

  const q = opts.query?.trim().toLowerCase();
  const summary = { sent: 0, failed: 0, fallback: 0, unresolvedFailed: 0 };
  const rows: EmailLogRow[] = [];

  for (const r of raw) {
    const entry = parseEntry(r.value);
    if (!entry) continue;
    summary[entry.status] = (summary[entry.status] || 0) + 1;
    if (entry.status === 'failed' && !entry.resentAt) summary.unresolvedFailed++;

    if (opts.status && opts.status !== 'all' && entry.status !== opts.status) continue;
    if (q && !entry.to.toLowerCase().includes(q) && !entry.subject.toLowerCase().includes(q)) continue;

    const { payload, ...rest } = entry;
    rows.push({ ...rest, id: r.key, canResend: entry.status === 'failed' && !entry.resentAt && Boolean(payload?.html) });
  }

  return { rows, summary };
}
