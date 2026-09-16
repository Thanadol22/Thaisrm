import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { getSystemSettings, updateSystemSettings, SystemSettings } from '@/lib/services/settingsService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/settings
 * Read current system settings
 */
export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch system settings' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/settings
 * Update system settings (Admin only)
 */
export async function POST(req: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: เข้าถึงได้เฉพาะผู้ดูแลระบบ' },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid settings payload' },
        { status: 400 }
      );
    }

    const payload: Partial<SystemSettings> = {};

    if (typeof body.bank_name === 'string') payload.bank_name = body.bank_name;
    if (typeof body.bank_account_no === 'string') payload.bank_account_no = body.bank_account_no;
    if (typeof body.bank_account_name === 'string') payload.bank_account_name = body.bank_account_name;
    if (body.annual_membership_fee !== undefined) {
      const fee = Number(body.annual_membership_fee);
      if (!isNaN(fee) && fee >= 0) payload.annual_membership_fee = fee;
    }
    if (typeof body.slip_rejection_reason === 'string') payload.slip_rejection_reason = body.slip_rejection_reason;
    if (typeof body.receipt_authorized_signer === 'string') payload.receipt_authorized_signer = body.receipt_authorized_signer;
    if (typeof body.receipt_authorized_role === 'string') payload.receipt_authorized_role = body.receipt_authorized_role;
    if (typeof body.receipt_prepared_by === 'string') payload.receipt_prepared_by = body.receipt_prepared_by;
    if (typeof body.receipt_prepared_role === 'string') payload.receipt_prepared_role = body.receipt_prepared_role;
    if (typeof body.association_name_th === 'string') payload.association_name_th = body.association_name_th;
    if (typeof body.association_name_en === 'string') payload.association_name_en = body.association_name_en;
    if (typeof body.association_address === 'string') payload.association_address = body.association_address;
    if (typeof body.association_contact === 'string') payload.association_contact = body.association_contact;

    // Receipt Templates
    if (typeof body.receipt_tpl1_name === 'string') payload.receipt_tpl1_name = body.receipt_tpl1_name;
    if (typeof body.receipt_tpl1_title === 'string') payload.receipt_tpl1_title = body.receipt_tpl1_title;
    if (typeof body.receipt_tpl1_purpose === 'string') payload.receipt_tpl1_purpose = body.receipt_tpl1_purpose;
    if (body.receipt_tpl1_amount !== undefined) {
      const amt = Number(body.receipt_tpl1_amount);
      if (!isNaN(amt) && amt >= 0) payload.receipt_tpl1_amount = amt;
    }
    if (typeof body.receipt_tpl1_details === 'string') payload.receipt_tpl1_details = body.receipt_tpl1_details;

    if (typeof body.receipt_tpl2_name === 'string') payload.receipt_tpl2_name = body.receipt_tpl2_name;
    if (typeof body.receipt_tpl2_title === 'string') payload.receipt_tpl2_title = body.receipt_tpl2_title;
    if (typeof body.receipt_tpl2_purpose === 'string') payload.receipt_tpl2_purpose = body.receipt_tpl2_purpose;
    if (body.receipt_tpl2_amount !== undefined) {
      const amt = Number(body.receipt_tpl2_amount);
      if (!isNaN(amt) && amt >= 0) payload.receipt_tpl2_amount = amt;
    }
    if (typeof body.receipt_tpl2_details === 'string') payload.receipt_tpl2_details = body.receipt_tpl2_details;

    if (typeof body.receipt_tpl3_name === 'string') payload.receipt_tpl3_name = body.receipt_tpl3_name;
    if (typeof body.receipt_tpl3_title === 'string') payload.receipt_tpl3_title = body.receipt_tpl3_title;
    if (typeof body.receipt_tpl3_purpose === 'string') payload.receipt_tpl3_purpose = body.receipt_tpl3_purpose;
    if (body.receipt_tpl3_amount !== undefined) {
      const amt = Number(body.receipt_tpl3_amount);
      if (!isNaN(amt) && amt >= 0) payload.receipt_tpl3_amount = amt;
    }
    if (typeof body.receipt_tpl3_details === 'string') payload.receipt_tpl3_details = body.receipt_tpl3_details;

    const res = await updateSystemSettings(payload);

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'Failed to update system settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว',
      data: res.settings,
    });
  } catch (error: any) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save system settings' },
      { status: 500 }
    );
  }
}
