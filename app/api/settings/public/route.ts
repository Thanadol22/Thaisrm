import { NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/services/settingsService';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

/**
 * GET /api/settings/public
 * Returns public association and payment transfer details for checkout/payment screens.
 * Sensitive admin signature information is deliberately excluded.
 */
export async function GET() {
  try {
    const settings = await getSystemSettings();
    return NextResponse.json({
      success: true,
      data: {
        bank_name: settings.bank_name,
        bank_account_no: settings.bank_account_no,
        bank_account_name: settings.bank_account_name,
        annual_membership_fee: settings.annual_membership_fee,
        association_name_th: settings.association_name_th,
        association_name_en: settings.association_name_en,
        association_address: settings.association_address,
        association_contact: settings.association_contact,
      },
    });
  } catch (error: any) {
    console.error('Error fetching public settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch public settings' },
      { status: 500 }
    );
  }
}
