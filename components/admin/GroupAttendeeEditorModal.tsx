'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, RotateCw, Search, Trash2, UserPlus, Pencil, X } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export type GroupAttendeeEditorTarget = {
  slipId: string;
  ticketCode?: string | null;
  slipStatus: string;
  slipAmount: number;
  mode: 'create' | 'update' | 'delete';
  attendeeIndex: number | null;
  attendee: any | null;
};

type MeetingActivity = {
  id: string;
  name: string;
  type: string;
  format: string | null;
  maxSeats: number;
  prices: { onsiteMember: number; onsiteNonMember: number; onlineMember: number; onlineNonMember: number };
};

type FormState = {
  memberNo: string;
  nameTh: string;
  nameEn: string;
  email: string;
  phone: string;
  workplace: string;
  position: string;
  dietaryPreference: string;
  attendanceType: 'onsite' | 'online';
  programIds: string[];
  originalTotal: string;
  discountTotal: string;
};

const isMainActivity = (a: { id?: string; type?: string }) => a.type === 'main' || a.id === 'main';

function initialProgramIds(att: any): string[] {
  if (!att) return [];
  const ids: string[] = [];
  const lists = [att.selectedActivities, att.activities, att.selectedActivityObjects];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const a of list) {
      const id = typeof a === 'object' && a !== null ? a.id : a;
      if (id !== undefined && id !== null && id !== '') ids.push(String(id));
    }
    if (ids.length > 0) break;
  }
  if (ids.length === 0) {
    const raw = att.selectedProgramIds || att.selectedPrograms;
    if (Array.isArray(raw)) raw.forEach((id: any) => ids.push(String(id)));
  }
  return Array.from(new Set(ids));
}

function initialForm(att: any): FormState {
  let fmt = att?.selectedFormat || att?.attendanceType || att?.format;
  if (fmt === 'both') fmt = att?.attendanceType;
  const original = Number(att?.originalTotal || att?.subtotal || 0);
  const discount = Number(att?.discountTotal ?? att?.discountAmount ?? 0);
  return {
    memberNo: att?.memberNo ? String(att.memberNo) : '',
    nameTh: att?.nameTh || att?.fullNameTh || '',
    nameEn: att?.nameEn || att?.fullNameEn || '',
    email: att?.email || '',
    phone: att?.phone || att?.mobile || '',
    workplace: att?.workplace || '',
    position: att?.position || '',
    dietaryPreference: att?.dietaryPreference || '',
    attendanceType: fmt === 'online' ? 'online' : 'onsite',
    programIds: initialProgramIds(att),
    originalTotal: att ? String(original || Number(att?.price || 0) + discount) : '0',
    discountTotal: att ? String(discount) : '0',
  };
}

/** จับคู่กิจกรรมเดิมของผู้ลงทะเบียนกับกิจกรรมของงานประชุม (รายการเก่าบางรายการเก็บเป็นชื่อ ไม่มีรหัส) */
function matchProgramIds(current: string[], att: any, activities: MeetingActivity[]): string[] {
  const known = current.filter((id) => activities.some((a) => a.id === id));
  if (!att || (known.length === current.length && known.length > 0)) return known;
  const names = [
    ...(Array.isArray(att.selectedActivities) ? att.selectedActivities : []),
    ...(Array.isArray(att.selectedActivityObjects) ? att.selectedActivityObjects : []),
  ].map((a: any) => String(typeof a === 'object' && a ? a.name || a.title || '' : a).trim().toLowerCase());
  if (att.programNameTh) names.push(String(att.programNameTh).trim().toLowerCase());
  const byName = activities.filter((a) => names.includes(a.name.trim().toLowerCase())).map((a) => a.id);
  const merged = Array.from(new Set([...known, ...byName]));
  // ไม่มีข้อมูลกิจกรรมเลย = ลงเฉพาะการประชุมหลัก
  if (merged.length === 0) {
    const main = activities.find(isMainActivity);
    if (main) merged.push(main.id);
  }
  return merged;
}

export function GroupAttendeeEditorModal({
  target,
  onClose,
  onSaved,
}: {
  target: GroupAttendeeEditorTarget;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { lang } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [activities, setActivities] = useState<MeetingActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [form, setForm] = useState<FormState>(() => initialForm(target.attendee));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lookupState, setLookupState] = useState<{ loading: boolean; message: string; ok: boolean | null }>({
    loading: false,
    message: '',
    ok: null,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch(`/api/admin/slips/attendees?slipId=${encodeURIComponent(target.slipId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.success) {
          setError(json.error || 'ไม่สามารถโหลดรายการหลักสูตรได้');
          return;
        }
        const acts: MeetingActivity[] = json.data.activities || [];
        setActivities(acts);
        setForm((prev) => ({ ...prev, programIds: matchProgramIds(prev.programIds, target.attendee, acts) }));
      })
      .catch(() => setError('ไม่สามารถโหลดรายการหลักสูตรได้'))
      .finally(() => setLoadingActivities(false));
  }, [target]);

  const isMember = Boolean(form.memberNo.trim());

  const suggestedTotal = useMemo(() => {
    return form.programIds.reduce((sum, id) => {
      const act = activities.find((a) => a.id === id);
      if (!act) return sum;
      const fmt = isMainActivity(act) || act.format === 'both' || !act.format ? form.attendanceType : act.format;
      const key = `${fmt === 'online' ? 'online' : 'onsite'}${isMember ? 'Member' : 'NonMember'}` as keyof MeetingActivity['prices'];
      return sum + (Number(act.prices[key]) || 0);
    }, 0);
  }, [form.programIds, form.attendanceType, activities, isMember]);

  const originalNum = Math.max(0, Math.round(Number(form.originalTotal) || 0));
  const discountNum = Math.min(originalNum, Math.max(0, Math.round(Number(form.discountTotal) || 0)));
  const netNum = originalNum - discountNum;
  const previousNet = target.attendee
    ? Number(
        target.attendee.price ??
          Math.max(0, Number(target.attendee.originalTotal || target.attendee.subtotal || 0) - Number(target.attendee.discountTotal || 0))
      ) || 0
    : 0;

  if (!mounted) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleProgram = (id: string) =>
    setForm((prev) => ({
      ...prev,
      programIds: prev.programIds.includes(id) ? prev.programIds.filter((x) => x !== id) : [...prev.programIds, id],
    }));

  const handleLookup = async () => {
    const no = form.memberNo.trim();
    if (!no) return;
    setLookupState({ loading: true, message: '', ok: null });
    try {
      const res = await fetch(`/api/admin/slips/attendees?memberNo=${encodeURIComponent(no)}`);
      const json = await res.json();
      if (!json.success) {
        setLookupState({ loading: false, message: json.error || 'ไม่พบข้อมูลสมาชิก', ok: false });
        return;
      }
      const m = json.data;
      setForm((prev) => ({
        ...prev,
        memberNo: m.memberNo,
        nameTh: m.nameTh || prev.nameTh,
        nameEn: m.nameEn || prev.nameEn,
        email: prev.email || m.email,
        phone: prev.phone || m.phone,
        workplace: prev.workplace || m.workplace,
        position: prev.position || m.position,
      }));
      setLookupState({
        loading: false,
        ok: m.isActive,
        message: m.isActive
          ? `พบสมาชิก ${m.nameTh || m.nameEn} สถานะปกติ`
          : `พบสมาชิก ${m.nameTh || m.nameEn} สถานะ "${m.membershipStatus}" ไม่สามารถรับส่วนลดคูปองได้`,
      });
    } catch {
      setLookupState({ loading: false, message: 'ไม่สามารถตรวจสอบเลขสมาชิกได้', ok: false });
    }
  };

  const handleSubmit = async () => {
    if (target.mode !== 'delete' && form.programIds.length === 0) {
      setError('กรุณาเลือกหลักสูตรหรือกิจกรรมอย่างน้อย 1 รายการ');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/slips/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slipId: target.slipId,
          action: target.mode,
          attendeeIndex: target.attendeeIndex,
          reason,
          attendee:
            target.mode === 'delete'
              ? undefined
              : { ...form, originalTotal: originalNum, discountTotal: discountNum },
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'ไม่สามารถบันทึกได้');
        return;
      }
      onSaved(
        target.mode === 'create'
          ? '✓ เพิ่มผู้ลงทะเบียนเรียบร้อยแล้ว'
          : target.mode === 'update'
            ? '✓ แก้ไขข้อมูลผู้ลงทะเบียนเรียบร้อยแล้ว'
            : `✓ ลบรายชื่อออกเรียบร้อยแล้ว${json.data?.couponRightsDelta < 0 ? ' คืนสิทธิ์คูปอง 1 สิทธิ์' : ''}${
                Array.isArray(json.data?.seatsReturned) && json.data.seatsReturned.length > 0
                  ? ` คืนที่นั่ง ${json.data.seatsReturned.map((x: any) => x.name).join(', ')}`
                  : ''
              }`
      );
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) onClose();
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 disabled:bg-slate-50';
  const labelCls = 'block text-[11px] font-bold text-slate-500 mb-1';
  const attName = target.attendee?.nameTh || target.attendee?.nameEn || '';
  const isApproved = target.slipStatus === 'approved';

  const title =
    target.mode === 'create'
      ? lang === 'th' ? 'เพิ่มผู้ลงทะเบียนในกลุ่ม' : 'Add Group Attendee'
      : target.mode === 'update'
        ? lang === 'th' ? 'แก้ไขข้อมูลผู้ลงทะเบียน' : 'Edit Attendee'
        : lang === 'th' ? 'ลบรายชื่อผู้ลงทะเบียน' : 'Remove Attendee';

  const HeaderIcon = target.mode === 'create' ? UserPlus : target.mode === 'update' ? Pencil : Trash2;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div
        className={`bg-white rounded-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto ${
          target.mode === 'delete' ? 'max-w-md' : 'max-w-2xl'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${target.mode === 'delete' ? 'bg-rose-50 text-rose-600' : 'bg-sky-50 text-sky-600'}`}>
              <HeaderIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">
                {attName ? `${attName} · ` : ''}
                {target.ticketCode || target.slipId}
              </p>
            </div>
          </div>
          <button
            onClick={close}
            disabled={saving}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {target.mode === 'delete' ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700 leading-relaxed">
              ต้องการลบรายชื่อ <strong>{attName || 'ผู้ลงทะเบียนท่านนี้'}</strong> ออกจากรายการกลุ่มนี้หรือไม่
            </p>
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2 bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <div>
                <span className="block text-[11px] font-bold text-amber-700">ยอดเดิม</span>
                <span className="text-2xl font-black text-amber-950 font-mono leading-none">
                  ฿{target.slipAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="block text-[11px] font-bold text-slate-500">ยอดหลังลบรายชื่อ</span>
                <span className="text-sm font-bold text-slate-600 font-mono">
                  ฿{Math.max(0, target.slipAmount - previousNet).toLocaleString()}
                </span>
              </div>
            </div>
            {(() => {
              const returnsCoupon = !target.attendee?.isAddOn && Number(target.attendee?.discountTotal ?? target.attendee?.discountAmount ?? 0) > 0;
              const seatActs = activities.filter((a) => a.maxSeats > 0 && form.programIds.includes(a.id));
              if (loadingActivities) {
                return (
                  <div className="text-xs text-slate-500 flex items-center gap-2">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" /> กำลังคำนวณสิทธิ์และที่นั่งที่จะคืน...
                  </div>
                );
              }
              if (!returnsCoupon && seatActs.length === 0) return null;
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 space-y-1 text-xs text-emerald-900">
                  <span className="block text-[11px] font-bold text-emerald-700">สิ่งที่จะคืนเมื่อลบรายชื่อ</span>
                  {returnsCoupon && <p>• คืนสิทธิ์คูปองบริษัท 1 สิทธิ์ ให้บริษัทนำไปใช้ลงทะเบียนใหม่ได้</p>}
                  {seatActs.map((a) => (
                    <p key={a.id}>• คืนที่นั่ง {a.name} 1 ที่นั่ง</p>
                  ))}
                </div>
              );
            })()}
            <p className="text-[11px] text-slate-500">
              ระบบจะบันทึกโน้ตการลบรายชื่อพร้อมยอดเดิมและยอดหลังลบไว้ในรายการนี้ ผู้ที่ถูกลบรายชื่อออกสามารถให้บริษัทลงทะเบียนใหม่เป็นรายการแยกได้
            </p>
            {isApproved && (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 p-2.5 rounded-xl leading-relaxed">
                รายการนี้อนุมัติแล้ว ระบบจะยกเลิกสิทธิ์เข้าร่วมงานและนำชื่อออกจากรายชื่อของบริษัท
                หากผู้ลงทะเบียนเช็กอินแล้วจะลบไม่ได้
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* ข้อมูลผู้ลงทะเบียน */}
            <div className="space-y-3">
              <div>
                <label className={labelCls}>เลขสมาชิก (เว้นว่างหากเป็นบุคคลทั่วไป)</label>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    value={form.memberNo}
                    onChange={(e) => {
                      set('memberNo', e.target.value);
                      setLookupState({ loading: false, message: '', ok: null });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleLookup();
                      }
                    }}
                    placeholder="เช่น 0314"
                    disabled={saving}
                  />
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={saving || lookupState.loading || !form.memberNo.trim()}
                    className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    {lookupState.loading ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>ตรวจสอบ</span>
                  </button>
                </div>
                {lookupState.message && (
                  <p className={`mt-1 text-[11px] font-medium ${lookupState.ok ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {lookupState.message}
                  </p>
                )}
                {isMember && (
                  <p className="mt-1 text-[11px] text-slate-400">ระบบจะใช้ชื่อตามทะเบียนสมาชิกเมื่อบันทึก</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>ชื่อ-นามสกุล ภาษาไทย</label>
                  <input className={inputCls} value={form.nameTh} onChange={(e) => set('nameTh', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className={labelCls}>ชื่อ-นามสกุล ภาษาอังกฤษ</label>
                  <input className={inputCls} value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className={labelCls}>อีเมล</label>
                  <input
                    type="email"
                    className={inputCls}
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelCls}>เบอร์โทรศัพท์</label>
                  <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className={labelCls}>หน่วยงาน</label>
                  <input className={inputCls} value={form.workplace} onChange={(e) => set('workplace', e.target.value)} disabled={saving} />
                </div>
                <div>
                  <label className={labelCls}>ตำแหน่ง</label>
                  <input className={inputCls} value={form.position} onChange={(e) => set('position', e.target.value)} disabled={saving} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls}>อาหาร</label>
                  <input
                    className={inputCls}
                    value={form.dietaryPreference}
                    onChange={(e) => set('dietaryPreference', e.target.value)}
                    placeholder="เช่น ทั่วไป มังสวิรัติ ฮาลาล"
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            {/* รูปแบบและหลักสูตร */}
            <div className="space-y-2">
              <label className={labelCls}>รูปแบบการเข้าร่วม</label>
              <div className="grid grid-cols-2 gap-2">
                {(['onsite', 'online'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => set('attendanceType', opt)}
                    disabled={saving}
                    className={`px-3 py-2 rounded-xl border-2 text-sm font-bold transition cursor-pointer ${
                      form.attendanceType === opt
                        ? 'border-sky-500 bg-sky-50 text-sky-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {opt === 'online' ? 'ออนไลน์' : 'ออนไซต์'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className={labelCls}>หลักสูตร / กิจกรรมที่ลงทะเบียน</label>
              {loadingActivities ? (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" /> กำลังโหลดรายการหลักสูตร...
                </div>
              ) : (
                <div className="space-y-1.5">
                  {activities.map((act) => {
                    const checked = form.programIds.includes(act.id);
                    const fmt = isMainActivity(act) || act.format === 'both' || !act.format ? form.attendanceType : act.format;
                    const key = `${fmt === 'online' ? 'online' : 'onsite'}${isMember ? 'Member' : 'NonMember'}` as keyof MeetingActivity['prices'];
                    return (
                      <label
                        key={act.id}
                        className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border cursor-pointer transition ${
                          checked ? 'border-sky-400 bg-sky-50/70' : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleProgram(act.id)}
                            disabled={saving}
                            className="w-4 h-4 accent-sky-600"
                          />
                          <span className="text-sm font-bold text-slate-800 truncate">{act.name}</span>
                          {act.format && act.format !== 'both' && !isMainActivity(act) && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {act.format === 'online' ? 'ออนไลน์' : 'ออนไซต์'}
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600 shrink-0">
                          ฿{Number(act.prices[key] || 0).toLocaleString()}
                        </span>
                      </label>
                    );
                  })}
                  {activities.length === 0 && <p className="text-xs text-slate-500">งานประชุมนี้ยังไม่มีรายการหลักสูตร</p>}
                </div>
              )}
            </div>

            {/* ราคา */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>ราคาเต็ม</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={form.originalTotal}
                    onChange={(e) => set('originalTotal', e.target.value)}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className={labelCls}>ส่วนลดคูปอง</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={form.discountTotal}
                    onChange={(e) => set('discountTotal', e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => set('originalTotal', String(suggestedTotal))}
                  disabled={saving || suggestedTotal === originalNum}
                  className="text-sky-700 hover:text-sky-900 font-bold underline underline-offset-2 cursor-pointer disabled:no-underline disabled:text-slate-400 disabled:cursor-default"
                >
                  ใช้ราคาตามหลักสูตรที่เลือก ฿{suggestedTotal.toLocaleString()}
                </button>
                <span className="font-black text-slate-900">
                  ราคาสุทธิ ฿{netNum.toLocaleString()}
                  {target.mode === 'update' && netNum !== previousNet && (
                    <span className={`ml-1.5 font-bold ${netNum > previousNet ? 'text-amber-700' : 'text-emerald-700'}`}>
                      {netNum > previousNet ? '+' : '-'}฿{Math.abs(netNum - previousNet).toLocaleString()}
                    </span>
                  )}
                </span>
              </div>
              {discountNum > 0 && !isMember && (
                <p className="text-[11px] text-rose-600">คูปองบริษัทใช้ได้เฉพาะสมาชิกสถานะปกติ กรุณาตั้งส่วนลดเป็น 0</p>
              )}
            </div>

            {isApproved && (
              <p className="text-[11px] text-amber-900 bg-amber-50 border border-amber-200 p-2.5 rounded-xl leading-relaxed">
                รายการนี้อนุมัติแล้ว ระบบจะปรับสิทธิ์เข้าร่วมงานและรายชื่อของบริษัทให้ตรงกับข้อมูลใหม่
                หากยอดเงินเปลี่ยน กรุณาติดต่อบริษัทเพื่อชำระเพิ่มหรือคืนเงินส่วนต่าง
              </p>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>เหตุผลการแก้ไข</label>
          <input
            className={inputCls}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="เช่น บริษัทแจ้งว่าลงชื่อผิดคน"
            maxLength={300}
            disabled={saving}
          />
          <p className="mt-1 text-[11px] text-slate-400">บันทึกไว้ในบันทึกจากผู้ดูแลระบบของรายการนี้ ระบบไม่ส่งอีเมลแจ้งอัตโนมัติ</p>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            onClick={close}
            disabled={saving}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || (target.mode !== 'delete' && loadingActivities)}
            className={`px-5 py-2.5 text-white text-xs font-black rounded-xl transition cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5 ${
              target.mode === 'delete' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {saving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>กำลังบันทึก...</span>
              </>
            ) : (
              <>
                {target.mode === 'delete' ? <Trash2 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                <span>
                  {target.mode === 'create' ? 'เพิ่มผู้ลงทะเบียน' : target.mode === 'update' ? 'บันทึกการแก้ไข' : 'ยืนยันลบรายชื่อ'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
