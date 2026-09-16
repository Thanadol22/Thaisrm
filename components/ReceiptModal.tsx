'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ReceiptData } from '@/types/receipt';
import { ReceiptDocument } from './ReceiptDocument';
import { printReceipt } from '@/lib/printReceipt';
import {
  Printer,
  X,
  Edit3,
  Check,
  Copy,
  Download,
  Share2,
  FileText,
  Building,
  Calendar,
  DollarSign
} from 'lucide-react';

interface ReceiptModalProps {
  receipt: ReceiptData | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (receipt: ReceiptData) => void;
}

export function ReceiptModal({ receipt, isOpen, onClose, onEdit }: ReceiptModalProps) {
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !receipt || !mounted) return null;

  const handlePrint = () => {
    printReceipt(receipt);
  };

  const handleCopyNo = () => {
    if (receipt?.receiptNo) {
      navigator.clipboard.writeText(receipt.receiptNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return createPortal(
    <div className="receipt-modal-backdrop fixed inset-0 z-[9999] overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6 print:p-0 print:bg-white print:static print:inset-auto print:overflow-visible print:block animate-fade-in">
      {/* ─── Printable Area container ──────────────────────────────── */}
      <div className="receipt-modal-inner relative w-full max-w-4xl bg-transparent flex flex-col items-center my-auto print:w-full print:max-w-none print:my-0 print:static print:block">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="no-print w-full max-w-[210mm] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-3 sm:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0026b3] flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">
                  ใบเสร็จรับเงิน #{receipt.receiptNo}
                </h3>
                <button
                  onClick={handleCopyNo}
                  className="text-xs px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 transition-colors"
                  title="คัดลอกเลขที่ใบเสร็จ"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {receipt.payerName} • ฿{receipt.totalAmount.toLocaleString('th-TH')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(receipt);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                <span>แก้ไขข้อมูล</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0026b3] hover:bg-[#001f94] shadow-md shadow-[#0026b3]/20 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#4ade80]" />
              <span>พิมพ์ใบเสร็จ / PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container with drop-shadow simulating actual A4 */}
        <div className="w-full flex justify-center overflow-x-auto pb-6 print:pb-0 print:overflow-visible">
          <div className="receipt-print-wrapper bg-white shadow-2xl rounded-sm print:shadow-none print:rounded-none">
            <ReceiptDocument data={receipt} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
