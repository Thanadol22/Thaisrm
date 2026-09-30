'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Laptop, RefreshCw, Search, Users } from 'lucide-react';
import { PaginationControls } from '@/components/PaginationControls';

interface MeetingOption {
  meeting_id: string;
  meeting_name: string;
  meeting_date: string;
}

export interface OnlineAttendee {
  id: string;
  code: string;
  nameTh: string;
  email: string;
  programs: string[];
}

interface OnlineAttendeesPanelProps {
  meetings: MeetingOption[];
  meetingId: string;
  onMeetingChange: (meetingId: string) => void;
  notify: (msg: string) => void;
}

const EXPORT_HEADERS = ['ลำดับ', 'ชื่อ-นามสกุล', 'อีเมล', 'รายการ'];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// รายชื่อผู้ลงทะเบียนแบบออนไลน์ (ชำระเงิน/อนุมัติแล้ว) ของงานประชุมที่เลือก
export function OnlineAttendeesPanel({ meetings, meetingId, onMeetingChange, notify }: OnlineAttendeesPanelProps) {
  const [attendees, setAttendees] = useState<OnlineAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const meeting = meetings.find((m) => m.meeting_id === meetingId);

  const loadAttendees = async () => {
    if (!meetingId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/attendees?meetingId=${encodeURIComponent(meetingId)}`);
      const json = await res.json();
      if (!json.success) {
        notify(json.error || 'ไม่สามารถดึงรายชื่อผู้ลงทะเบียนได้');
        return;
      }
      const online: OnlineAttendee[] = (json.data || [])
        .filter((a: any) => a.attendanceType === 'online' && a.paymentStatus === 'paid')
        .map((a: any) => ({
          id: String(a.id),
          code: a.code || '',
          nameTh: a.nameTh || '',
          email: a.email || '',
          programs: (a.programs || []).map((p: any) => p.name || p.id).filter(Boolean),
        }));
      setAttendees(online);
      setPage(1);
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return attendees;
    return attendees.filter(
      (a) =>
        a.nameTh.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.programs.some((p) => p.toLowerCase().includes(q))
    );
  }, [attendees, search]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportRows = () =>
    filtered.map((a, i) => [i + 1, a.nameTh, a.email, a.programs.join(', ')]);

  const fileSlug = `online_attendees_${meetingId}_${new Date().toISOString().slice(0, 10)}`;

  const handleExportExcel = async () => {
    if (filtered.length === 0) return notify('ไม่มีรายชื่อสำหรับส่งออก');
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...exportRows()]);
    sheet['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 34 }, { wch: 50 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'ผู้ลงทะเบียนออนไลน์');
    XLSX.writeFile(book, `${fileSlug}.xlsx`);
  };

  const handleExportPdf = () => {
    if (filtered.length === 0) return notify('ไม่มีรายชื่อสำหรับส่งออก');
    const bodyRows = exportRows()
      .map(
        (r) =>
          `<tr><td class="c">${r[0]}</td><td>${escapeHtml(String(r[1]))}</td><td>${escapeHtml(String(r[2]))}</td><td>${escapeHtml(String(r[3]))}</td></tr>`
      )
      .join('');
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(fileSlug)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: 'Sarabun', sans-serif; font-size: 13px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #e8edfb; }
  td.c, th.c { text-align: center; width: 48px; }
  tr { page-break-inside: avoid; }
</style></head><body>
<h1>รายชื่อผู้ลงทะเบียนออนไลน์</h1>
<p>${escapeHtml(meeting?.meeting_name || meetingId)} · ทั้งหมด ${filtered.length} คน</p>
<table><thead><tr><th class="c">${EXPORT_HEADERS[0]}</th><th>${EXPORT_HEADERS[1]}</th><th>${EXPORT_HEADERS[2]}</th><th>${EXPORT_HEADERS[3]}</th></tr></thead>
<tbody>${bodyRows}</tbody></table></body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:297mm;height:210mm;border:0;opacity:0;';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    // รอฟอนต์โหลดก่อนสั่งพิมพ์ (ผู้ใช้เลือก "บันทึกเป็น PDF")
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 60000);
    }, 800);
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3] shrink-0">
            <Laptop className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">รายชื่อผู้ลงทะเบียนออนไลน์</h2>
            <p className="text-xs text-slate-500">แสดงเฉพาะผู้ที่ชำระเงินหรือได้รับการอนุมัติสิทธิ์แล้ว</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>ส่งออก Excel</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-rose-600 text-white hover:bg-rose-700 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>ส่งออก PDF</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <select
          value={meetingId}
          onChange={(e) => onMeetingChange(e.target.value)}
          className="md:w-80 px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          {meetings.map((m) => (
            <option key={m.meeting_id} value={m.meeting_id}>
              {m.meeting_name}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="ค้นหาชื่อ อีเมล หรือรายการ"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <button
          type="button"
          onClick={loadAttendees}
          disabled={loading}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
        <Users className="w-4 h-4 text-[#0026b3]" />
        <span>ทั้งหมด {filtered.length} คน</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-50 text-xs font-black text-slate-600">
            <tr>
              <th className="px-3 py-2.5 w-14 text-center">ลำดับ</th>
              <th className="px-3 py-2.5">ชื่อ-นามสกุล</th>
              <th className="px-3 py-2.5">อีเมล</th>
              <th className="px-3 py-2.5">รายการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-slate-400 text-xs font-bold">
                  กำลังโหลดข้อมูล...
                </td>
              </tr>
            ) : pageRows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-slate-400 text-xs font-bold">
                  ไม่พบผู้ลงทะเบียนออนไลน์
                </td>
              </tr>
            ) : (
              pageRows.map((a, i) => (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-3 py-2.5 text-center text-slate-500">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-2.5 font-bold text-slate-900">{a.nameTh}</td>
                  <td className="px-3 py-2.5 text-slate-600 break-all">{a.email || '-'}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {a.programs.length === 0 ? (
                        <span className="text-slate-400">-</span>
                      ) : (
                        a.programs.map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#0026b3] text-xs font-bold">
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls
        currentPage={page}
        totalItems={filtered.length}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        itemLabel="คน"
      />
    </div>
  );
}
