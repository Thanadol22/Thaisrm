'use client';

import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, X, FileText } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface SlipUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slipData: { fileName: string; fileUrl: string }) => void;
  bankAccount: string;
}

export function SlipUploadModal({ isOpen, onClose, onSuccess, bankAccount }: SlipUploadModalProps) {
  const { t } = useLanguage();
  const [uploadedSlip, setUploadedSlip] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedSlip(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmUpload = () => {
    if (!uploadedSlip) {
      alert(t.slipModal.selectFileAlert);
      return;
    }
    setUploadSuccess(true);
    setTimeout(() => {
      onSuccess({
        fileName: uploadedFileName || 'slip-transfer.png',
        fileUrl: uploadedSlip
      });
      onClose();
      setUploadSuccess(false);
      setUploadedSlip(null);
      setUploadedFileName('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-scale-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {uploadSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-[#4ade80]/20 text-[#00a950] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">{t.slipModal.successTitle}</h3>
            <p className="text-sm text-slate-600">
              {t.slipModal.successSubtitle}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-xl font-black text-slate-900">{t.slipModal.modalTitle}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {t.slipModal.transferTo} <span className="font-bold text-[#0026b3]">{bankAccount}</span> <span className="font-bold text-[#00a950]">{t.slipModal.kasikornBank}</span> {t.slipModal.amountDue}
              </p>
            </div>

            {/* Drag and drop / File Picker Box */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-[#0026b3] bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[160px]"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {uploadedSlip ? (
                <div className="space-y-2">
                  <img
                    src={uploadedSlip}
                    alt="Slip Preview"
                    className="max-h-40 max-w-full rounded-xl object-contain shadow-md mx-auto"
                  />
                  {uploadedFileName && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-100 px-3 py-1 rounded-lg max-w-[280px] truncate mx-auto border border-slate-200">
                      <FileText className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                      <span className="truncate">{uploadedFileName}</span>
                    </div>
                  )}
                  <span className="text-xs text-[#0026b3] font-bold block">{t.slipModal.clickToChange}</span>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0026b3] flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-800">{t.slipModal.clickToSelect}</p>
                  <p className="text-xs text-slate-400 mt-1">{t.slipModal.supportedFormats}</p>
                </>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="w-1/2 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
              >
                {t.slipModal.cancelButton}
              </button>
              <button
                onClick={handleConfirmUpload}
                className="w-1/2 py-3.5 rounded-xl bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-sm shadow transition"
              >
                {t.slipModal.confirmButton}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
