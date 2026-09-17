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
  association_tax_id: string;

  // Receipt Template 1: ค่าลงทะเบียน (Registration)
  receipt_tpl1_name: string;
  receipt_tpl1_title: string;
  receipt_tpl1_purpose: string;
  receipt_tpl1_amount: number;
  receipt_tpl1_details: string;

  // Receipt Template 2: ค่าสมัคร/ต่ออายุสมาชิก (Membership)
  receipt_tpl2_name: string;
  receipt_tpl2_title: string;
  receipt_tpl2_purpose: string;
  receipt_tpl2_amount: number;
  receipt_tpl2_details: string;

  // Receipt Template 3: ค่าสนับสนุน/สปอนเซอร์ (Sponsorship)
  receipt_tpl3_name: string;
  receipt_tpl3_title: string;
  receipt_tpl3_purpose: string;
  receipt_tpl3_amount: number;
  receipt_tpl3_details: string;
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
  association_address: 'ชั้น 8 อาคารเฉลิมพระบารมี ๕๐ ปี เลขที่ 2 ซอยศูนย์วิจัย ถนนเพชรบุรีตัดใหม่ กรุงเทพฯ',
  association_contact: 'Website: https://thaisrm.com/ E-mail: tsrm.info@gmail.com',
  association_tax_id: '0-9930-00367-70-7',

  // Template 1: ค่าลงทะเบียน
  receipt_tpl1_name: 'ค่าลงทะเบียนเข้าร่วมประชุม',
  receipt_tpl1_title: 'ค่าลงทะเบียน',
  receipt_tpl1_purpose: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
  receipt_tpl1_amount: 3500,
  receipt_tpl1_details: 'การประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569\nด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',

  // Template 2: ค่าสมัครสมาชิก
  receipt_tpl2_name: 'ค่าสมัคร / ต่ออายุสมาชิก',
  receipt_tpl2_title: 'ค่าสมัครสมาชิก',
  receipt_tpl2_purpose: 'ได้รับเงินค่าสมัครสมาชิกสมาคมฯ ประจำปี 2569',
  receipt_tpl2_amount: 1000,
  receipt_tpl2_details: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',

  // Template 3: ค่าสนับสนุน / สปอนเซอร์
  receipt_tpl3_name: 'ค่าสนับสนุนการจัดงาน (สปอนเซอร์)',
  receipt_tpl3_title: 'ค่าสนับสนุนการประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
  receipt_tpl3_purpose: 'ได้รับเงินสนับสนุน ประจำปี 2569',
  receipt_tpl3_amount: 50000,
  receipt_tpl3_details: 'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
};

interface SettingRow {
  key: string;
  value: string;
  description?: string | null;
  updated_at?: Date;
}

let settingsCache: { data: SystemSettings; timestamp: number } | null = null;
const SETTINGS_CACHE_TTL_MS = 60000; // 60 seconds

export function invalidateSettingsCache() {
  settingsCache = null;
}

/**
 * Fetch all system settings merged with defaults (cached in-memory for 60s)
 */
export async function getSystemSettings(forceFresh = false): Promise<SystemSettings> {
  const now = Date.now();
  if (!forceFresh && settingsCache && now - settingsCache.timestamp < SETTINGS_CACHE_TTL_MS) {
    return settingsCache.data;
  }

  const result: SystemSettings = { ...DEFAULT_SYSTEM_SETTINGS };

  try {
    const rows = await prisma.$queryRawUnsafe<SettingRow[]>(
      'SELECT key, value FROM system_settings'
    );

    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (!row.key || row.value === undefined || row.value === null) continue;
        if (
          row.key === 'annual_membership_fee' ||
          row.key === 'receipt_tpl1_amount' ||
          row.key === 'receipt_tpl2_amount' ||
          row.key === 'receipt_tpl3_amount'
        ) {
          const num = Number(row.value);
          if (!isNaN(num) && num >= 0) {
            (result as any)[row.key] = num;
          }
        } else if (row.key in result) {
          (result as any)[row.key] = row.value;
        }
      }
    }
  } catch (error) {
    console.warn('Could not read from system_settings table, using defaults:', error);
  }

  settingsCache = { data: result, timestamp: now };
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

    invalidateSettingsCache();
    const updated = await getSystemSettings(true);
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
