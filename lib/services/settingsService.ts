import prisma from '@/lib/prisma';

export interface SystemSettings {
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  annual_membership_fee: number;
  slip_rejection_reason: string;
  receipt_authorized_signer: string;
  receipt_authorized_role: string;
  receipt_prepared_by: string;
  receipt_prepared_role: string;
  association_name_th: string;
  association_name_en: string;
  association_address: string;
  association_contact: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  bank_name: 'Kasikorn (KBANK)',
  bank_account_no: '020-8-16398-1',
  bank_account_name: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
  annual_membership_fee: 1000,
  slip_rejection_reason: 'โปรดแนบสลิปที่มียอดเงินและรายละเอียดตรงกับรายการลงทะเบียน',
  receipt_authorized_signer: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
  receipt_authorized_role: 'เหรัญญิก / ผู้รับเงิน',
  receipt_prepared_by: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
  receipt_prepared_role: 'ผู้จัดทำ',
  association_name_th: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
  association_name_en: 'Thai Society for Reproductive Medicine',
  association_address: 'อาคารเฉลิมพระบารมี ๕๐ ปี ซ.ศูนย์วิจัย ถ.เพชรบุรีตัดใหม่ แขวงบางกะปิ เขตห้วยขวาง กรุงเทพฯ 10310',
  association_contact: 'โทรศัพท์ 0-2716-6440-1 อีเมล: contact@thaisrm.org',
};

interface SettingRow {
  key: string;
  value: string;
  description?: string | null;
  updated_at?: Date;
}

/**
 * Fetch all system settings merged with defaults
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const result: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };

  try {
    const rows = await prisma.$queryRawUnsafe<SettingRow[]>(
      'SELECT key, value FROM system_settings'
    );

    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (!row.key || row.value === undefined || row.value === null) continue;
        if (row.key === 'annual_membership_fee') {
          const num = Number(row.value);
          if (!isNaN(num) && num >= 0) {
            result.annual_membership_fee = num;
          }
        } else if (row.key in result) {
          (result as any)[row.key] = row.value;
        }
      }
    }
  } catch (error) {
    console.warn('Could not read from system_settings table, using defaults:', error);
  }

  return result;
}

/**
 * Update system settings in DB
 */
export async function updateSystemSettings(
  partial: Partial<SystemSettings>
): Promise<{ success: boolean; settings: SystemSettings; error?: string }> {
  try {
    const keys = Object.keys(partial) as (keyof SystemSettings)[];

    for (const k of keys) {
      const val = partial[k];
      if (val === undefined) continue;
      const strVal = String(val).trim();

      await prisma.$executeRawUnsafe(
        `INSERT INTO system_settings (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        k,
        strVal
      );
    }

    const updated = await getSystemSettings();
    return { success: true, settings: updated };
  } catch (error: any) {
    console.error('Error updating system settings:', error);
    return {
      success: false,
      settings: await getSystemSettings(),
      error: error?.message || 'Failed to update system settings',
    };
  }
}
