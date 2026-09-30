'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Download, FileUp, Plus, Save, Trash2, X } from 'lucide-react';
import {
  isValidEmail,
  isValidLink,
  matchAttendee,
  MatchableAttendee,
  normalizeEmail,
} from '@/lib/onlineLinkMatching';

export interface LinkGridRow {
  name: string;
  email: string;
  link: string;
}

interface OnlineLinksImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialRows: LinkGridRow[];
  attendees: MatchableAttendee[];
  onSave: (rows: Array<LinkGridRow & { attendanceId?: string; memberNo?: string }>) => Promise<boolean>;
}

const COLUMNS: Array<{ key: keyof LinkGridRow; label: string; width: string }> = [
  { key: 'name', label: 'ชื่อ-นามสกุล', width: 'min-w-[220px]' },
  { key: 'email', label: 'อีเมล', width: 'min-w-[240px]' },
  { key: 'link', label: 'ลิงก์ประชุม', width: 'min-w-[320px]' },
];

const EMPTY_ROW: LinkGridRow = { name: '', email: '', link: '' };

function isBlank(r: LinkGridRow) {
  return !r.name.trim() && !r.email.trim() && !r.link.trim();
}

// อ่านไฟล์ Excel/CSV แล้วหาคอลัมน์ ชื่อ / อีเมล / ลิงก์ จากหัวตาราง
export async function parseLinkFile(file: File): Promise<LinkGridRow[]> {
  const XLSX = await import('xlsx');
  const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = book.Sheets[book.SheetNames[0]];
  const grid: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (grid.length === 0) return [];

  const header = grid[0].map((h) => String(h || '').toLowerCase().trim());
  const findCol = (patterns: RegExp[]) => header.findIndex((h) => patterns.some((p) => p.test(h)));
  let nameCol = findCol([/ชื่อ/, /name/]);
  let emailCol = findCol([/อีเมล/, /e-?mail/]);
  let linkCol = findCol([/ลิง[กค]์/, /link/, /url/, /zoom/]);
  const hasHeader = nameCol >= 0 || emailCol >= 0 || linkCol >= 0;
  if (nameCol < 0) nameCol = 0;
  if (emailCol < 0) emailCol = 1;
  if (linkCol < 0) linkCol = 2;

  return grid
    .slice(hasHeader ? 1 : 0)
    .map((r) => ({
      name: String(r[nameCol] ?? '').trim(),
      email: String(r[emailCol] ?? '').trim(),
      link: String(r[linkCol] ?? '').trim(),
    }))
    .filter((r) => !isBlank(r));
}

export async function downloadLinkTemplate(rows: LinkGridRow[], fileName: string) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([
    ['ชื่อ-นามสกุล', 'อีเมล', 'ลิงก์ประชุม'],
    ...rows.map((r) => [r.name, r.email, r.link]),
  ]);
  sheet['!cols'] = [{ wch: 32 }, { wch: 34 }, { wch: 60 }];
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'ลิงก์ประชุม');
  XLSX.writeFile(book, fileName);
}

export function OnlineLinksImportModal({ isOpen, onClose, title, initialRows, attendees, onSave }: OnlineLinksImportModalProps) {
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<LinkGridRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [fileError, setFileError] = useState('');
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setRows(initialRows.length > 0 ? [...initialRows, { ...EMPTY_ROW }] : [{ ...EMPTY_ROW }, { ...EMPTY_ROW }, { ...EMPTY_ROW }]);
      setFileError('');
    }
  }, [isOpen, initialRows]);

  // ตรวจสอบแต่ละแถว + จับคู่กับผู้ลงทะเบียน
  const analysis = useMemo(() => {
    const emailCount = new Map<string, number>();
    const linkCount = new Map<string, number>();
    rows.forEach((r) => {
      if (isBlank(r)) return;
      const e = normalizeEmail(r.email);
      const l = r.link.trim();
      if (e) emailCount.set(e, (emailCount.get(e) || 0) + 1);
      if (l) linkCount.set(l, (linkCount.get(l) || 0) + 1);
    });
    const matchedIds = new Map<string, number>();
    const results = rows.map((r) => {
      if (isBlank(r)) return { blank: true as const };
      const errors: string[] = [];
      if (!r.name.trim()) errors.push('ไม่มีชื่อ');
      if (!isValidEmail(r.email)) errors.push('อีเมลไม่ถูกต้อง');
      else if ((emailCount.get(normalizeEmail(r.email)) || 0) > 1) errors.push('อีเมลซ้ำ');
      if (!isValidLink(r.link)) errors.push('ลิงก์ไม่ถูกต้อง');
      else if ((linkCount.get(r.link.trim()) || 0) > 1) errors.push('ลิงก์ซ้ำ');
      const match = matchAttendee(r, attendees);
      if (match.attendee) matchedIds.set(match.attendee.id, (matchedIds.get(match.attendee.id) || 0) + 1);
      return { blank: false as const, errors, ...match };
    });
    // หลายแถวจับคู่กับคนเดียวกัน
    results.forEach((res) => {
      if (!res.blank && res.attendee && (matchedIds.get(res.attendee.id) || 0) > 1) {
        res.errors.push('จับคู่ซ้ำกับผู้ลงทะเบียนคนเดียวกัน');
      }
    });
    return results;
  }, [rows, attendees]);

  const filled = analysis.filter((a) => !a.blank);
  const invalidCount = filled.filter((a) => !a.blank && a.errors.length > 0).length;
  const matchedCount = filled.filter((a) => !a.blank && a.errors.length === 0 && a.attendee).length;
  const unmatchedCount = filled.filter((a) => !a.blank && a.errors.length === 0 && !a.attendee).length;

  const updateCell = (rowIdx: number, key: keyof LinkGridRow, value: string) => {
    setRows((prev) => {
      const next = prev.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r));
      // มีแถวว่างท้ายตารางเสมอ เหมือน Excel
      if (!isBlank(next[next.length - 1])) next.push({ ...EMPTY_ROW });
      return next;
    });
  };

  const focusCell = (rowIdx: number, colIdx: number) => {
    cellRefs.current.get(`${rowIdx}:${colIdx}`)?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (rowIdx + 1 >= rows.length) setRows((prev) => [...prev, { ...EMPTY_ROW }]);
      setTimeout(() => focusCell(rowIdx + 1, colIdx), 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(rowIdx - 1, colIdx);
    }
  };

  // วางข้อมูลหลายช่องจาก Excel (แยกด้วย tab / ขึ้นบรรทัดใหม่)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\t') && !text.includes('\n')) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, '').split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    setRows((prev) => {
      const next = [...prev];
      lines.forEach((line, li) => {
        const target = rowIdx + li;
        while (next.length <= target) next.push({ ...EMPTY_ROW });
        const updated = { ...next[target] };
        line.split('\t').forEach((val, ci) => {
          const col = COLUMNS[colIdx + ci];
          if (col) updated[col.key] = val.trim();
        });
        next[target] = updated;
      });
      if (!isBlank(next[next.length - 1])) next.push({ ...EMPTY_ROW });
      return next;
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const imported = await parseLinkFile(file);
      if (imported.length === 0) {
        setFileError('ไม่พบข้อมูลในไฟล์');
        return;
      }
      setFileError('');
      setRows([...imported, { ...EMPTY_ROW }]);
    } catch {
      setFileError('อ่านไฟล์ไม่สำเร็จ รองรับเฉพาะไฟล์ .xlsx .xls และ .csv');
    }
  };

  const handleSave = async () => {
    if (filled.length === 0 || invalidCount > 0) return;
    setSaving(true);
    const payload = rows
      .map((r, i) => ({ r, a: analysis[i] }))
      .filter(({ a }) => !a.blank)
      .map(({ r, a }) => ({
        name: r.name.trim(),
        email: r.email.trim(),
        link: r.link.trim(),
        attendanceId: !a.blank && a.attendee ? a.attendee.id : undefined,
        memberNo: !a.blank && a.attendee?.code && !a.attendee.code.startsWith('G-') ? a.attendee.code : undefined,
      }));
    const ok = await onSave(payload);
    setSaving(false);
    if (ok) onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">นำเข้าลิงก์ประชุม</h3>
            <p className="text-xs text-slate-500 mt-0.5">{title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pt-4 flex flex-wrap items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black bg-[#0026b3] text-white hover:bg-[#001768] transition cursor-pointer"
          >
            <FileUp className="w-4 h-4" />
            <span>เลือกไฟล์</span>
          </button>
          <button
            type="button"
            onClick={() => downloadLinkTemplate([], 'online_links_template.xlsx')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดแบบฟอร์ม</span>
          </button>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { ...EMPTY_ROW }])}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มแถว</span>
          </button>
          <div className="flex flex-wrap items-center gap-2 ml-auto text-xs font-bold">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700">จับคู่ได้ {matchedCount}</span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700">ไม่พบในระบบ {unmatchedCount}</span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700">ข้อมูลผิดพลาด {invalidCount}</span>
          </div>
        </div>
        {fileError && <p className="px-5 pt-2 text-xs font-bold text-rose-600">{fileError}</p>}
        <p className="px-5 pt-2 text-[11px] text-slate-400">
          แก้ไขได้ทุกช่อง · คัดลอกหลายแถวจาก Excel มาวางได้ · กด Enter หรือลูกศรเพื่อเลื่อนแถว
        </p>

        <div className="flex-1 overflow-auto mx-5 my-3 border border-slate-300">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-xs font-black text-slate-600">
              <tr>
                <th className="w-10 border border-slate-300 px-2 py-1.5 text-center">#</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`border border-slate-300 px-2 py-1.5 text-left ${c.width}`}>
                    {c.label}
                  </th>
                ))}
                <th className="border border-slate-300 px-2 py-1.5 text-left min-w-[220px]">ผลการจับคู่</th>
                <th className="w-10 border border-slate-300" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const a = analysis[ri];
                const hasError = !a.blank && a.errors.length > 0;
                return (
                  <tr key={ri} className={hasError ? 'bg-rose-50/60' : ''}>
                    <td className="border border-slate-300 bg-slate-50 text-center text-xs text-slate-400">{ri + 1}</td>
                    {COLUMNS.map((c, ci) => (
                      <td key={c.key} className="border border-slate-300 p-0">
                        <input
                          ref={(el) => {
                            if (el) cellRefs.current.set(`${ri}:${ci}`, el);
                            else cellRefs.current.delete(`${ri}:${ci}`);
                          }}
                          value={row[c.key]}
                          onChange={(e) => updateCell(ri, c.key, e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, ri, ci)}
                          onPaste={(e) => handlePaste(e, ri, ci)}
                          className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-[#0026b3]"
                        />
                      </td>
                    ))}
                    <td className="border border-slate-300 px-2 py-1 text-xs">
                      {a.blank ? null : a.errors.length > 0 ? (
                        <span className="flex items-center gap-1 font-bold text-rose-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          {a.errors.join(', ')}
                        </span>
                      ) : a.attendee ? (
                        <span className="flex items-center gap-1 font-bold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                          {a.attendee.nameTh}
                          <span className="font-normal text-slate-400">({a.method === 'email' ? 'ตรงอีเมล' : 'ตรงชื่อ'})</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-bold text-amber-600">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          ไม่พบผู้ลงทะเบียนออนไลน์
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-300 text-center">
                      {!a.blank && (
                        <button
                          type="button"
                          onClick={() => setRows((prev) => prev.filter((_, i) => i !== ri))}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="ลบแถว"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {unmatchedCount > 0
              ? 'แถวที่ไม่พบในระบบจะถูกบันทึกไว้ แต่จะไม่ถูกส่งอีเมลจนกว่าจะแก้ชื่อหรืออีเมลให้ตรง'
              : 'อีเมลเดิมในวันเดียวกันจะถูกอัปเดตเป็นลิงก์ใหม่'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || filled.length === 0 || invalidCount > 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-[#0026b3] text-white hover:bg-[#001768] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'กำลังบันทึก...' : `บันทึก ${filled.length} รายการ`}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
