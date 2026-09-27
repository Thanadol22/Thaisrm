'use client';

import React, { useRef, useState } from 'react';
import {
  Upload,
  Eye,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  RotateCw,
  Check,
} from 'lucide-react';

interface SharedSlipResubmitSectionProps {
  isInfoMode: boolean;
  oldSlipUrl: string;
  newSlipFile: File | null;
  newSlipUrl: string | null;
  newSlipName: string;
  submitting: boolean;
  onSlipFileChange: (file: File | null, url: string | null, fileName: string) => void;
  onSubmit: () => void;
}

export function SharedSlipResubmitSection({
  isInfoMode,
  oldSlipUrl,
  newSlipFile,
  newSlipUrl,
  newSlipName,
  submitting,
  onSlipFileChange,
  onSubmit,
}: SharedSlipResubmitSectionProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const infoFileInputRef = useRef<HTMLInputElement | null>(null);
  const [previewOldSlip, setPreviewOldSlip] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onSlipFileChange(file, url, file.name);
    }
  };

  const handleRemoveNewSlip = () => {
    onSlipFileChange(null, null, '');
  };

  const hasOldSlip = Boolean(oldSlipUrl && oldSlipUrl !== 'PAY_LATER' && oldSlipUrl !== 'GROUP_MEMBERSHIP');

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          {isInfoMode ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <Upload className="w-4 h-4 text-[#0026b3]" />
          )}
          <span>
            {isInfoMode
              ? 'หลักฐานการโอนเงิน (สลิปเดิม)'
              : 'แบบฟอร์มแนบหลักฐานสลิปการโอนเงินใหม่'}
          </span>
        </h3>

        {hasOldSlip && (
          <button
            type="button"
            onClick={() => setPreviewOldSlip(!previewOldSlip)}
            className="text-xs font-bold text-[#0026b3] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{previewOldSlip ? 'ซ่อนหลักฐานเดิม' : 'ดูหลักฐานเดิม'}</span>
          </button>
        )}
      </div>

      {/* Info Mode Status Banner */}
      {isInfoMode && (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-emerald-900 font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <p className="font-black text-xs text-emerald-950">หลักฐานการโอนเงินถูกต้องแล้ว</p>
              <p className="text-[11px] text-emerald-700/90 font-normal mt-0.5">
                ระบบจะใช้หลักฐานการโอนเงินเดิมของท่าน ท่านเพียงแก้ไขข้อมูลในแบบฟอร์มด้านบนให้ถูกต้อง แล้วกดยืนยันได้ทันที
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Preview of Old Slip */}
      {previewOldSlip && hasOldSlip && (
        <div className="p-3 bg-slate-100 rounded-2xl border border-slate-200 space-y-2 animate-fade-in">
          <div className="flex justify-between items-center text-xs font-bold text-slate-700">
            <span>สลิปเดิมที่เคยแนบไว้:</span>
          </div>
          <div className="flex justify-center bg-slate-900 rounded-xl overflow-hidden max-h-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={oldSlipUrl} alt="Old Slip" className="max-h-56 object-contain" />
          </div>
        </div>
      )}

      {/* New Slip Display / Upload Section */}
      {newSlipUrl ? (
        <div className="space-y-3 pt-2">
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 max-h-64 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={newSlipUrl} alt="New Slip" className="max-h-64 object-contain" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 truncate font-semibold">{newSlipName}</span>
            <button
              type="button"
              onClick={handleRemoveNewSlip}
              className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isInfoMode ? 'ยกเลิกรูปใหม่' : 'เปลี่ยนรูปสลิป'}</span>
            </button>
          </div>
        </div>
      ) : isInfoMode ? (
        <div className="pt-1">
          <input
            ref={infoFileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => infoFileInputRef.current?.click()}
            className="text-[12px] text-slate-600 hover:text-[#0026b3] underline font-semibold cursor-pointer flex items-center gap-1.5 py-1"
          >
            <Upload className="w-3.5 h-3.5 text-[#0026b3]" />
            <span>ต้องการแนบหลักฐานการโอนเงินใหม่เพิ่มเติม คลิกที่นี่เพื่อเลือกภาพ</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <input
            id="resubmit-slip-upload-input"
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="resubmit-slip-upload-input"
            className="border-2 border-dashed border-rose-300 hover:border-[#0026b3] rounded-3xl p-7 flex flex-col items-center justify-center cursor-pointer bg-rose-50/30 hover:bg-blue-50/30 transition group select-none active:scale-[0.99] block text-center"
          >
            <Upload className="w-8 h-8 text-rose-500 group-hover:text-[#0026b3] group-hover:scale-110 transition mb-2 mx-auto" />
            <p className="text-sm font-bold text-slate-800 group-hover:text-[#0026b3] text-center">
              แตะเพื่อเลือกภาพสลิปการโอนเงินใหม่
            </p>
            <p className="text-xs text-slate-400 mt-1 text-center">
              รองรับไฟล์รูปภาพ JPG, PNG, HEIC หรือ PDF (ขนาดไม่เกิน 10MB)
            </p>
          </label>
        </div>
      )}

      {/* Confirmation Submit Button */}
      <button
        type="button"
        disabled={submitting || (!isInfoMode && !newSlipUrl && !newSlipFile)}
        onClick={onSubmit}
        className={`w-full py-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide flex items-center justify-center gap-2 shadow-lg transition mt-4 ${
          isInfoMode
            ? !submitting
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer active:scale-98'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            : (newSlipUrl || newSlipFile) && !submitting
            ? 'bg-gradient-to-r from-[#0026b3] to-[#0055ff] hover:from-[#001f8f] hover:to-[#0040cc] text-white cursor-pointer active:scale-98'
            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
        }`}
      >
        {submitting ? (
          <>
            <RotateCw className="w-4 h-4 animate-spin" />
            <span>กำลังบันทึกข้อมูลและส่งตรวจสอบ...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4" />
            <span>
              {isInfoMode
                ? 'ยืนยันบันทึกข้อมูลที่แก้ไขและส่งตรวจสอบใหม่'
                : 'ยืนยันการแนบสลิปใหม่และส่งตรวจสอบ'}
            </span>
          </>
        )}
      </button>
    </div>
  );
}
