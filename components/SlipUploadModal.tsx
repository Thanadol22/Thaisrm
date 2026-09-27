'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, CheckCircle2, X, FileText, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { uploadImageToStorage } from '@/lib/blobUpload';

interface SlipUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (slipData: { fileName: string; fileUrl: string }) => void;
  bankAccount: string;
  bankName?: string;
  amountDueText?: string;
}

export function SlipUploadModal({ isOpen, onClose, onSuccess, bankAccount, bankName, amountDueText }: SlipUploadModalProps) {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadedFileName(file.name);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile && !previewUrl) {
      alert(t.slipModal.selectFileAlert);
      return;
    }

    try {
      setUploading(true);

      let finalUrl = previewUrl || '';
      if (selectedFile) {
        const result = await uploadImageToStorage(selectedFile, 'slips');
        finalUrl = result.url;
      }

      setUploadSuccess(true);
      setTimeout(() => {
        onSuccess({
          fileName: uploadedFileName || 'slip-transfer.jpg',
          fileUrl: finalUrl,
        });
        onClose();
        setUploadSuccess(false);
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploadedFileName('');
        setUploading(false);
      }, 1000);
    } catch (err: any) {
      console.error('Failed to upload slip:', err);
      alert('เกิดข้อผิดพลาดในการอัปโหลดสลิป กรุณาลองใหม่อีกครั้ง');
      setUploading(false);
    }
  };

  const inputId = 'slip-modal-upload-input';

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white text-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative animate-scale-up">
        <button
          onClick={onClose}
          disabled={uploading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition disabled:opacity-50"
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
                {t.slipModal.transferTo} <span className="font-bold text-[#0026b3]">{bankAccount}</span> <span className="font-bold text-[#00a950]">{bankName ? `(${bankName})` : t.slipModal.kasikornBank}</span> {amountDueText || t.slipModal.amountDue}
              </p>
            </div>

            {/* Hidden Native File Input */}
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />

            {/* Preview Box or Drag & Drop Area */}
            {previewUrl ? (
              <div className="border-2 border-dashed border-[#0026b3]/30 bg-blue-50/40 rounded-2xl p-4 text-center">
                <div className="space-y-3">
                  <img
                    src={previewUrl}
                    alt="Slip Preview"
                    className="max-h-48 max-w-full rounded-xl object-contain shadow-md mx-auto"
                  />
                  {uploadedFileName && (
                    <div className="flex items-center justify-center gap-1.5 text-xs text-slate-700 font-medium bg-white px-3 py-1.5 rounded-lg max-w-[280px] truncate mx-auto border border-slate-200 shadow-2xs">
                      <FileText className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                      <span className="truncate">{uploadedFileName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-center gap-2 pt-1">
                    <label
                      htmlFor={inputId}
                      className="text-xs text-[#0026b3] font-bold bg-white hover:bg-blue-50 border border-blue-200 px-3.5 py-1.5 rounded-xl cursor-pointer transition shadow-2xs"
                    >
                      {t.slipModal.clickToChange}
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <label
                htmlFor={inputId}
                className={`border-2 border-dashed border-slate-300 hover:border-[#0026b3] bg-slate-50 hover:bg-blue-50/50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[160px] block select-none ${
                  uploading ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-[#0026b3] flex items-center justify-center mb-3 mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-800">{t.slipModal.clickToSelect}</p>
                <p className="text-xs text-slate-400 mt-1">{t.slipModal.supportedFormats}</p>
              </label>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={uploading}
                className="w-1/2 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
              >
                {t.slipModal.cancelButton}
              </button>
              <button
                onClick={handleConfirmUpload}
                disabled={uploading || (!selectedFile && !previewUrl)}
                className="w-1/2 py-3.5 rounded-xl bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] font-bold text-sm shadow transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังอัปโหลด...</span>
                  </>
                ) : (
                  t.slipModal.confirmButton
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
