'use client';

import React, { useState, useMemo } from 'react';
import { AdminPageHeader, HeaderButton, HeaderStat, HeaderStats } from '@/components/admin/AdminPageHeader';
import { Btn, IconBtn, EmptyState, Toolbar, ToolbarGroup, SearchInput, Segmented, FilterSelect } from '@/components/admin/ui';
import { ReceiptData } from '@/types/receipt';
import { ReceiptModal } from '@/components/ReceiptModal';
import { ReceiptFormModal } from '@/components/ReceiptFormModal';
import { printReceipt } from '@/lib/printReceipt';
import { generateReceiptNo, DEFAULT_RECEIPT_START_SEQ } from '@/lib/receiptNumber';
import { PaginationControls } from '@/components/PaginationControls';
import {
  Receipt,
  PlusCircle,
  Filter,
  Printer,
  Eye,
  Edit3,
  Trash2,
  Copy,
  Download,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
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
    setEditReceipt(null);
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
    <div className="space-y-6 animate-fade-in pb-12">
      <AdminPageHeader
        tab="receipts"
        description="สร้าง พิมพ์ และส่งออกใบเสร็จตามแบบมาตรฐานสมาคมเวชศาสตร์การเจริญพันธุ์ไทย"
        actions={
          <>
            <HeaderButton variant="primary" icon={PlusCircle} onClick={handleOpenCreate}>
              ออกใบเสร็จใหม่
            </HeaderButton>
            <HeaderButton
              icon={Printer}
              onClick={() => receipts.length > 0 && handleDirectPrint(receipts[0])}
              disabled={receipts.length === 0}
            >
              พิมพ์ใบเสร็จล่าสุด
            </HeaderButton>
          </>
        }
      >
        <HeaderStats>
          <HeaderStat label="ใบเสร็จทั้งหมด" value={receipts.length} hint="ฉบับ" />
          <HeaderStat label="ยอดเงินรวมตามใบเสร็จ" value={`฿${totalAmount.toLocaleString('th-TH')}`} />
          <HeaderStat label="นิติบุคคลและสปอนเซอร์" value={companyReceiptsCount} hint="ราย" />
          <HeaderStat label="ผู้ลงทะเบียนรายบุคคล" value={individualReceiptsCount} hint="ราย" />
        </HeaderStats>
      </AdminPageHeader>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="ค้นหาเลขที่ใบเสร็จ, ผู้ชำระเงิน, เลขผู้เสียภาษี, รายการ..."
        />
        <ToolbarGroup>
          <Segmented
            value={filterType}
            onChange={setFilterType}
            options={[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'company', label: 'นิติบุคคล' },
              { id: 'individual', label: 'บุคคลธรรมดา' },
            ]}
          />
          <FilterSelect
            label="การประชุม"
            icon={Calendar}
            value={filterMeetingId}
            onChange={setFilterMeetingId}
            className="max-w-[260px]"
            options={[{ value: 'all', label: 'ทุกการประชุม' }, ...meetings.map((m) => ({ value: m.id, label: m.titleTh }))]}
          />
        </ToolbarGroup>
      </Toolbar>

      {/* ─── Receipts Table List ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-bold text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 sm:px-6 whitespace-nowrap">เลขที่และวันที่</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ผู้ชำระเงิน</th>
                <th className="py-3.5 px-4 min-w-[200px]">รายการ</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">จำนวนเงิน</th>
                <th className="py-3.5 px-4 whitespace-nowrap">ผู้ลงนาม</th>
                <th className="py-3.5 px-4 sm:px-6 text-right whitespace-nowrap">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredReceipts.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Receipt}
                      title="ไม่พบข้อมูลใบเสร็จรับเงิน"
                      description="ลองเปลี่ยนคำค้นหา หรือออกใบเสร็จใหม่"
                      action={
                        <Btn variant="primary" icon={PlusCircle} onClick={handleOpenCreate}>
                          ออกใบเสร็จใหม่
                        </Btn>
                      }
                    />
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

                    <td className="py-4 px-4 min-w-[200px]">
                      <div className="flex items-start gap-1.5">
                        <span className="font-bold text-slate-800 line-clamp-2 break-words">{r.payerName}</span>
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

                    <td className="py-4 px-4 min-w-[220px]">
                      <div className="space-y-0.5">
                        {r.items.map((it, idx) => (
                          <div key={idx} className="text-xs text-slate-700">
                            <span className="font-medium break-words">{it.title}</span>
                            {it.subDetails && it.subDetails[0] && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 break-words">
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

                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap min-w-[190px]">
                      <div className="flex items-center justify-end gap-1.5">
                        <Btn size="sm" variant="soft" icon={Printer} onClick={() => handleDirectPrint(r)}>
                          พิมพ์
                        </Btn>
                        <IconBtn icon={Eye} label="ดูตัวอย่าง" tone="blue" onClick={() => handleOpenPreview(r)} />
                        <IconBtn icon={Edit3} label="แก้ไขข้อมูล" tone="amber" onClick={() => handleOpenEdit(r)} />
                        <IconBtn icon={Copy} label="คัดลอกเป็นใบใหม่" tone="violet" onClick={() => handleDuplicate(r)} />
                        <IconBtn
                          icon={Trash2}
                          label="ลบใบเสร็จ"
                          tone="rose"
                          onClick={() => {
                            if (confirm(`ยืนยันการลบใบเสร็จเลขที่ ${r.receiptNo}?`)) {
                              onDeleteReceipt(r.id);
                            }
                          }}
                        />
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
        isEditing={Boolean(editReceipt)}
        receipts={receipts}
        meetings={meetings}
      />
    </div>
  );
}
