'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Copy,
  FileSpreadsheet,
  FileText,
  FileUp,
  Laptop,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { PaginationControls } from '@/components/PaginationControls';
import { formatThaiDate, DailyProgramInfo, programSupportsFormat } from '@/lib/services/dailyCheckinService';
import { matchAttendee } from '@/lib/onlineLinkMatching';
import { OnlineLinksImportModal, LinkGridRow } from '@/components/admin/OnlineLinksImportModal';

interface MeetingOption {
  meeting_id: string;
  meeting_name: string;
  meeting_date: string;
}

export interface OnlineAttendee {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string;
  email: string;
  programs: Array<{ id: string; name: string }>;
}

export interface OnlineLinkRecord {
  id: string;
  linkDate: string;
  attendanceId: string | null;
  memberNo: string | null;
  name: string;
  email: string;
  link: string;
  reminderSentAt: string | null;
  linkSentAt: string | null;
}

interface OnlineAttendeesPanelProps {
  meetings: MeetingOption[];
  meetingId: string;
  onMeetingChange: (meetingId: string) => void;
  notify: (msg: string) => void;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ผู้เข้าร่วมเข้าร่วมวันนั้นหรือไม่ (จากรายการที่เลือกลงทะเบียน)
function attendsOnDay(attendee: OnlineAttendee, dayPrograms: DailyProgramInfo[]): boolean {
  if (dayPrograms.length === 0) return true;
  if (attendee.programs.length === 0) {
    const hasMain = dayPrograms.some((p) => p.isMainProgram || p.type === 'main');
    return hasMain;
  }
  return attendee.programs.some((ap) =>
    dayPrograms.some(
      (dp) => (!!ap.id && (dp.id === ap.id || dp.activityId === ap.id)) || (!!ap.name && dp.programName === ap.name)
    )
  );
}

// รายชื่อผู้ลงทะเบียนออนไลน์ + ลิงก์ประชุมรายบุคคล (1 ลิงก์ / คน / วัน)
export function OnlineAttendeesPanel({ meetings, meetingId, onMeetingChange, notify }: OnlineAttendeesPanelProps) {
  const [attendees, setAttendees] = useState<OnlineAttendee[]>([]);
  const [programs, setPrograms] = useState<DailyProgramInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [links, setLinks] = useState<OnlineLinkRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<LinkGridRow[]>([]);
  const [importReplace, setImportReplace] = useState(false);

  const meeting = meetings.find((m) => m.meeting_id === meetingId);

  // วันที่มีรายการแบบออนไลน์
  const onlineDates = useMemo(() => {
    const dates = new Set(
      programs.filter((p) => programSupportsFormat(p.format, 'online')).map((p) => p.date)
    );
    if (dates.size === 0 && meeting?.meeting_date) dates.add(String(meeting.meeting_date).slice(0, 10));
    return Array.from(dates).sort();
  }, [programs, meeting]);

  const dayPrograms = useMemo(
    () => programs.filter((p) => p.date === selectedDate && programSupportsFormat(p.format, 'online')),
    [programs, selectedDate]
  );

  const loadAttendees = async () => {
    if (!meetingId) return;
    try {
      setLoading(true);
      const [attRes, progRes] = await Promise.all([
        fetch(`/api/admin/attendees?meetingId=${encodeURIComponent(meetingId)}`),
        fetch(`/api/meetings/${encodeURIComponent(meetingId)}/daily-programs`),
      ]);
      const attJson = await attRes.json();
      const progJson = await progRes.json();
      if (!attJson.success) {
        notify(attJson.error || 'ไม่สามารถดึงรายชื่อผู้ลงทะเบียนได้');
        return;
      }
      setAttendees(
        (attJson.data || [])
          .filter((a: any) => a.attendanceType === 'online' && a.paymentStatus === 'paid')
          .map((a: any) => ({
            id: String(a.id),
            code: a.code || '',
            nameTh: a.nameTh || '',
            nameEn: a.nameEn || '',
            email: a.email || '',
            programs: (a.programs || []).map((p: any) => ({ id: String(p.id || ''), name: String(p.name || p.id || '') })),
          }))
      );
      setPrograms(progJson.success && Array.isArray(progJson.data?.programs) ? progJson.data.programs : []);
      setPage(1);
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadLinks = async () => {
    if (!meetingId || !selectedDate) return;
    try {
      const res = await fetch(`/api/admin/online-links?meetingId=${encodeURIComponent(meetingId)}&date=${selectedDate}`);
      const json = await res.json();
      if (json.success) setLinks(json.data);
      else notify(json.error || 'ไม่สามารถดึงลิงก์ประชุมได้');
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    }
  };

  useEffect(() => {
    setSelectedDate('');
    setLinks([]);
    loadAttendees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  useEffect(() => {
    if (onlineDates.length > 0 && !onlineDates.includes(selectedDate)) setSelectedDate(onlineDates[0]);
  }, [onlineDates, selectedDate]);

  useEffect(() => {
    setLinks([]);
    loadLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId, selectedDate]);

  const dayAttendees = useMemo(() => attendees.filter((a) => attendsOnDay(a, dayPrograms)), [attendees, dayPrograms]);

  // จับคู่ลิงก์กับผู้ลงทะเบียน: attendance_id ที่บันทึกไว้ก่อน แล้วจึงอีเมล/ชื่อ
  const { linkByAttendee, unmatchedLinks } = useMemo(() => {
    const byAttendee = new Map<string, OnlineLinkRecord>();
    const unmatched: OnlineLinkRecord[] = [];
    for (const l of links) {
      const attendee =
        (l.attendanceId && dayAttendees.find((a) => a.id === l.attendanceId)) ||
        matchAttendee({ name: l.name, email: l.email }, dayAttendees).attendee;
      if (attendee && !byAttendee.has(attendee.id)) byAttendee.set(attendee.id, l);
      else unmatched.push(l);
    }
    return { linkByAttendee: byAttendee, unmatchedLinks: unmatched };
  }, [links, dayAttendees]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dayAttendees;
    return dayAttendees.filter(
      (a) =>
        a.nameTh.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.programs.some((p) => p.name.toLowerCase().includes(q))
    );
  }, [dayAttendees, search]);

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const withLinkCount = dayAttendees.filter((a) => linkByAttendee.has(a.id)).length;
  const dateLabel = selectedDate ? formatThaiDate(selectedDate) || selectedDate : '';

  const exportHeaders = ['ลำดับ', 'ชื่อ-นามสกุล', 'อีเมล', 'รายการ', 'ลิงก์ประชุม'];
  const exportRows = () =>
    filtered.map((a, i) => [
      i + 1,
      a.nameTh,
      a.email,
      a.programs.map((p) => p.name).join(', '),
      linkByAttendee.get(a.id)?.link || '',
    ]);
  const fileSlug = `online_attendees_${meetingId}_${selectedDate || 'all'}`;

  const handleExportExcel = async () => {
    if (filtered.length === 0) return notify('ไม่มีรายชื่อสำหรับส่งออก');
    const XLSX = await import('xlsx');
    const sheet = XLSX.utils.aoa_to_sheet([exportHeaders, ...exportRows()]);
    sheet['!cols'] = [{ wch: 8 }, { wch: 32 }, { wch: 34 }, { wch: 50 }, { wch: 60 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'ผู้ลงทะเบียนออนไลน์');
    XLSX.writeFile(book, `${fileSlug}.xlsx`);
  };

  const handleExportPdf = () => {
    if (filtered.length === 0) return notify('ไม่มีรายชื่อสำหรับส่งออก');
    const bodyRows = exportRows()
      .map((r) => `<tr><td class="c">${r[0]}</td>${r.slice(1).map((v) => `<td>${escapeHtml(String(v))}</td>`).join('')}</tr>`)
      .join('');
    const html = `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>${escapeHtml(fileSlug)}</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 12mm; }
  body { font-family: 'Sarabun', sans-serif; font-size: 12px; color: #111; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 12px; color: #555; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 5px 8px; text-align: left; vertical-align: top; word-break: break-all; }
  th { background: #e8edfb; }
  td.c, th.c { text-align: center; width: 40px; }
  tr { page-break-inside: avoid; }
</style></head><body>
<h1>รายชื่อผู้ลงทะเบียนออนไลน์</h1>
<p>${escapeHtml(meeting?.meeting_name || meetingId)} · วันที่ ${escapeHtml(dateLabel)} · ทั้งหมด ${filtered.length} คน</p>
<table><thead><tr><th class="c">${exportHeaders[0]}</th>${exportHeaders.slice(1).map((h) => `<th>${h}</th>`).join('')}</tr></thead>
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

  const openImport = (rows: LinkGridRow[], replace: boolean) => {
    if (!selectedDate) return notify('กรุณาเลือกวันที่');
    setImportRows(rows);
    setImportReplace(replace);
    setImportOpen(true);
  };

  const handleSaveLinks = async (rows: Array<LinkGridRow & { attendanceId?: string; memberNo?: string }>) => {
    try {
      const res = await fetch('/api/admin/online-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, linkDate: selectedDate, rows, replaceAll: importReplace }),
      });
      const json = await res.json();
      notify(json.success ? json.message : json.error || 'บันทึกไม่สำเร็จ');
      if (json.success) await loadLinks();
      return !!json.success;
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
      return false;
    }
  };

  const handleDeleteLinks = async (ids?: string[]) => {
    const msg = ids
      ? 'ยืนยันการลบลิงก์ประชุมรายการนี้?'
      : `ยืนยันการลบลิงก์ประชุมทั้งหมดของวันที่ ${dateLabel}?`;
    if (!confirm(msg)) return;
    try {
      const res = await fetch('/api/admin/online-links', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId, linkDate: selectedDate, ids }),
      });
      const json = await res.json();
      notify(json.success ? json.message : json.error || 'ลบไม่สำเร็จ');
      if (json.success) await loadLinks();
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      notify('คัดลอกลิงก์แล้ว');
    } catch {
      notify('คัดลอกลิงก์ไม่สำเร็จ');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3] shrink-0">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">รายชื่อผู้ลงทะเบียนออนไลน์</h2>
              <p className="text-xs text-slate-500">แสดงเฉพาะผู้ที่ชำระเงินหรือได้รับการอนุมัติสิทธิ์แล้ว · ลิงก์ประชุม 1 ลิงก์ต่อคนต่อวัน</p>
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
            onClick={() => {
              loadAttendees();
              loadLinks();
            }}
            disabled={loading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>

        {/* เลือกวันที่ (ลิงก์แยกรายวัน) */}
        <div className="flex flex-wrap items-center gap-2">
          {onlineDates.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setSelectedDate(d);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                selectedDate === d
                  ? 'bg-[#0026b3] text-white border-[#0026b3]'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {formatThaiDate(d, true) || d}
            </button>
          ))}
          {dayPrograms.length > 0 && (
            <span className="text-xs text-slate-500">รายการวันนี้: {dayPrograms.map((p) => p.programName).join(', ')}</span>
          )}
        </div>

        {/* แถบจัดการลิงก์ */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl bg-slate-50 border border-slate-200 p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <Users className="w-4 h-4 text-[#0026b3]" />
            <span>
              ผู้ลงทะเบียน {dayAttendees.length} คน · มีลิงก์แล้ว {withLinkCount} คน · ยังไม่มีลิงก์ {dayAttendees.length - withLinkCount} คน
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openImport([], false)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black bg-[#0026b3] text-white hover:bg-[#001768] transition cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>นำเข้าลิงก์</span>
            </button>
            {links.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => openImport(links.map((l) => ({ name: l.name, email: l.email, link: l.link })), true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                  <span>แก้ไขลิงก์</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteLinks()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border border-rose-200 bg-white text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ลบลิงก์ทั้งวัน</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-xs font-black text-slate-600">
              <tr>
                <th className="px-3 py-2.5 w-14 text-center">ลำดับ</th>
                <th className="px-3 py-2.5">ชื่อ-นามสกุล</th>
                <th className="px-3 py-2.5">อีเมล</th>
                <th className="px-3 py-2.5">รายการ</th>
                <th className="px-3 py-2.5">ลิงก์ประชุม</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400 text-xs font-bold">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-400 text-xs font-bold">
                    ไม่พบผู้ลงทะเบียนออนไลน์
                  </td>
                </tr>
              ) : (
                pageRows.map((a, i) => {
                  const link = linkByAttendee.get(a.id);
                  return (
                    <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50/60 align-top">
                      <td className="px-3 py-2.5 text-center text-slate-500">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-2.5 font-bold text-slate-900">{a.nameTh}</td>
                      <td className="px-3 py-2.5 text-slate-600 break-all">{a.email || '-'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {a.programs.length === 0 ? (
                            <span className="text-slate-400">-</span>
                          ) : (
                            a.programs.map((p) => (
                              <span key={p.id || p.name} className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#0026b3] text-xs font-bold">
                                {p.name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 max-w-xs">
                        {link ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={link.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#0026b3] underline truncate"
                              title={link.link}
                            >
                              {link.link}
                            </a>
                            <button
                              type="button"
                              onClick={() => copyLink(link.link)}
                              className="p-1 text-slate-400 hover:text-[#0026b3] cursor-pointer shrink-0"
                              title="คัดลอกลิงก์"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold">ยังไม่มีลิงก์</span>
                        )}
                      </td>
                    </tr>
                  );
                })
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

      {unmatchedLinks.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-amber-200 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-black text-slate-900">ลิงก์ที่จับคู่กับผู้ลงทะเบียนไม่ได้ ({unmatchedLinks.length})</h3>
          </div>
          <p className="text-xs text-slate-500">ลิงก์เหล่านี้จะไม่ถูกส่งอีเมล กรุณากดปุ่มแก้ไขลิงก์เพื่อแก้ชื่อหรืออีเมลให้ตรงกับผู้ลงทะเบียน</p>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-600">
                <tr>
                  <th className="px-3 py-2">ชื่อ-นามสกุล</th>
                  <th className="px-3 py-2">อีเมล</th>
                  <th className="px-3 py-2">ลิงก์ประชุม</th>
                  <th className="px-3 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {unmatchedLinks.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-bold text-slate-900">{l.name}</td>
                    <td className="px-3 py-2 text-slate-600 break-all">{l.email}</td>
                    <td className="px-3 py-2 text-xs text-slate-600 break-all">{l.link}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteLinks([l.id])}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="ลบ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <OnlineLinksImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        title={`${meeting?.meeting_name || meetingId} · วันที่ ${dateLabel}`}
        initialRows={importRows}
        attendees={dayAttendees}
        onSave={handleSaveLinks}
      />
    </div>
  );
}
