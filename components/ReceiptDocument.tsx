'use client';

import React from 'react';
import { ReceiptData, DEFAULT_ASSOCIATION_INFO } from '@/types/receipt';
import { thaiBahtText } from '@/lib/thaiBahtText';

interface ReceiptDocumentProps {
  data: ReceiptData;
  className?: string;
  isPrintOnly?: boolean;
}

function isIndividualOrRegistration(data: ReceiptData): boolean {
  if (data.payerType === 'individual') return true;
  const purpose = (data.purposeText || '').toLowerCase();
  if (purpose.includes('ลงทะเบียน') || purpose.includes('สมัคร') || purpose.includes('สมาชิก')) {
    return true;
  }
  const hasRegItem = (data.items || []).some((it) => {
    const t = (it.title || '').toLowerCase();
    return t.includes('ลงทะเบียน') || t.includes('สมัคร') || t.includes('สมาชิก');
  });
  if (hasRegItem && data.payerType !== 'company') {
    return true;
  }
  return false;
}

function cleanPhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/^tel:\s*/i, '').trim();
}

export function ReceiptDocument({ data, className = '', isPrintOnly = false }: ReceiptDocumentProps) {
  const isIndividual = isIndividualOrRegistration(data);
  const formattedTotal = (data.totalAmount || 0).toLocaleString('th-TH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const bahtText = data.thaiBahtTextOverride || thaiBahtText(data.totalAmount || 0);

  return (
    <div
      className={`receipt-document bg-white text-black font-sarabun text-[15px] leading-relaxed mx-auto select-text ${className}`}
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '16mm 18mm 14mm 18mm',
        boxSizing: 'border-box',
        fontFamily: "var(--font-sarabun), 'Sarabun', 'TH Sarabun New', 'Angsana New', sans-serif",
      }}
    >
      {/* ─── Header: Association Logo & Info ─────────────────────────── */}
      <div className="relative flex items-start justify-center mb-4">
        {/* TSRM Logo on Left */}
        <div className="absolute left-0 top-0 w-24 h-24 flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tsrm-logoPNG.png"
            alt="TSRM Logo"
            className="w-22 h-22 object-contain"
            onError={(e) => {
              e.currentTarget.src = '/logoPNG.png';
            }}
          />
        </div>

        {/* Association Info (Center) */}
        <div className="text-center pl-16 pr-2 space-y-0.5">
          <h1 className="text-[21px] font-bold text-black tracking-tight leading-snug">
            {data.associationNameTh || DEFAULT_ASSOCIATION_INFO.nameTh}
          </h1>
          <p className="text-[13px] font-semibold tracking-wide text-black leading-tight">
            {data.associationNameEn || DEFAULT_ASSOCIATION_INFO.nameEn}
          </p>
          <p className="text-[12.5px] text-black leading-snug">
            {data.associationAddress || DEFAULT_ASSOCIATION_INFO.address}
          </p>
          <p className="text-[12px] text-black leading-snug">
            {data.associationContact || DEFAULT_ASSOCIATION_INFO.contact}
          </p>
          <p className="text-[12.5px] text-black leading-snug">
            เลขประจำตัวผู้เสียภาษี {data.associationTaxId || DEFAULT_ASSOCIATION_INFO.taxId}
          </p>
        </div>
      </div>

      {/* ─── Document Title ─────────────────────────────────────────── */}
      <div className="text-center my-3">
        <h2 className="text-[25px] font-bold tracking-wide text-black">
          ใบเสร็จรับเงิน
        </h2>
      </div>

      {/* ─── Receipt Number & Date ───────────────────────────────────── */}
      <div className="flex justify-between items-baseline mb-3 text-[15px]">
        <div className="font-normal pl-4">
          <span>{data.receiptNo}</span>
        </div>
        <div className="text-right pr-4">
          <span>วันที่ {data.receiptDate}</span>
        </div>
      </div>

      {/* ─── Payer Information ───────────────────────────────────────── */}
      <div className="space-y-1 text-[15px] leading-relaxed mb-4 pl-8 pr-4">
        <p className="indent-10">
          <span className="font-normal">สมาคมเวชศาสตร์การเจริญพันธุ์ไทย </span>
          <span>{data.purposeText || 'ได้รับเงินสนับสนุน ประจำปี 2569'}</span>
        </p>
        <p className="flex items-baseline">
          <span className="font-normal mr-4 shrink-0">จาก</span>
          <span className="font-bold text-slate-950">
            {data.payerName}
          </span>
          {!isIndividual && data.branchName ? <span className="ml-3 font-normal">{data.branchName}</span> : null}
        </p>
        {!isIndividual && data.payerAddressLine1 && (
          <p className="font-normal">
            {data.payerAddressLine1}
          </p>
        )}
        {!isIndividual && (data.payerAddressLine2 || data.payerPhone || data.payerTaxId) ? (
          <p className="font-normal">
            {data.payerAddressLine2 ? `${data.payerAddressLine2} ` : ''}
            {data.payerPhone ? `${cleanPhone(data.payerPhone)} ` : ''}
            {data.payerTaxId ? `เลขประจำตัวผู้เสียภาษี ${data.payerTaxId}` : ''}
          </p>
        ) : null}
      </div>

      {/* ─── Items Table ────────────────────────────────────────────── */}
      <div className="border border-black mb-2.5">
        {/* Table Header */}
        <div className="flex border-b border-black text-center font-normal text-[15px] bg-white">
          <div className="flex-1 py-1 px-3 text-center border-r border-black font-semibold">
            รายการ
          </div>
          <div className="w-48 py-1 px-3 text-center font-semibold">
            จำนวนเงิน ( บาท)
          </div>
        </div>

        {/* Table Body */}
        <div className="flex min-h-[220px]">
          {/* Left Column: Items */}
          <div className="flex-1 p-3 border-r border-black text-[15px] space-y-2">
            {data.items.map((item, index) => (
              <div key={item.id || index} className="space-y-1">
                <div className="font-normal flex items-baseline">
                  <span className="w-6 shrink-0">{item.itemNumber || index + 1}</span>
                  <span>{item.title}</span>
                </div>
                {item.subDetails && item.subDetails.length > 0 && (
                  <div className="pl-6 space-y-0.5 text-[14.5px]">
                    {item.subDetails.map((line, subIdx) => {
                      const isPayerName = Boolean(data.payerName && line.trim() === data.payerName.trim());
                      return (
                        <p
                          key={subIdx}
                          className={isPayerName ? 'font-bold text-slate-950 pt-0.5' : 'text-black'}
                        >
                          {line}
                        </p>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Right Column: Amount */}
          <div className="w-48 p-3 text-right text-[15px] pr-4">
            {data.items.map((item, index) => (
              <div key={item.id || index} className="font-normal">
                {(item.amount || 0).toLocaleString('th-TH', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 2,
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Total Row */}
        <div className="flex border-t border-black text-[15px]">
          <div className="flex-1 py-1.5 px-4 font-semibold border-r border-black text-left">
            จำนวนเงิน
          </div>
          <div className="w-48 py-1.5 pr-4 text-right font-semibold">
            {formattedTotal}
          </div>
        </div>
      </div>

      {/* ─── Amount in Thai Words ────────────────────────────────────── */}
      <div className="flex items-center text-[15px] mb-8 font-normal pl-10">
        <span className="mr-4">(ตัวอักษร)</span>
        <span>({bahtText})</span>
      </div>

      {/* ─── Signatures Block ────────────────────────────────────────── */}
      <div className="mt-8 space-y-6 text-[15px] pl-10 pr-6">
        {/* Row 1: Payer Signature */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p>
              ลงชื่อ..................................................................
              {data.payerSignerRole || 'ผู้จ่ายเงิน'}
            </p>
            <p className="pl-2">
              ( {data.payerSignerName || '.........................................................................'} )
            </p>
          </div>
          <div className="text-right pb-1">
            <span>ลงวันที่.......................</span>
          </div>
        </div>

        {/* Row 2: Authorized Signer */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p>
              ลงชื่อ..................................................................
              {data.authorizedSignerRole || 'เหรัญญิก / ผู้รับเงิน'}
            </p>
            <p className="pl-2">
              (&nbsp;
              {data.authorizedSignerName ? `.............${data.authorizedSignerName}...............` : '.........................................................................'}
              &nbsp;)
            </p>
          </div>
          <div className="text-right pb-1">
            <span>ลงวันที่.......................</span>
          </div>
        </div>

        {/* Row 3: Prepared By */}
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p>
              ลงชื่อ................................................................
              {data.preparedByRole || 'ผู้จัดทำ'}
            </p>
            <p className="pl-2">
              (&nbsp;
              {data.preparedByName ? `..${data.preparedByName} ....` : '.........................................................................'}
              &nbsp;)
            </p>
          </div>
          <div className="text-right pb-1">
            <span>ลงวันที่.......................</span>
          </div>
        </div>
      </div>
    </div>
  );
}
