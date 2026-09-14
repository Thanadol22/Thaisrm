'use client';

import React, { useState, useEffect } from 'react';
import { ReceiptData, ReceiptItemLine } from '@/types/receipt';
import { thaiBahtText } from '@/lib/thaiBahtText';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Save,
  Printer,
  Building,
  User,
  Calendar,
  DollarSign,
  FileText,
  Layers,
  MapPin
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
  const [formData, setFormData] = useState<ReceiptData>(() => {
    return initialData || {
      id: `REC-${Date.now()}`,
      receiptNo: `2569/03-${Math.floor(Math.random() * 900 + 100)}`,
      receiptDate: '10 มีนาคม 2569',
      purposeText: 'ได้รับเงินสนับสนุน ประจำปี 2569',
      payerType: 'company',
      payerName: '',
      branchName: 'สำนักงานแห่งใหญ่',
      payerAddressLine1: '',
      payerAddressLine2: 'กรุงเทพมหานคร 10110',
      payerPhone: '',
      payerTaxId: '',
      items: [
        {
          id: `item-${Date.now()}`,
          itemNumber: 1,
          title: 'ค่าลงทะเบียน',
          subDetails: [
            'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
            'จัดขึ้นวันที่ 10-12 มีนาคม 2569',
            'โรงแรมอีสติน แกรนด์ พญาไท กรุงเทพฯ',
          ],
          amount: 54000,
        },
      ],
      totalAmount: 54000,
      payerSignerName: '',
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: '',
      preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: 'ผู้จัดทำ',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    };
  });

  // Keep state updated if initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  if (!isOpen) return null;

  // Recalculate total amount whenever items change
  const calculateTotal = (items: ReceiptItemLine[]) => {
    return items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  };

  const handleItemChange = (index: number, field: keyof ReceiptItemLine, value: any) => {
    const nextItems = [...formData.items];
    nextItems[index] = { ...nextItems[index], [field]: value };
    const total = calculateTotal(nextItems);
    setFormData({
      ...formData,
      items: nextItems,
      totalAmount: total,
      thaiBahtTextOverride: undefined,
    });
  };

  const handleSubDetailChange = (itemIdx: number, subIdx: number, val: string) => {
    const nextItems = [...formData.items];
    const subDetails = [...(nextItems[itemIdx].subDetails || [])];
    subDetails[subIdx] = val;
    nextItems[itemIdx] = { ...nextItems[itemIdx], subDetails };
    setFormData({ ...formData, items: nextItems });
  };

  const handleAddSubDetail = (itemIdx: number) => {
    const nextItems = [...formData.items];
    const subDetails = [...(nextItems[itemIdx].subDetails || []), ''];
    nextItems[itemIdx] = { ...nextItems[itemIdx], subDetails };
    setFormData({ ...formData, items: nextItems });
  };

  const handleRemoveSubDetail = (itemIdx: number, subIdx: number) => {
    const nextItems = [...formData.items];
    const subDetails = (nextItems[itemIdx].subDetails || []).filter((_, i) => i !== subIdx);
    nextItems[itemIdx] = { ...nextItems[itemIdx], subDetails };
    setFormData({ ...formData, items: nextItems });
  };

  const handleAddItem = () => {
    const nextItems = [
      ...formData.items,
      {
        id: `item-${Date.now()}`,
        itemNumber: formData.items.length + 1,
        title: 'ค่าลงทะเบียน',
        subDetails: [],
        amount: 0,
      },
    ];
    setFormData({
      ...formData,
      items: nextItems,
      totalAmount: calculateTotal(nextItems),
    });
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    const nextItems = formData.items
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, itemNumber: idx + 1 }));
    setFormData({
      ...formData,
      items: nextItems,
      totalAmount: calculateTotal(nextItems),
    });
  };


  const handleSelectMeeting = (meetingId: string) => {
    const found = meetings.find((m) => m.id === meetingId);
    if (found) {
      const nextItems = [...formData.items];
      if (nextItems.length > 0) {
        nextItems[0] = {
          ...nextItems[0],
          title: 'ค่าลงทะเบียน',
          subDetails: [
            found.titleTh,
            `จัดขึ้นวันที่ ${found.date}`,
            found.location,
          ],
        };
      }
      setFormData({
        ...formData,
        meetingId: found.id,
        items: nextItems,
      });
    }
  };

  const handleSubmit = (andPrint: boolean = false) => {
    onSave(formData, andPrint);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex justify-center p-3 sm:p-6">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[90vh] border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {initialData ? 'แก้ไขใบเสร็จรับเงิน' : 'ออกใบเสร็จรับเงินใหม่ (THAISRM)'}
              </h2>
              <p className="text-xs text-blue-100">
                ฟอร์มมาตรฐานสมาคมเวชศาสตร์การเจริญพันธุ์ไทย (ตรงตามแบบ 100%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  id: `REC-${Date.now()}`,
                  receiptNo: '',
                  receiptDate: '',
                  purposeText: '',
                  payerType: 'individual',
                  payerName: '',
                  payerAddressLine1: '',
                  payerAddressLine2: '',
                  items: [{ id: 'item-1', itemNumber: 1, title: '', subDetails: [], amount: 0 }],
                  totalAmount: 0,
                  status: 'draft' as const,
                  createdAt: new Date().toISOString().split('T')[0],
                });
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-white/20 hover:bg-white/30 text-white rounded-xl backdrop-blur-md transition-all flex items-center gap-1.5 cursor-pointer"
              title="รีเซ็ตฟอร์มเป็นค่าว่าง"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>รีเซ็ตฟอร์ม</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
          {/* Row 1: Document Meta */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>ข้อมูลเอกสาร & การเชื่อมโยงการประชุม</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เลขที่ใบเสร็จ (Receipt No.) *
                </label>
                <input
                  type="text"
                  value={formData.receiptNo}
                  onChange={(e) => setFormData({ ...formData, receiptNo: e.target.value })}
                  placeholder="เช่น 2569/02-094"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  วันที่ในใบเสร็จ *
                </label>
                <input
                  type="text"
                  value={formData.receiptDate}
                  onChange={(e) => setFormData({ ...formData, receiptDate: e.target.value })}
                  placeholder="เช่น 10 มีนาคม 2569"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เลือกดึงข้อมูลจากการประชุม
                </label>
                <select
                  value={formData.meetingId || ''}
                  onChange={(e) => handleSelectMeeting(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="">-- กำหนดรายละเอียดเอง --</option>
                  {meetings.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.titleTh}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ข้อความวัตถุประสงค์ (ต่อท้ายชื่อสมาคมฯ)
              </label>
              <input
                type="text"
                value={formData.purposeText}
                onChange={(e) => setFormData({ ...formData, purposeText: e.target.value })}
                placeholder="เช่น ได้รับเงินสนับสนุน ประจำปี 2569 หรือ ได้รับเงินค่าลงทะเบียน ประจำปี 2569"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Row 2: Payer Info */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>ข้อมูลผู้ชำระเงิน / บริษัท / หน่วยงาน</span>
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payerType: 'company', branchName: 'สำนักงานแห่งใหญ่' })}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    formData.payerType === 'company'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  นิติบุคคล / บริษัท
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payerType: 'individual', branchName: '' })}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    formData.payerType === 'individual'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  บุคคลธรรมดา
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ชื่อผู้ชำระเงิน / ชื่อบริษัท / หน่วยงาน *
                </label>
                <input
                  type="text"
                  value={formData.payerName}
                  onChange={(e) => setFormData({ ...formData, payerName: e.target.value })}
                  placeholder="เช่น บริษัท ออร์กานอน (ประเทศไทย) จำกัด"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  สาขา
                </label>
                <input
                  type="text"
                  value={formData.branchName || ''}
                  onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                  placeholder="เช่น สำนักงานแห่งใหญ่"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ที่อยู่บรรทัดที่ 1 (เลขที่ อาคาร ชั้น ห้อง ซอย ถนน แขวง เขต)
              </label>
              <input
                type="text"
                value={formData.payerAddressLine1}
                onChange={(e) => setFormData({ ...formData, payerAddressLine1: e.target.value })}
                placeholder="เช่น เลขที่ 88 อาคารเดอะปาร์ค ชั้นที่ 7 ฝั่งอีสต์วิง ห้องเลขที่ 07-101 ถนนรัชดาภิเษก แขวงคลองเตย เขตคลองเตย"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  จังหวัด / รหัสไปรษณีย์
                </label>
                <input
                  type="text"
                  value={formData.payerAddressLine2}
                  onChange={(e) => setFormData({ ...formData, payerAddressLine2: e.target.value })}
                  placeholder="เช่น กรุงเทพมหานคร 10110"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เบอร์โทรศัพท์ (Tel)
                </label>
                <input
                  type="text"
                  value={formData.payerPhone || ''}
                  onChange={(e) => setFormData({ ...formData, payerPhone: e.target.value })}
                  placeholder="เช่น +662-257-2500"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  เลขประจำตัวผู้เสียภาษี (Tax ID)
                </label>
                <input
                  type="text"
                  value={formData.payerTaxId || ''}
                  onChange={(e) => setFormData({ ...formData, payerTaxId: e.target.value })}
                  placeholder="เช่น 0105563092355"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Items & Amounts */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>รายการและจำนวนเงิน</span>
              </h3>

              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรายการ</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, itemIdx) => (
                <div
                  key={item.id || itemIdx}
                  className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                        {item.itemNumber || itemIdx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-700">รายการที่ {itemIdx + 1}</span>
                    </div>

                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(itemIdx)}
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        ชื่อรายการหลัก
                      </label>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => handleItemChange(itemIdx, 'title', e.target.value)}
                        placeholder="เช่น ค่าลงทะเบียน"
                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        จำนวนเงิน (บาท) *
                      </label>
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => handleItemChange(itemIdx, 'amount', parseFloat(e.target.value) || 0)}
                        placeholder="54000"
                        className="w-full px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-right"
                        required
                      />
                    </div>
                  </div>

                  {/* Sub Details (e.g. topic, date, venue) */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-500">
                        รายละเอียดย่อยใต้รายการ (เช่น ชื่องาน, วันที่จัด, สถานที่)
                      </label>
                      <button
                        type="button"
                        onClick={() => handleAddSubDetail(itemIdx)}
                        className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> เพิ่มบรรทัดย่อย
                      </button>
                    </div>

                    {(item.subDetails || []).map((sub, subIdx) => (
                      <div key={subIdx} className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs">•</span>
                        <input
                          type="text"
                          value={sub}
                          onChange={(e) => handleSubDetailChange(itemIdx, subIdx, e.target.value)}
                          placeholder="เช่น ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์ หรือ โรงแรมอีสติน แกรนด์ พญาไท"
                          className="flex-1 px-3 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSubDetail(itemIdx, subIdx)}
                          className="p-1 text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Total & Thai Words */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-emerald-900">รวมจำนวนเงินทั้งสิ้น</span>
                <span className="text-xl font-extrabold text-emerald-700 font-mono">
                  ฿{formData.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-800">
                <span className="font-semibold text-emerald-900">ตัวอักษร:</span>
                <span className="font-medium bg-white px-2 py-0.5 rounded border border-emerald-200">
                  {formData.thaiBahtTextOverride || thaiBahtText(formData.totalAmount)}
                </span>
              </div>
            </div>
          </div>

          {/* Row 4: Signers Information */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <span>ข้อมูลผู้ลงนาม (3 ตำแหน่ง)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  1. ผู้จ่ายเงิน (ตำแหน่ง/บทบาท)
                </label>
                <input
                  type="text"
                  value={formData.payerSignerRole || 'ผู้จ่ายเงิน'}
                  onChange={(e) => setFormData({ ...formData, payerSignerRole: e.target.value })}
                  placeholder="ผู้จ่ายเงิน"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 mb-2"
                />
                <input
                  type="text"
                  value={formData.payerSignerName || ''}
                  onChange={(e) => setFormData({ ...formData, payerSignerName: e.target.value })}
                  placeholder="ชื่อผู้จ่าย (หากมี หรือเว้นว่างให้เซ็น)"
                  className="w-full px-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  2. ผู้รับเงิน / เหรัญญิก
                </label>
                <input
                  type="text"
                  value={formData.authorizedSignerName}
                  onChange={(e) => setFormData({ ...formData, authorizedSignerName: e.target.value })}
                  placeholder="เช่น แพทย์หญิงพิมพกา ชวนะเวสน์"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  3. ผู้จัดทำ
                </label>
                <input
                  type="text"
                  value={formData.preparedByName}
                  onChange={(e) => setFormData({ ...formData, preparedByName: e.target.value })}
                  placeholder="เช่น ปณตพร ภวภูตานนท์ ณ มหาสารคาม"
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold mb-2"
                />
              </div>
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
              className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>บันทึกและสั่งพิมพ์ทันที</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
