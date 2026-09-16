'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  CreditCard,
  Building2,
  FileCheck,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Hash,
  User,
  ShieldCheck,
  Mail,
  MapPin,
  Sparkles,
  DollarSign
} from 'lucide-react';
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '@/lib/services/settingsService';

interface AdminSettingsPanelProps {
  onShowToast?: (message: string) => void;
}

export function AdminSettingsPanel({ onShowToast }: AdminSettingsPanelProps) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const res = await fetch('/api/admin/settings');
      const json = await res.json();
      if (json.success && json.data) {
        setSettings(json.data);
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setErrorMessage('ไม่สามารถโหลดข้อมูลการตั้งค่าได้');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof SystemSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      setErrorMessage(null);
      setSaveSuccess(false);

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save settings');
      }

      setSettings(json.data);
      setSaveSuccess(true);
      if (onShowToast) {
        onShowToast('บันทึกการตั้งค่าระบบเรียบร้อยแล้ว');
      }
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (confirm('คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดกลับเป็นค่าเริ่มต้นของระบบหรือไม่?')) {
      setSettings(DEFAULT_SYSTEM_SETTINGS);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-bold text-slate-500">กำลังโหลดการตั้งค่าระบบ...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0026b3] shrink-0 shadow-2xs">
            <Settings className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ตั้งค่าระบบทั่วไป
              </h2>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-emerald-200">
                System Settings
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              จัดการข้อมูลบัญชีธนาคารรับโอนเงิน ค่าสมัครสมาชิก ข้อความแจ้งเตือน และข้อมูลสมาคมสำหรับออกใบเสร็จ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>คืนค่าเริ่มต้น</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white text-xs font-bold shadow-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่า</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Alert Notices */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 text-xs sm:text-sm font-bold shadow-2xs animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>บันทึกการตั้งค่าระบบเรียบร้อยแล้ว ข้อมูลจะถูกนำไปใช้ในหน้าชำระเงินและระบบอัตโนมัติทันที</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-800 text-xs sm:text-sm font-bold shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Bank & Payment Info */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                1. ข้อมูลบัญชีธนาคารและการชำระเงิน (Bank & Payment Settings)
              </h3>
              <p className="text-xs text-slate-500">
                แสดงผลในหน้าชำระเงิน (/payment) สำหรับผู้สมัครสมาชิกและผู้ลงทะเบียนการประชุม
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อธนาคาร (Bank Name)
              </label>
              <input
                type="text"
                value={settings.bank_name}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                placeholder="เช่น Kasikorn (KBANK)"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลขที่บัญชีธนาคาร (Bank Account No.)
              </label>
              <input
                type="text"
                value={settings.bank_account_no}
                onChange={(e) => handleChange('bank_account_no', e.target.value)}
                placeholder="เช่น 020-8-16398-1"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อบัญชีผู้รับเงิน (Account Name)
              </label>
              <input
                type="text"
                value={settings.bank_account_name}
                onChange={(e) => handleChange('bank_account_name', e.target.value)}
                placeholder="เช่น สมาคมเวชศาสตร์การเจริญพันธุ์ไทย"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ค่าสมัคร/ต่ออายุสมาชิกรายปี (บาท)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={settings.annual_membership_fee}
                  onChange={(e) => handleChange('annual_membership_fee', Number(e.target.value))}
                  placeholder="1000"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
                />
                <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">
                  THB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Slip Verification Defaults */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                2. การตรวจสอบสลิปและข้อความเริ่มต้น (Slip Verification Defaults)
              </h3>
              <p className="text-xs text-slate-500">
                ข้อความที่เติมอัตโนมัติในหน้าตรวจสอบสลิปเมื่อผู้ดูแลกดปฏิเสธรายการ
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ข้อความเหตุผลการปฏิเสธสลิปเริ่มต้น (Default Slip Rejection Reason)
            </label>
            <textarea
              rows={3}
              value={settings.slip_rejection_reason}
              onChange={(e) => handleChange('slip_rejection_reason', e.target.value)}
              placeholder="โปรดแนบสลิปที่มียอดเงินและรายละเอียดตรงกับรายการลงทะเบียน"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              ข้อความนี้จะปรากฏเป็นค่าเริ่มต้นในกล่องข้อความเมื่อแอดมินกดปฏิเสธสลิป และจะส่งไปในอีเมลแจ้งเตือนผู้สมัคร
            </p>
          </div>
        </div>

        {/* Section 3: Association Info & Receipt Signatures */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0026b3] flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                3. ข้อมูลสมาคมและใบเสร็จรับเงิน (Association & Receipt Defaults)
              </h3>
              <p className="text-xs text-slate-500">
                ข้อมูลหัวเอกสารใบเสร็จรับเงินและชื่อผู้ลงนามตามระเบียบสมาคม
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อสมาคม (ภาษาไทย)
              </label>
              <input
                type="text"
                value={settings.association_name_th}
                onChange={(e) => handleChange('association_name_th', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อสมาคม (ภาษาอังกฤษ)
              </label>
              <input
                type="text"
                value={settings.association_name_en}
                onChange={(e) => handleChange('association_name_en', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ที่อยู่สมาคม (Association Address)
              </label>
              <input
                type="text"
                value={settings.association_address}
                onChange={(e) => handleChange('association_address', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ข้อมูลติดต่อ / โทรศัพท์ / อีเมล
              </label>
              <input
                type="text"
                value={settings.association_contact}
                onChange={(e) => handleChange('association_contact', e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อผู้ลงนามอนุมัติ (Authorized Signer)
              </label>
              <input
                type="text"
                value={settings.receipt_authorized_signer}
                onChange={(e) => handleChange('receipt_authorized_signer', e.target.value)}
                placeholder="เช่น แพทย์หญิงพิมพกา ชวนะเวสน์"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ตำแหน่งผู้ลงนาม (Authorized Role)
              </label>
              <input
                type="text"
                value={settings.receipt_authorized_role}
                onChange={(e) => handleChange('receipt_authorized_role', e.target.value)}
                placeholder="เช่น เหรัญญิก / ผู้รับเงิน"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อผู้จัดทำใบเสร็จ (Prepared By)
              </label>
              <input
                type="text"
                value={settings.receipt_prepared_by}
                onChange={(e) => handleChange('receipt_prepared_by', e.target.value)}
                placeholder="เช่น ปณตพร ภวภูตานนท์ ณ มหาสารคาม"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ตำแหน่งผู้จัดทำ (Prepared Role)
              </label>
              <input
                type="text"
                value={settings.receipt_prepared_role}
                onChange={(e) => handleChange('receipt_prepared_role', e.target.value)}
                placeholder="เช่น ผู้จัดทำ"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition"
              />
            </div>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-sm font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>คืนค่าเริ่มต้น</span>
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-[#0026b3] hover:bg-[#001f94] text-white text-sm font-bold shadow-md hover:shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังบันทึกการตั้งค่า...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>บันทึกการตั้งค่าระบบ</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
