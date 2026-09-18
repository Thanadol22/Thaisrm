'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ReceiptData, ReceiptItemLine, DEFAULT_ASSOCIATION_INFO } from '@/types/receipt';
import { thaiBahtText } from '@/lib/thaiBahtText';
import { generateReceiptNo, DEFAULT_RECEIPT_START_SEQ } from '@/lib/receiptNumber';
import { SystemSettings, DEFAULT_SYSTEM_SETTINGS } from '@/lib/services/settingsService';
import {
  X,
  Save,
  Printer,
  Building2,
  FileText,
  AlertCircle,
  Layers,
  Check,
  DollarSign,
  Calendar,
} from 'lucide-react';

interface ReceiptFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (receipt: ReceiptData, andPrint?: boolean) => void;
  initialData?: ReceiptData | null;
  meetings?: Array<{
    id: string;
    titleTh: string;
    date: string;
    location: string;
  }>;
}

export function ReceiptFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  meetings = [],
}: ReceiptFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [selectedTemplate, setSelectedTemplate] = useState<1 | 2 | 3>(1);
  const [nameError, setNameError] = useState<string | null>(null);

  const [formData, setFormData] = useState<ReceiptData>(() => {
    return initialData || {
      id: '1',
      receiptNo: generateReceiptNo(new Date(), DEFAULT_RECEIPT_START_SEQ),
      receiptDate: new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      purposeText: 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569',
      payerType: 'company',
      payerName: '',
      branchName: 'สำนักงานแห่งใหญ่',
      payerAddressLine1: '',
      payerAddressLine2: '',
      payerPhone: '',
      payerTaxId: '',
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: 'ค่าลงทะเบียน',
          subDetails: [
            'การประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
            'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
            'จัดขึ้นวันที่ 20-21-22 ตุลาคม  2569',
            'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
          ],
          amount: 3500,
        },
      ],
      totalAmount: 3500,
      payerSignerName: '',
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: 'เหรัญญิก / ผู้รับเงิน',
      preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: 'ผู้จัดทำ',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    };
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch active settings on open to use the latest template configurations
  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/settings')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data) {
            setSettings(json.data);
            if (!initialData) {
              setFormData((prev) => ({
                ...prev,
                associationNameTh: json.data.association_name_th || DEFAULT_ASSOCIATION_INFO.nameTh,
                associationNameEn: json.data.association_name_en || DEFAULT_ASSOCIATION_INFO.nameEn,
                associationAddress: json.data.association_address || DEFAULT_ASSOCIATION_INFO.address,
                associationContact: json.data.association_contact || DEFAULT_ASSOCIATION_INFO.contact,
                associationTaxId: json.data.association_tax_id || DEFAULT_ASSOCIATION_INFO.taxId,
                authorizedSignerName: json.data.receipt_authorized_signer || prev.authorizedSignerName,
                authorizedSignerRole: json.data.receipt_authorized_role || prev.authorizedSignerRole,
                preparedByName: json.data.receipt_prepared_by || prev.preparedByName,
                preparedByRole: json.data.receipt_prepared_role || prev.preparedByRole,
              }));
              applyTemplate(1, json.data, '');
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen, initialData]);

  // Keep state updated if initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setNameError(null);
    }
  }, [initialData]);

  if (!isOpen || !mounted) return null;

  const applyTemplate = (
    templateType: 1 | 2 | 3,
    activeSettings?: SystemSettings,
    currentPayerName?: string
  ) => {
    setSelectedTemplate(templateType);
    const cfg = activeSettings || settings;
    const m = (formData.meetingId ? meetings.find((mtg) => mtg.id === formData.meetingId) : null) || meetings[0];
    const dateStr = m ? m.date : '20-22 ตุลาคม 2569';
    const locationStr = m ? m.location : 'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ';
    const pName = currentPayerName !== undefined ? currentPayerName : formData.payerName || '';

    let title = '';
    let purposeText = '';
    let subDetails: string[] = [];
    let amount = 0;

    if (templateType === 1) {
      title = cfg.receipt_tpl1_title || 'ค่าลงทะเบียน';
      purposeText = cfg.receipt_tpl1_purpose || 'ได้รับเงินค่าลงทะเบียน ประจำปี 2569';
      amount = Number(cfg.receipt_tpl1_amount) || 3500;
      const baseLines = (cfg.receipt_tpl1_details || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      subDetails = [
        ...baseLines,
        `จัดขึ้นวันที่ ${dateStr}`,
        locationStr,
        pName,
      ].filter(Boolean);
    } else if (templateType === 2) {
      title = cfg.receipt_tpl2_title || 'ค่าสมัครสมาชิก';
      purposeText = cfg.receipt_tpl2_purpose || 'ได้รับเงินค่าสมัครสมาชิกสมาคมฯ ประจำปี 2569';
      amount = Number(cfg.receipt_tpl2_amount) || 1000;
      const baseLines = (cfg.receipt_tpl2_details || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      subDetails = [
        ...baseLines,
        pName || '...................',
      ].filter(Boolean);
    } else if (templateType === 3) {
      title = cfg.receipt_tpl3_title || 'ค่าสนับสนุนการประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569';
      purposeText = cfg.receipt_tpl3_purpose || 'ได้รับเงินสนับสนุน ประจำปี 2569';
      amount = Number(cfg.receipt_tpl3_amount) || 50000;
      const baseLines = (cfg.receipt_tpl3_details || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      subDetails = [
        ...baseLines,
        `จัดขึ้นวันที่ ${m ? m.date : '20-22 ตุลาคม 2569'}`,
        locationStr,
        pName,
      ].filter(Boolean);
    }

    const nextItems: ReceiptItemLine[] = [
      {
        id: `item-${Date.now()}`,
        itemNumber: 1,
        title,
        subDetails,
        amount,
      },
    ];

    setFormData((prev) => ({
      ...prev,
      purposeText,
      items: nextItems,
      totalAmount: amount,
      associationNameTh: cfg.association_name_th || DEFAULT_ASSOCIATION_INFO.nameTh,
      associationNameEn: cfg.association_name_en || DEFAULT_ASSOCIATION_INFO.nameEn,
      associationAddress: cfg.association_address || DEFAULT_ASSOCIATION_INFO.address,
      associationContact: cfg.association_contact || DEFAULT_ASSOCIATION_INFO.contact,
      associationTaxId: cfg.association_tax_id || DEFAULT_ASSOCIATION_INFO.taxId,
      authorizedSignerName: cfg.receipt_authorized_signer || prev.authorizedSignerName,
      authorizedSignerRole: cfg.receipt_authorized_role || prev.authorizedSignerRole,
      preparedByName: cfg.receipt_prepared_by || prev.preparedByName,
      preparedByRole: cfg.receipt_prepared_role || prev.preparedByRole,
    }));
  };

  const handlePayerNameChange = (val: string) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      if (nextItems.length > 0 && nextItems[0].subDetails) {
        const subs = [...nextItems[0].subDetails];
        if (subs.length > 0) {
          subs[subs.length - 1] = val;
        }
        nextItems[0] = { ...nextItems[0], subDetails: subs };
      }
      return {
        ...prev,
        payerName: val,
        items: nextItems,
      };
    });
    if (val.trim()) {
      setNameError(null);
    }
  };

  const handleAmountChange = (val: number) => {
    const nextItems = [...formData.items];
    if (nextItems.length > 0) {
      nextItems[0] = { ...nextItems[0], amount: val };
    }
    setFormData((prev) => ({
      ...prev,
      items: nextItems,
      totalAmount: val,
      thaiBahtTextOverride: undefined,
    }));
  };

  const handleSubmit = (andPrint: boolean = false) => {
    // บังคับใส่ชื่อผู้ชำระเงิน / ชื่อบริษัท / หน่วยงาน
    if (!formData.payerName || !formData.payerName.trim()) {
      setNameError('กรุณากรอกชื่อผู้ชำระเงิน / ชื่อบริษัท / หน่วยงาน (จำเป็นต้องระบุ)');
      const el = document.getElementById('receipt-payer-name-input');
      if (el) el.focus();
      return;
    }
    setNameError(null);
    onSave(formData, andPrint);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center p-3 sm:p-6 animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? 'แก้ไขใบเสร็จรับเงิน' : 'ออกใบเสร็จรับเงิน'}
              </h2>
              <p className="text-xs text-blue-100">
                สมาคมเวชศาสตร์การเจริญพันธุ์ไทย
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-800">

          {/* ─── 1. ตัวเลือกตามรูปแบบต่างๆ (เลือกแค่รูปแบบ) ────── */}
          <div className="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4.5 h-4.5 text-indigo-700" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                เลือกรูปแบบใบเสร็จรับเงิน
              </span>
            </div>

            {/* 3 Clean Template Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => applyTemplate(1)}
                className={`py-3 px-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedTemplate === 1
                    ? 'bg-[#4338ca] border-[#4338ca] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    selectedTemplate === 1 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    1
                  </span>
                  <span className="text-xs font-bold truncate">
                    {settings.receipt_tpl1_name || 'ค่าลงทะเบียน'}
                  </span>
                </div>
                {selectedTemplate === 1 && (
                  <Check className="w-4 h-4 text-white shrink-0 ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={() => applyTemplate(2)}
                className={`py-3 px-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedTemplate === 2
                    ? 'bg-[#4338ca] border-[#4338ca] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    selectedTemplate === 2 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    2
                  </span>
                  <span className="text-xs font-bold truncate">
                    {settings.receipt_tpl2_name || 'ค่าสมัครสมาชิก'}
                  </span>
                </div>
                {selectedTemplate === 2 && (
                  <Check className="w-4 h-4 text-white shrink-0 ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={() => applyTemplate(3)}
                className={`py-3 px-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  selectedTemplate === 3
                    ? 'bg-[#4338ca] border-[#4338ca] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    selectedTemplate === 3 ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    3
                  </span>
                  <span className="text-xs font-bold truncate">
                    {settings.receipt_tpl3_name || 'ค่าสนับสนุน'}
                  </span>
                </div>
                {selectedTemplate === 3 && (
                  <Check className="w-4 h-4 text-white shrink-0 ml-1" />
                )}
              </button>
            </div>
          </div>

          {/* ─── 2. ข้อมูลเอกสารใบเสร็จ (เลขที่ และ วันที่ในใบเสร็จ) ─── */}
          <div className="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-indigo-700" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                ข้อมูลเลขที่และวันที่ในใบเสร็จ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Receipt No */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลขที่ใบเสร็จรับเงิน (Receipt No.)
                </label>
                <input
                  type="text"
                  value={formData.receiptNo}
                  onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
                  placeholder="เช่น 2569/02-108"
                  className="w-full px-4 py-2.5 text-sm font-mono font-bold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
                />
              </div>

              {/* Receipt Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  วันที่ออกใบเสร็จ (Receipt Date) <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.receiptDate}
                    onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                    placeholder="เช่น 18 กันยายน 2569"
                    className="flex-1 px-4 py-2.5 text-sm font-medium bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
                    required
                  />
                  <div className="relative shrink-0">
                    <input
                      type="date"
                      onChange={(e) => {
                        if (e.target.value) {
                          const d = new Date(e.target.value);
                          if (!isNaN(d.getTime())) {
                            const thaiDateStr = d.toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            });
                            setFormData({ ...formData, receiptDate: thaiDateStr });
                          }
                        }
                      }}
                      className="w-10 h-10.5 px-2 bg-white border border-slate-200 rounded-2xl text-slate-600 cursor-pointer hover:border-indigo-500 transition opacity-80 hover:opacity-100"
                      title="เลือกจากปฏิทิน"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── 3. ข้อมูลผู้ชำระเงิน / บริษัท / หน่วยงาน (ตามรูปเป๊ะๆ 100%) ─── */}
          <div className="bg-slate-50/80 p-5 sm:p-6 rounded-3xl border border-slate-200/90 space-y-4 shadow-xs">
            {/* Header with Icon & Right Toggle Pill */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Building2 className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-slate-800">
                  ข้อมูลผู้ชำระเงิน / บริษัท / หน่วยงาน
                </h3>
              </div>

              {/* Toggle Pill */}
              <div className="inline-flex items-center p-1 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, payerType: 'company', branchName: formData.branchName || 'สำนักงานแห่งใหญ่' });
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    formData.payerType === 'company'
                      ? 'bg-[#4338ca] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  นิติบุคคล / บริษัท
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, payerType: 'individual', branchName: '' });
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    formData.payerType === 'individual'
                      ? 'bg-[#4338ca] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  บุคคลธรรมดา
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {nameError && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center gap-2.5 text-xs font-bold text-rose-700 animate-fade-in shadow-2xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{nameError}</span>
              </div>
            )}

            {/* Row 1: Name & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ชื่อผู้ชำระเงิน / ชื่อบริษัท / หน่วยงาน <span className="text-rose-600 font-bold">*</span>
                </label>
                <input
                  id="receipt-payer-name-input"
                  type="text"
                  value={formData.payerName}
                  onChange={(e) => handlePayerNameChange(e.target.value)}
                  placeholder={formData.payerType === 'company' ? 'เช่น บริษัท ออร์กานอน (ประเทศไทย) จำกัด' : 'เช่น นพ. วรวัฒน์ เกียรติอนันต์'}
                  className={`w-full px-4 py-2.5 text-sm bg-white border rounded-2xl focus:outline-none focus:ring-2 transition ${
                    nameError
                      ? 'border-rose-500 ring-2 ring-rose-200 focus:border-rose-600'
                      : 'border-slate-200 focus:border-indigo-600 focus:ring-indigo-100'
                  }`}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  สาขา
                </label>
                <input
                  type="text"
                  value={formData.branchName || ''}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  placeholder="สำนักงานแห่งใหญ่"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            {/* Row 2: Address Line 1 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                ที่อยู่บรรทัดที่ 1 (เลขที่ อาคาร ชั้น ห้อง ซอย ถนน แขวง เขต)
              </label>
              <input
                type="text"
                value={formData.payerAddressLine1}
                onChange={(e) => setFormData({ ...formData, payerAddressLine1: e.target.value })}
                placeholder="เช่น เลขที่ 88 อาคารเดอะปาร์ค ชั้นที่ 7 ฝั่งอีสต์วิง ห้องเลขที่ 07-101 ถนนรัชดาภิเษก แขวงคลองเตย เขตคลองเตย"
                className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
              />
            </div>

            {/* Row 3: City/Postal, Phone, Tax ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  จังหวัด / รหัสไปรษณีย์
                </label>
                <input
                  type="text"
                  value={formData.payerAddressLine2}
                  onChange={(e) => setFormData({ ...formData, payerAddressLine2: e.target.value })}
                  placeholder="เช่น กรุงเทพมหานคร 10110"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="text"
                  value={formData.payerPhone || ''}
                  onChange={(e) => setFormData({ ...formData, payerPhone: e.target.value })}
                  placeholder="เช่น +662-257-2500"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  เลขประจำตัวผู้เสียภาษี
                </label>
                <input
                  type="text"
                  value={formData.payerTaxId || ''}
                  onChange={(e) => setFormData({ ...formData, payerTaxId: e.target.value })}
                  placeholder="เช่น 0105563092355"
                  className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition font-mono"
                />
              </div>
            </div>

            {/* Row 4: Amount Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                จำนวนเงิน (บาท) <span className="text-rose-600 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={formData.totalAmount || ''}
                  onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder="เช่น 3500"
                  className="w-full px-4 py-2.5 text-sm font-black font-mono text-slate-900 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition"
                  required
                />
                <span className="absolute right-4 top-2.5 text-xs font-bold text-slate-400">
                  THB (บาท)
                </span>
              </div>
              <p className="text-[11px] text-indigo-700 font-medium mt-1">
                ({thaiBahtText(formData.totalAmount || 0)})
              </p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              className="px-5 py-2.5 text-sm font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 text-blue-600" />
              <span>บันทึกใบเสร็จ</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              className="px-5 py-2.5 text-sm font-bold text-white bg-[#0026b3] hover:bg-[#001f94] shadow-md shadow-blue-500/20 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>บันทึกและสั่งพิมพ์ทันที</span>
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
