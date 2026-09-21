import { NextRequest, NextResponse } from 'next/server';
import { testSmtpConnection, getMailTransporter, getDefaultFromAddress } from '@/lib/email';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = getAdminSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { host, port, secure, user, pass, testRecipient } = body;

    const config = host && user && pass ? { host, port: Number(port) || 587, secure: !!secure, user, pass } : undefined;

    // 1. Test SMTP Verification
    const verifyResult = await testSmtpConnection(config);
    if (!verifyResult.success) {
      return NextResponse.json({
        success: false,
        error: verifyResult.message,
        details: verifyResult.error,
      }, { status: 400 });
    }

    // 2. If testRecipient is provided, send a real test email
    if (testRecipient && testRecipient.includes('@')) {
      const transporter = getMailTransporter(config);
      if (transporter) {
        await transporter.sendMail({
          from: getDefaultFromAddress(),
          to: testRecipient,
          subject: '🧪 [TSRM Email Test] ทดสอบการเชื่อมต่อระบบอีเมลสมาคมสำเร็จ',
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
              <h2 style="color: #0026b3;">การทดสอบส่งอีเมลจากระบบ TSRM สำเร็จ ✅</h2>
              <p>อีเมลนี้เป็นการทดสอบการเชื่อมต่อ SMTP Server ของสมาคมเวชศาสตร์การเจริญพันธุ์ไทย</p>
              <div style="background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 13px;">
                <strong>วันและเวลาที่ทดสอบ:</strong> ${new Date().toLocaleString('th-TH')}<br/>
                <strong>ผู้ทดสอบ:</strong> ${session.username || 'Admin'}
              </div>
            </div>
          `,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: testRecipient
        ? `ทดสอบการเชื่อมต่อสำเร็จ และได้ส่งอีเมลทดสอบไปยัง ${testRecipient} เรียบร้อยแล้ว`
        : 'เชื่อมต่อกับเซิร์ฟเวอร์ SMTP สำเร็จ',
    });
  } catch (error: any) {
    console.error('API /api/email/test-smtp error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการทดสอบ SMTP',
    }, { status: 500 });
  }
}
