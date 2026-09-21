import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';

export interface ScheduledEmailTask {
  id: string;
  title: string;
  taskType: 'tickets' | 'custom';
  scheduledAt: string; // ISO string
  createdAt: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  payload: {
    subject?: string;
    content?: string;
    meetingId?: string;
    meetingName?: string;
    statusFilter?: string;
    targetType?: string;
    customEmails?: string;
    extraNote?: string;
  };
  resultSummary?: string;
}

const SETTINGS_KEY = 'scheduled_email_queue';

async function getQueue(): Promise<ScheduledEmailTask[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ value: string }>>(
      `SELECT value FROM system_settings WHERE key = $1 LIMIT 1`,
      SETTINGS_KEY
    );
    if (rows && rows.length > 0 && rows[0].value) {
      return JSON.parse(rows[0].value) as ScheduledEmailTask[];
    }
  } catch (err) {
    console.error('Failed to read scheduled_email_queue:', err);
  }
  return [];
}

async function saveQueue(queue: ScheduledEmailTask[]): Promise<boolean> {
  try {
    const jsonStr = JSON.stringify(queue);
    await prisma.$executeRawUnsafe(
      `INSERT INTO system_settings (key, value, description, updated_at)
       VALUES ($1, $2, 'Scheduled Email Dispatch Queue', NOW())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      SETTINGS_KEY,
      jsonStr
    );
    return true;
  } catch (err) {
    console.error('Failed to save scheduled_email_queue:', err);
    return false;
  }
}

// GET: ดึงรายการงานที่ตั้งเวลาส่งไว้ทั้งหมด
export async function GET(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const queue = await getQueue();
    // Sort by scheduledAt asc
    queue.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    return NextResponse.json({
      success: true,
      data: queue,
    });
  } catch (error: any) {
    console.error('API /api/email/schedule GET error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch scheduled queue',
    }, { status: 500 });
  }
}

// POST: เพิ่มรายการตั้งเวลาใหม่ หรือสั่ง Trigger ประมวลผลคิว
export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, task } = body;

    const queue = await getQueue();

    if (action === 'add') {
      if (!task || !task.scheduledAt) {
        return NextResponse.json({ success: false, error: 'Invalid task parameters' }, { status: 400 });
      }

      const newTask: ScheduledEmailTask = {
        id: `SCHED-${Date.now().toString(36).toUpperCase()}`,
        title: task.title || (task.taskType === 'tickets' ? `ส่ง QR Code: ${task.payload?.meetingName || 'งานประชุม'}` : task.payload?.subject || 'อีเมลบรอดแคสต์'),
        taskType: task.taskType || 'custom',
        scheduledAt: new Date(task.scheduledAt).toISOString(),
        createdAt: new Date().toISOString(),
        status: 'pending',
        payload: task.payload || {},
      };

      queue.unshift(newTask);
      await saveQueue(queue);

      return NextResponse.json({
        success: true,
        data: newTask,
        message: 'เพิ่มรายการตั้งเวลาส่งอีเมลสำเร็จ',
      });
    }

    if (action === 'cancel') {
      const { taskId } = body;
      const index = queue.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        queue[index].status = 'cancelled';
        await saveQueue(queue);
        return NextResponse.json({ success: true, message: 'ยกเลิกรายการตั้งเวลาสำเร็จ' });
      }
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }

    if (action === 'delete') {
      const { taskId } = body;
      const filtered = queue.filter((t) => t.id !== taskId);
      await saveQueue(filtered);
      return NextResponse.json({ success: true, message: 'ลบรายการสำเร็จ' });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/email/schedule POST error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to process schedule request',
    }, { status: 500 });
  }
}
