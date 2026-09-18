'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  DollarSign,
  Eye
} from 'lucide-react';
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '@/lib/services/settingsService';
import { ReceiptModal } from '@/components/ReceiptModal';
import { SlipRejectionPreviewModal } from '@/components/SlipRejectionPreviewModal';
import { ReceiptData, DEFAULT_ASSOCIATION_INFO } from '@/types/receipt';

interface AdminSettingsPanelProps {
  onShowToast?: (message: string) => void;
}

export function AdminSettingsPanel({ onShowToast }: AdminSettingsPanelProps) {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview Modals State
  const [showSlipRejectionPreview, setShowSlipRejectionPreview] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [selectedPreviewTemplate, setSelectedPreviewTemplate] = useState<1 | 2 | 3>(1);
  const [activeTemplateTab, setActiveTemplateTab] = useState<1 | 2 | 3>(1);

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

  // Mock Receipt Data populated from active settings values for instant preview
  const getPreviewReceiptData = (tplNum: 1 | 2 | 3): ReceiptData => {
    const today = new Date().toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (tplNum === 1) {
      const details = (settings.receipt_tpl1_details || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: 'PREVIEW-RECEIPT-1',
        receiptNo: '2569/02-021',
        receiptDate: today,
        purposeText: settings.receipt_tpl1_purpose || 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
        payerType: 'individual',
        payerName: 'ชื่อ-นามสกุล (ผู้ลงทะเบียนตัวอย่าง)',
        payerAddressLine1: '',
        payerAddressLine2: '',
        payerPhone: '',
        payerTaxId: '',
        items: [
          {
            id: 'item-preview-1',
            itemNumber: 1,
            title: settings.receipt_tpl1_title || 'ค่าลงทะเบียน',
            subDetails: [
              ...details,
              'จัดขึ้นวันที่ 20-22 ตุลาคม 2569',
              'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
              'ชื่อ-นามสกุล',
            ],
            amount: Number(settings.receipt_tpl1_amount) || 3500,
          },
        ],
        totalAmount: Number(settings.receipt_tpl1_amount) || 3500,
        associationNameTh: settings.association_name_th || DEFAULT_ASSOCIATION_INFO.nameTh,
        associationNameEn: settings.association_name_en || DEFAULT_ASSOCIATION_INFO.nameEn,
        associationAddress: settings.association_address || DEFAULT_ASSOCIATION_INFO.address,
        associationContact: settings.association_contact || DEFAULT_ASSOCIATION_INFO.contact,
        associationTaxId: settings.association_tax_id || DEFAULT_ASSOCIATION_INFO.taxId,
        payerSignerRole: 'ผู้จ่ายเงิน',
        authorizedSignerName: settings.receipt_authorized_signer,
        authorizedSignerRole: settings.receipt_authorized_role,
        preparedByName: settings.receipt_prepared_by,
        preparedByRole: settings.receipt_prepared_role,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'issued',
      };
    } else if (tplNum === 2) {
      const details = (settings.receipt_tpl2_details || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: 'PREVIEW-RECEIPT-2',
        receiptNo: '2569/02-022',
        receiptDate: today,
        purposeText: settings.receipt_tpl2_purpose || 'ได้รับเงินค่าสมัครสมาชิกสมาคมฯ ประจำปี 2569',
        payerType: 'individual',
        payerName: 'ชื่อ-นามสกุล (สมาชิกตัวอย่าง)',
        payerAddressLine1: '',
        payerAddressLine2: '',
        payerPhone: '',
        payerTaxId: '',
        items: [
          {
            id: 'item-preview-2',
            itemNumber: 1,
            title: settings.receipt_tpl2_title || 'ค่าสมัครสมาชิก',
            subDetails: [...details, 'ชื่อ-นามสกุล'],
            amount: Number(settings.receipt_tpl2_amount) || 1000,
          },
        ],
        totalAmount: Number(settings.receipt_tpl2_amount) || 1000,
        associationNameTh: settings.association_name_th || DEFAULT_ASSOCIATION_INFO.nameTh,
        associationNameEn: settings.association_name_en || DEFAULT_ASSOCIATION_INFO.nameEn,
        associationAddress: settings.association_address || DEFAULT_ASSOCIATION_INFO.address,
        associationContact: settings.association_contact || DEFAULT_ASSOCIATION_INFO.contact,
        associationTaxId: settings.association_tax_id || DEFAULT_ASSOCIATION_INFO.taxId,
        payerSignerRole: 'ผู้จ่ายเงิน',
        authorizedSignerName: settings.receipt_authorized_signer,
        authorizedSignerRole: settings.receipt_authorized_role,
        preparedByName: settings.receipt_prepared_by,
        preparedByRole: settings.receipt_prepared_role,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'issued',
      };
    } else {
      const details = (settings.receipt_tpl3_details || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      return {
        id: 'PREVIEW-RECEIPT-3',
        receiptNo: '2569/02-094',
        receiptDate: today,
        purposeText: settings.receipt_tpl3_purpose || 'ได้รับเงินสนับสนุน ประจำปี 2569',
        payerType: 'company',
        payerName: 'ชื่อบริษัท / หน่วยงานตัวอย่าง',
        branchName: 'สำนักงานใหญ่',
        payerAddressLine1: 'เลขที่ อาคาร ซอย ถนน แขวง เขต',
        payerAddressLine2: 'กรุงเทพมหานคร 10310',
        payerPhone: '02-123-4567',
        payerTaxId: '0105500000000',
        items: [
          {
            id: 'item-preview-3',
            itemNumber: 1,
            title: settings.receipt_tpl3_title || 'ค่าสนับสนุนการประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
            subDetails: [
              ...details,
              'จัดขึ้นวันที่ 20-22 ตุลาคม 2569',
              'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
              'ชื่อบริษัท / หน่วยงานตัวอย่าง',
            ],
            amount: Number(settings.receipt_tpl3_amount) || 50000,
          },
        ],
        totalAmount: Number(settings.receipt_tpl3_amount) || 50000,
        associationNameTh: settings.association_name_th || DEFAULT_ASSOCIATION_INFO.nameTh,
        associationNameEn: settings.association_name_en || DEFAULT_ASSOCIATION_INFO.nameEn,
        associationAddress: settings.association_address || DEFAULT_ASSOCIATION_INFO.address,
        associationContact: settings.association_contact || DEFAULT_ASSOCIATION_INFO.contact,
        associationTaxId: settings.association_tax_id || DEFAULT_ASSOCIATION_INFO.taxId,
        payerSignerRole: 'ผู้จ่ายเงิน',
        authorizedSignerName: settings.receipt_authorized_signer,
        authorizedSignerRole: settings.receipt_authorized_role,
        preparedByName: settings.receipt_prepared_by,
        preparedByRole: settings.receipt_prepared_role,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'issued',
      };
    }
  };

  const previewReceiptData = useMemo(() => {
    return getPreviewReceiptData(selectedPreviewTemplate);
  }, [settings, selectedPreviewTemplate]);

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
              จัดการข้อมูลบัญชีธนาคารรับโอนเงิน ค่าสมัครสมาชิก รูปแบบใบเสร็จรับเงิน และข้อมูลสมาคม
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
                1. ข้อมูลบัญชีธนาคารและการชำระเงิน
              </h3>
              <p className="text-xs text-slate-500">
                แสดงผลในหน้าชำระเงิน (/payment) สำหรับผู้สมัครสมาชิกและผู้ลงทะเบียนการประชุม
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อธนาคาร
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
                เลขที่บัญชีธนาคาร
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
                ชื่อบัญชีผู้รับเงิน
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  2. การตรวจสอบสลิปและข้อความเริ่มต้น
                </h3>
                <p className="text-xs text-slate-500">
                  ข้อความที่เติมอัตโนมัติในหน้าตรวจสอบสลิปเมื่อผู้ดูแลกดปฏิเสธรายการ
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSlipRejectionPreview(true)}
              className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/90 border border-amber-200 text-amber-800 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer shadow-2xs active:scale-95"
            >
              <Eye className="w-4 h-4 text-amber-600" />
              <span>แสดงตัวอย่าง</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              ข้อความเหตุผลการปฏิเสธสลิปเริ่มต้น
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0026b3] flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  3. ข้อมูลสมาคมและผู้ลงนามใบเสร็จ
                </h3>
                <p className="text-xs text-slate-500">
                  ข้อมูลหัวเอกสารใบเสร็จรับเงินและชื่อผู้ลงนามตามระเบียบสมาคม
                </p>
              </div>
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
                ที่อยู่สมาคม
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

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                เลขประจำตัวผู้เสียภาษีของสมาคม
              </label>
              <input
                type="text"
                value={settings.association_tax_id}
                onChange={(e) => handleChange('association_tax_id', e.target.value)}
                placeholder="เช่น 0-9930-00367-70-7"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] focus:bg-white transition font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ชื่อผู้ลงนามอนุมัติ
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
                ตำแหน่งผู้ลงนาม
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
                ชื่อผู้จัดทำใบเสร็จ
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
                ตำแหน่งผู้จัดทำ
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

        {/* Section 4: Receipt Templates Configuration */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  4. การตั้งค่ารูปแบบใบเสร็จแต่ละแบบ
                </h3>
                <p className="text-xs text-slate-500">
                  กำหนดข้อความเริ่มต้น วัตถุประสงค์ และราคากลางสำหรับใบเสร็จแต่ละประเภท
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPreviewTemplate(activeTemplateTab);
                setShowReceiptPreview(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100/90 border border-indigo-200 text-indigo-800 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center shrink-0 cursor-pointer shadow-2xs active:scale-95"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>ดูตัวอย่างรูปแบบที่ {activeTemplateTab}</span>
            </button>
          </div>

          {/* Template Selection Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTemplateTab(1)}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTemplateTab === 1
                  ? 'bg-white text-[#0026b3] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-blue-100 text-[#0026b3] text-[11px] flex items-center justify-center font-black">
                1
              </span>
              <span>{settings.receipt_tpl1_name || 'ค่าลงทะเบียน'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTemplateTab(2)}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTemplateTab === 2
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] flex items-center justify-center font-black">
                2
              </span>
              <span>{settings.receipt_tpl2_name || 'ค่าสมัครสมาชิก'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTemplateTab(3)}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTemplateTab === 3
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] flex items-center justify-center font-black">
                3
              </span>
              <span>{settings.receipt_tpl3_name || 'ค่าสนับสนุน (สปอนเซอร์)'}</span>
            </button>
          </div>

          {/* Template 1 Form Fields */}
          {activeTemplateTab === 1 && (
            <div className="space-y-4 p-5 bg-blue-50/40 rounded-2xl border border-blue-100 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                <span className="text-xs font-black text-blue-900 uppercase">
                  รูปแบบที่ 1: ค่าลงทะเบียนเข้าร่วมประชุม
                </span>
                <span className="text-[11px] text-blue-700 font-medium">
                  ใช้สำหรับผู้ลงทะเบียนเข้าร่วมประชุมวิชาการประจำปี
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อเรียกรูปแบบ
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl1_name}
                    onChange={(e) => handleChange('receipt_tpl1_name', e.target.value)}
                    placeholder="ค่าลงทะเบียนเข้าร่วมประชุม"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อรายการหลักในใบเสร็จ
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl1_title}
                    onChange={(e) => handleChange('receipt_tpl1_title', e.target.value)}
                    placeholder="ค่าลงทะเบียน"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ข้อความวัตถุประสงค์ (ต่อท้ายสมาคมเวชศาสตร์การเจริญพันธุ์ไทย...)
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl1_purpose}
                    onChange={(e) => handleChange('receipt_tpl1_purpose', e.target.value)}
                    placeholder="ได้รับเงินค่าลงทะเบียน ประจำปี 2569"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    จำนวนเงินเริ่มต้น (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.receipt_tpl1_amount}
                    onChange={(e) => handleChange('receipt_tpl1_amount', Number(e.target.value))}
                    placeholder="3500"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    รายละเอียดย่อยใต้รายการ (ขึ้นบรรทัดใหม่ละ 1 รายการ)
                  </label>
                  <textarea
                    rows={3}
                    value={settings.receipt_tpl1_details}
                    onChange={(e) => handleChange('receipt_tpl1_details', e.target.value)}
                    placeholder="การประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569&#10;ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0026b3] transition"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * ระบบจะเติมวันจัดงาน สถานที่ และชื่อผู้เข้าร่วมต่อท้ายให้อัตโนมัติเมื่อเลือกการประชุม
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Template 2 Form Fields */}
          {activeTemplateTab === 2 && (
            <div className="space-y-4 p-5 bg-indigo-50/40 rounded-2xl border border-indigo-100 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-200/60">
                <span className="text-xs font-black text-indigo-900 uppercase">
                  รูปแบบที่ 2: ค่าสมัคร / ต่ออายุสมาชิก
                </span>
                <span className="text-[11px] text-indigo-700 font-medium">
                  ใช้สำหรับค่าสมัครสมาชิกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อเรียกรูปแบบ
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl2_name}
                    onChange={(e) => handleChange('receipt_tpl2_name', e.target.value)}
                    placeholder="ค่าสมัคร / ต่ออายุสมาชิก"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อรายการหลักในใบเสร็จ
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl2_title}
                    onChange={(e) => handleChange('receipt_tpl2_title', e.target.value)}
                    placeholder="ค่าสมัครสมาชิก"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ข้อความวัตถุประสงค์ (ต่อท้ายสมาคมเวชศาสตร์การเจริญพันธุ์ไทย...)
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl2_purpose}
                    onChange={(e) => handleChange('receipt_tpl2_purpose', e.target.value)}
                    placeholder="ได้รับเงินค่าสมัครสมาชิกสมาคมฯ ประจำปี 2569"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    จำนวนเงินเริ่มต้น (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.receipt_tpl2_amount}
                    onChange={(e) => handleChange('receipt_tpl2_amount', Number(e.target.value))}
                    placeholder="1000"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    รายละเอียดย่อยใต้รายการ (ขึ้นบรรทัดใหม่ละ 1 รายการ)
                  </label>
                  <textarea
                    rows={2}
                    value={settings.receipt_tpl2_details}
                    onChange={(e) => handleChange('receipt_tpl2_details', e.target.value)}
                    placeholder="สมาคมเวชศาสตร์การเจริญพันธุ์ไทย"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Template 3 Form Fields */}
          {activeTemplateTab === 3 && (
            <div className="space-y-4 p-5 bg-emerald-50/40 rounded-2xl border border-emerald-100 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <span className="text-xs font-black text-emerald-900 uppercase">
                  รูปแบบที่ 3: ค่าสนับสนุนการจัดงาน
                </span>
                <span className="text-[11px] text-emerald-700 font-medium">
                  ใช้สำหรับบริษัทคู่ค้า นิติบุคคล หรือสปอนเซอร์สนับสนุนการจัดงาน
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อเรียกรูปแบบ
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl3_name}
                    onChange={(e) => handleChange('receipt_tpl3_name', e.target.value)}
                    placeholder="ค่าสนับสนุนการจัดงาน (สปอนเซอร์)"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ชื่อรายการหลักในใบเสร็จ
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl3_title}
                    onChange={(e) => handleChange('receipt_tpl3_title', e.target.value)}
                    placeholder="ค่าสนับสนุนการประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    ข้อความวัตถุประสงค์ (ต่อท้ายสมาคมเวชศาสตร์การเจริญพันธุ์ไทย...)
                  </label>
                  <input
                    type="text"
                    value={settings.receipt_tpl3_purpose}
                    onChange={(e) => handleChange('receipt_tpl3_purpose', e.target.value)}
                    placeholder="ได้รับเงินสนับสนุน ประจำปี 2569"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    จำนวนเงินเริ่มต้น (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.receipt_tpl3_amount}
                    onChange={(e) => handleChange('receipt_tpl3_amount', Number(e.target.value))}
                    placeholder="50000"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    รายละเอียดย่อยใต้รายการ (ขึ้นบรรทัดใหม่ละ 1 รายการ)
                  </label>
                  <textarea
                    rows={3}
                    value={settings.receipt_tpl3_details}
                    onChange={(e) => handleChange('receipt_tpl3_details', e.target.value)}
                    placeholder="ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition"
                  />
                </div>
              </div>
            </div>
          )}
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

      {/* Preview Modal for Section 2 (Slip Rejection Preview) */}
      <SlipRejectionPreviewModal
        isOpen={showSlipRejectionPreview}
        onClose={() => setShowSlipRejectionPreview(false)}
        rejectionReason={settings.slip_rejection_reason}
        associationNameTh={settings.association_name_th}
        associationContact={settings.association_contact}
      />

      {/* Preview Modal for Section 3 & 4 (Receipt Document Preview) */}
      <ReceiptModal
        isOpen={showReceiptPreview}
        onClose={() => setShowReceiptPreview(false)}
        receipt={previewReceiptData}
      />
    </div>
  );
}
