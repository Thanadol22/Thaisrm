import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/security/adminAuth';
import { getAllReceipts, saveReceipt, deleteReceipt, getNextReceiptId } from '@/lib/services/receiptService';
import { ReceiptData } from '@/types/receipt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/receipts
 * Retrieve all receipts stored in the database
 */
export async function GET(req: NextRequest) {
  try {
    const receipts = await getAllReceipts();
    return NextResponse.json({
      success: true,
      data: receipts,
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/receipts:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch receipts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/receipts
 * Create or update a receipt in the database
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
    if (!body || typeof body !== 'object' || !body.receiptNo || !body.payerName) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุเลขที่ใบเสร็จและชื่อผู้ชำระเงิน' },
        { status: 400 }
      );
    }

    let receiptId = body.id;
    if (!receiptId || receiptId.startsWith('REC-')) {
      receiptId = await getNextReceiptId();
    }

    const receiptData: ReceiptData = {
      id: receiptId,
      receiptNo: body.receiptNo,
      receiptDate: body.receiptDate || new Date().toLocaleDateString('th-TH'),
      purposeText: body.purposeText || '',
      payerType: body.payerType || 'individual',
      payerName: body.payerName,
      branchName: body.branchName || undefined,
      payerAddressLine1: body.payerAddressLine1 || '',
      payerAddressLine2: body.payerAddressLine2 || '',
      payerPhone: body.payerPhone || undefined,
      payerTaxId: body.payerTaxId || undefined,
      items: Array.isArray(body.items) ? body.items : [],
      totalAmount: Number(body.totalAmount) || 0,
      thaiBahtTextOverride: body.thaiBahtTextOverride || undefined,
      payerSignerName: body.payerSignerName || undefined,
      payerSignerRole: body.payerSignerRole || 'ผู้จ่ายเงิน',
      payerSignedDate: body.payerSignedDate || undefined,
      authorizedSignerName: body.authorizedSignerName || 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: body.authorizedSignerRole || 'เหรัญญิก / ผู้รับเงิน',
      authorizedSignedDate: body.authorizedSignedDate || undefined,
      preparedByName: body.preparedByName || 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: body.preparedByRole || 'ผู้จัดทำ',
      preparedBySignedDate: body.preparedBySignedDate || undefined,
      associationNameTh: body.associationNameTh || undefined,
      associationNameEn: body.associationNameEn || undefined,
      associationAddress: body.associationAddress || undefined,
      associationContact: body.associationContact || undefined,
      associationTaxId: body.associationTaxId || undefined,
      meetingId: body.meetingId || undefined,
      attendeeId: body.attendeeId || undefined,
      slipId: body.slipId || undefined,
      createdAt: body.createdAt || new Date().toISOString().split('T')[0],
      status: body.status || 'issued',
    };

    const res = await saveReceipt(receiptData);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'Failed to save receipt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'บันทึกใบเสร็จรับเงินสำเร็จ',
      data: res.data,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/receipts:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to save receipt' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/receipts?id=REC-xxx
 * Remove a receipt from the database
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = getAdminSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: เข้าถึงได้เฉพาะผู้ดูแลระบบ' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'กรุณาระบุรหัสใบเสร็จ (id)' },
        { status: 400 }
      );
    }

    const res = await deleteReceipt(id);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: res.error || 'Failed to delete receipt' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'ลบใบเสร็จรับเงินสำเร็จ',
    });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/receipts:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete receipt' },
      { status: 500 }
    );
  }
}
