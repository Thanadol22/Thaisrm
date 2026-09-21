'use client';

import React, { useState, useMemo } from 'react';
import { ReceiptData } from '@/types/receipt';
import { ReceiptModal } from '@/components/ReceiptModal';
import { ReceiptFormModal } from '@/components/ReceiptFormModal';
import { printReceipt } from '@/lib/printReceipt';
import { generateReceiptNo, DEFAULT_RECEIPT_START_SEQ } from '@/lib/receiptNumber';
import { PaginationControls } from '@/components/PaginationControls';
import {
  Receipt,
  PlusCircle,
  Search,
  Filter,
  Printer,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Download,
  Building2,
  User,
  Calendar,
  Sparkles,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign
} from 'lucide-react';

interface ReceiptManagementPanelProps {
  receipts: ReceiptData[];
  meetings: Array<{
    id: string;
    titleTh: string;
    titleEn: string;
    date: string;
    location: string;
  }>;
  onSaveReceipt: (receipt: ReceiptData) => void;
  onDeleteReceipt: (id: string) => void;
}

export function ReceiptManagementPanel({
  receipts,
  meetings,
  onSaveReceipt,
  onDeleteReceipt,
}: ReceiptManagementPanelProps) {
  const [search, setSearch] = useState('');
  const [filterMeetingId, setFilterMeetingId] = useState('all');
  const [filterType, setFilterType] = useState<'all' | 'company' | 'individual'>('all');

  // Pagination state (Default 5 items per page)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modals state
  const [previewReceipt, setPreviewReceipt] = useState<ReceiptData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [editReceipt, setEditReceipt] = useState<ReceiptData | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Reset to page 1 on filter/search change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, filterMeetingId, filterType]);

  // Statistics
  const totalAmount = useMemo(() => {
    return receipts.reduce((sum, r) => sum + r.totalAmount, 0);
  }, [receipts]);

  const companyReceiptsCount = useMemo(() => {
    return receipts.filter((r) => r.payerType === 'company').length;
  }, [receipts]);

  const individualReceiptsCount = useMemo(() => {
    return receipts.filter((r) => r.payerType === 'individual').length;
  }, [receipts]);

  // Filtered receipts
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const matchMeeting = filterMeetingId === 'all' || r.meetingId === filterMeetingId;
      const matchType = filterType === 'all' || r.payerType === filterType;
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.receiptNo.toLowerCase().includes(q) ||
        r.payerName.toLowerCase().includes(q) ||
        (r.payerTaxId && r.payerTaxId.includes(q)) ||
        (r.payerPhone && r.payerPhone.includes(q)) ||
        r.items.some((item) => item.title.toLowerCase().includes(q));

      return matchMeeting && matchType && matchSearch;
    });
  }, [receipts, filterMeetingId, filterType, search]);

  // Paginated receipts (5 items per page)
  const paginatedReceipts = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredReceipts.length / pageSize));
    const validPage = Math.min(Math.max(1, currentPage), totalPages);
    const start = (validPage - 1) * pageSize;
    return filteredReceipts.slice(start, start + pageSize);
  }, [filteredReceipts, currentPage, pageSize]);

  const handleOpenCreate = () => {
    let maxSeq = DEFAULT_RECEIPT_START_SEQ - 1;
    let maxId = 0;
    receipts.forEach((r) => {
      const match = r.receiptNo?.match(/-(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) maxSeq = num;
      }
      const numId = parseInt(r.id, 10);
      if (!isNaN(numId) && numId > maxId) maxId = numId;
    });
    const nextReceiptNo = generateReceiptNo(new Date(), maxSeq + 1);
    const nextId = String(maxId + 1);

    setEditReceipt({
      id: nextId,
      receiptNo: nextReceiptNo,
      receiptDate: new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      purposeText: 'ได้รับเงินสนับสนุน ประจำปี 2569',
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
          title: 'ค่าสนับสนุนการประชุมวิชาการ และการประชุมใหญ่สามัญประจำปี 2569',
          subDetails: [
            'ด้านเทคโนโลยีช่วยการเจริญพันธุ์ทางการแพทย์',
            'จัดขึ้นวันที่ 20-21-22 ตุลาคม  2569',
            'โรงแรมแกรนด์ เซนเตอร์ พอยต์ ลุมพินี กรุงเทพฯ',
          ],
          amount: 50000,
        },
      ],
      totalAmount: 50000,
      payerSignerName: '',
      payerSignerRole: 'ผู้จ่ายเงิน',
      authorizedSignerName: 'แพทย์หญิงพิมพกา ชวนะเวสน์',
      authorizedSignerRole: 'เหรัญญิก / ผู้รับเงิน',
      preparedByName: 'ปณตพร ภวภูตานนท์ ณ มหาสารคาม',
      preparedByRole: 'ผู้จัดทำ',
      createdAt: new Date().toISOString().split('T')[0],
      status: 'issued',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (receipt: ReceiptData) => {
    setEditReceipt(receipt);
    setIsPreviewOpen(false);
    setIsFormOpen(true);
  };

  const handleOpenPreview = (receipt: ReceiptData) => {
    setPreviewReceipt(receipt);
    setIsPreviewOpen(true);
  };

  const handleDirectPrint = (receipt: ReceiptData) => {
    printReceipt(receipt);
  };

  const handleDuplicate = (receipt: ReceiptData) => {
    let maxId = 0;
    receipts.forEach((r) => {
      const numId = parseInt(r.id, 10);
      if (!isNaN(numId) && numId > maxId) maxId = numId;
    });
    const duplicated: ReceiptData = {
      ...receipt,
      id: String(maxId + 1),
      receiptNo: `${receipt.receiptNo}-COPY`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    onSaveReceipt(duplicated);
  };

  const handleSaveFromForm = (savedReceipt: ReceiptData, andPrint: boolean = false) => {
    onSaveReceipt(savedReceipt);
    setIsFormOpen(false);
    if (andPrint) {
      printReceipt(savedReceipt);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Top Stats Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ใบเสร็จทั้งหมด
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {receipts.length} <span className="text-sm font-normal text-slate-500">ฉบับ</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0026b3] border border-blue-100 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ยอดเงินรวมตามใบเสร็จ
            </p>
            <h3 className="text-2xl font-black text-emerald-700 mt-1 font-mono">
              ฿{totalAmount.toLocaleString('th-TH')}
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#4ade80]/20 text-emerald-800 border border-[#4ade80]/40 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              นิติบุคคล / สปอนเซอร์
            </p>
            <h3 className="text-2xl font-black text-[#0026b3] mt-1">
              {companyReceiptsCount} <span className="text-sm font-normal text-slate-500">ราย</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0026b3] border border-blue-100 flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ผู้ลงทะเบียน / บุคคล
            </p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">
              {individualReceiptsCount} <span className="text-sm font-normal text-slate-500">ราย</span>
            </h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ─── Control Bar: Search, Filters & Create ─────────────────────── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#0026b3]" />
              <span>ระบบพิมพ์และออกใบเสร็จรับเงิน</span>
            </h2>
            <p className="text-xs text-slate-500">
              สร้าง พิมพ์ และส่งออกใบเสร็จตามแบบมาตรฐานสมาคมเวชศาสตร์การเจริญพันธุ์ไทย 100%
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => receipts.length > 0 && handleDirectPrint(receipts[0])}
              disabled={receipts.length === 0}
              className="px-3.5 py-2 text-xs font-bold text-[#0026b3] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
              title="พิมพ์ใบเสร็จล่าสุด"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0026b3]" />
              <span>พิมพ์ใบเสร็จล่าสุด</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-bold text-white bg-[#0026b3] hover:bg-[#001f94] shadow-md shadow-[#0026b3]/25 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-[#4ade80]" />
              <span>ออกใบเสร็จใหม่</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขที่ใบเสร็จ, ผู้ชำระเงิน, เลขผู้เสียภาษี, รายการ..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-slate-700 font-medium"
            >
              <option value="all">ประเภทผู้ชำระ: ทั้งหมด</option>
              <option value="company">นิติบุคคล / บริษัท / สปอนเซอร์</option>
              <option value="individual">บุคคลธรรมดา / ผู้เข้าร่วม</option>
            </select>
          </div>

          <div>
            <select
              value={filterMeetingId}
              onChange={(e) => setFilterMeetingId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] text-slate-700 font-medium"
            >
              <option value="all">การประชุม: ทั้งหมด</option>
              {meetings.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.titleTh}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ─── Receipts Table List ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 sm:px-6 whitespace-nowrap">เลขที่ / วันที่</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ผู้ชำระเงิน / บริษัท</th>
                <th className="py-3.5 px-4 min-w-[200px]">รายการ</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">จำนวนเงิน</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ผู้จัดทำ / ผู้ลงนาม</th>
                <th className="py-3.5 px-4 sm:px-6 text-center whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">ไม่พบข้อมูลใบเสร็จรับเงิน</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ลองเปลี่ยนคำค้นหา หรือกด &quot;ออกใบเสร็จใหม่&quot; เพื่อสร้างใบเสร็จ
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedReceipts.map((r) => (
                  <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#0026b3] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200 whitespace-nowrap inline-block">
                          {r.receiptNo}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1 whitespace-nowrap">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{r.receiptDate}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 min-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 line-clamp-1">{r.payerName}</span>
                        {r.payerType === 'company' ? (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-blue-50 text-[#0026b3] rounded font-bold border border-blue-200 whitespace-nowrap">
                            นิติบุคคล
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium whitespace-nowrap">
                            บุคคล
                          </span>
                        )}
                      </div>
                      {r.payerTaxId && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5 whitespace-nowrap">
                          Tax ID: {r.payerTaxId}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-4 min-w-[200px]">
                      <div className="space-y-0.5">
                        {r.items.map((it, idx) => (
                          <div key={idx} className="text-xs text-slate-700">
                            <span className="font-medium">{it.title}</span>
                            {it.subDetails && it.subDetails[0] && (
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                {it.subDetails[0]}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right whitespace-nowrap min-w-[120px]">
                      <div className="font-bold font-mono text-slate-900 text-sm">
                        ฿{r.totalAmount.toLocaleString('th-TH')}
                      </div>
                      <div className="inline-flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold bg-[#4ade80]/20 px-2.5 py-0.5 rounded-full border border-[#4ade80]/40 mt-1 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] shrink-0"></span>
                        <span>ออกใบเสร็จแล้ว</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 min-w-[150px] whitespace-nowrap">
                      <div className="text-xs text-slate-700">
                        {r.authorizedSignerName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        จัดทำ: {r.preparedByName}
                      </div>
                    </td>

                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap min-w-[150px]">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleDirectPrint(r)}
                          className="p-1.5 bg-blue-50 text-[#0026b3] hover:bg-[#0026b3] hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="พิมพ์ใบเสร็จ"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenPreview(r)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="ดูตัวอย่าง"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(r)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicate(r)}
                          className="p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                          title="คัดลอก"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`ยืนยันการลบใบเสร็จเลขที่ ${r.receiptNo}?`)) {
                              onDeleteReceipt(r.id);
                            }
                          }}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="ลบใบเสร็จ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      <PaginationControls
        currentPage={currentPage}
        totalItems={filteredReceipts.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        pageSizeOptions={[5, 10, 20, 50]}
        itemLabel="ใบเสร็จ"
      />

      {/* ─── Modals ─────────────────────────────────────────────────── */}
      <ReceiptModal
        receipt={previewReceipt}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onEdit={(r) => handleOpenEdit(r)}
      />

      <ReceiptFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveFromForm}
        initialData={editReceipt}
        receipts={receipts}
        meetings={meetings}
      />
    </div>
  );
}
