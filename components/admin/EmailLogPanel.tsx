'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, History, RefreshCw, Search, Send } from 'lucide-react';

type LogStatus = 'sent' | 'failed' | 'fallback';

interface EmailLogRow {
  id: string;
  to: string;
  subject: string;
  status: LogStatus;
  error?: string;
  attempts: number;
  at: string;
  resentAt?: string;
  canResend: boolean;
}

interface Summary {
  sent: number;
  failed: number;
  fallback: number;
  unresolvedFailed: number;
}

const STATUS_LABEL: Record<LogStatus, string> = {
  sent: 'ส่งสำเร็จ',
  failed: 'ส่งไม่สำเร็จ',
  fallback: 'ไม่ได้ส่ง',
};

const STATUS_STYLE: Record<LogStatus, string> = {
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  failed: 'bg-rose-50 text-rose-700 border-rose-200/60',
  fallback: 'bg-amber-50 text-amber-700 border-amber-200/60',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EmailLogPanel({ notify }: { notify: (msg: string) => void }) {
  const [status, setStatus] = useState<'all' | LogStatus>('failed');
  const [days, setDays] = useState(30);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<EmailLogRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState<string | 'all' | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ status, days: String(days) });
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/email/logs?${params}`);
      const json = await res.json();
      if (json.success) {
        setRows(json.data.rows);
        setSummary(json.data.summary);
      } else {
        notify(json.error || 'โหลดประวัติการส่งอีเมลไม่สำเร็จ');
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, days]);

  const resend = async (ids: string[], key: string | 'all') => {
    if (ids.length === 0) return;
    try {
      setResending(key);
      const res = await fetch('/api/email/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      const json = await res.json();
      if (json.success) {
        const { sent, failed } = json.data;
        notify(failed > 0 ? `ส่งซ้ำสำเร็จ ${sent} ฉบับ ไม่สำเร็จ ${failed} ฉบับ` : `ส่งซ้ำสำเร็จ ${sent} ฉบับ`);
      } else {
        notify(json.error || 'ส่งซ้ำไม่สำเร็จ');
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setResending(null);
      fetchLogs();
    }
  };

  const resendableIds = rows.filter((r) => r.canResend).map((r) => r.id);

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900">ประวัติการส่งอีเมล</h2>
            <p className="text-xs text-slate-500">ตรวจสอบว่าใครได้รับหรือไม่ได้รับอีเมลจากระบบ และส่งซ้ำฉบับที่ล้มเหลว</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {resendableIds.length > 0 && (
            <button
              type="button"
              disabled={resending !== null}
              onClick={() => resend(resendableIds, 'all')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0026b3] hover:bg-[#001f94] disabled:opacity-60 text-white rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap"
            >
              <Send className={`w-3.5 h-3.5 ${resending === 'all' ? 'animate-pulse' : ''}`} />
              <span>ส่งซ้ำทั้งหมด {resendableIds.length} ฉบับ</span>
            </button>
          )}
          <button
            type="button"
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'ส่งสำเร็จ', value: summary.sent, cls: 'text-emerald-700' },
            { label: 'ส่งไม่สำเร็จ', value: summary.failed, cls: 'text-rose-700' },
            { label: 'ยังไม่ได้ส่งซ้ำ', value: summary.unresolvedFailed, cls: 'text-rose-700' },
            { label: 'ไม่ได้ส่งเพราะยังไม่ตั้งค่า SMTP', value: summary.fallback, cls: 'text-amber-700' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-slate-200/90 p-3">
              <div className="text-[11px] font-bold text-slate-500">{s.label}</div>
              <div className={`text-xl font-black ${s.cls}`}>{s.value.toLocaleString('th-TH')}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
        >
          <option value="failed">เฉพาะที่ส่งไม่สำเร็จ</option>
          <option value="all">ทั้งหมด</option>
          <option value="sent">เฉพาะที่ส่งสำเร็จ</option>
          <option value="fallback">ไม่ได้ส่งเพราะยังไม่ตั้งค่า SMTP</option>
        </select>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
        >
          <option value={1}>24 ชั่วโมงล่าสุด</option>
          <option value={7}>7 วันล่าสุด</option>
          <option value={30}>30 วันล่าสุด</option>
          <option value={90}>90 วันล่าสุด</option>
        </select>
        <form
          className="flex-1 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            fetchLogs();
          }}
        >
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาอีเมลผู้รับหรือหัวข้อ"
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700"
            />
          </div>
          <button type="submit" className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">
            ค้นหา
          </button>
        </form>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดประวัติ...</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-700">ไม่พบรายการ</div>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">ระบบเริ่มบันทึกประวัติการส่งอีเมลตั้งแต่อัปเดตเวอร์ชันนี้เป็นต้นไป</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-3 whitespace-nowrap">เวลา</th>
                <th className="py-3 px-3">ผู้รับ</th>
                <th className="py-3 px-3">หัวข้อ</th>
                <th className="py-3 px-3">สถานะ</th>
                <th className="py-3 px-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition align-top">
                  <td className="py-3 px-3 text-slate-500 whitespace-nowrap">{formatDateTime(r.at)}</td>
                  <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">{r.to}</td>
                  <td className="py-3 px-3 text-slate-700 min-w-[220px]">{r.subject}</td>
                  <td className="py-3 px-3 min-w-[160px]">
                    <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-black border whitespace-nowrap ${STATUS_STYLE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.status === 'failed' && r.resentAt && (
                      <div className="mt-1 text-[10px] font-bold text-emerald-700">ส่งซ้ำสำเร็จ {formatDateTime(r.resentAt)}</div>
                    )}
                    {r.error && (
                      <div className="mt-1 flex items-start gap-1 text-[10px] text-slate-500 break-all">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>
                          {r.error}
                          {r.attempts > 1 ? ` · ลอง ${r.attempts} ครั้ง` : ''}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {r.canResend && (
                      <button
                        type="button"
                        disabled={resending !== null}
                        onClick={() => resend([r.id], r.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 text-[#0026b3] rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap"
                      >
                        <Send className={`w-3 h-3 ${resending === r.id ? 'animate-pulse' : ''}`} />
                        ส่งซ้ำ
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
