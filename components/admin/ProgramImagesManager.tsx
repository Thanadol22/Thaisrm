'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ImagePlus, Images, Pencil, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import { Btn, Field, inputCls } from '@/components/admin/ui';
import { ThaiDatePicker } from '@/components/ThaiDatePicker';
import { uploadImageToStorage } from '@/lib/blobUpload';
import { formatProgramDate, programKindLabel, type ProgramImage } from '@/lib/programSchedule';

interface MeetingOption {
  meeting_id: string;
  meeting_name: string;
  start_date?: string | null;
  meeting_date?: string | null;
  status?: string | null;
}

interface FormState {
  id: string | null;
  programDate: string;
  kind: 'main' | 'workshop';
  workshopNo: string;
  topic: string;
  sortOrder: string;
  imageUrl: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  programDate: '',
  kind: 'main',
  workshopNo: '',
  topic: '',
  sortOrder: '0',
  imageUrl: '',
};

interface ProgramImagesManagerProps {
  onShowToast?: (message: string) => void;
}

/**
 * จัดการรูปตารางกิจกรรมของแต่ละการประชุม (แสดงเมื่อผู้ใช้กด "ดูรายการกิจกรรม" ในหน้าลงทะเบียน)
 * บันทึกทันทีทุกครั้งที่เพิ่ม/แก้ไข/ลบ แยกจากปุ่มบันทึกการตั้งค่าระบบ
 */
export function ProgramImagesManager({ onShowToast }: ProgramImagesManagerProps) {
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [meetingId, setMeetingId] = useState('');
  const [images, setImages] = useState<ProgramImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/program-images?meetingId=${encodeURIComponent(id)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setImages(json.data);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'ไม่สามารถโหลดรูปตารางกิจกรรมได้');
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const changeMeeting = (id: string) => {
    setMeetingId(id);
    setForm(null);
    if (id) loadImages(id);
  };

  // รายชื่อการประชุม: เลือกงานที่ยังไม่จัด/กำลังจัดเป็นค่าเริ่มต้น
  useEffect(() => {
    fetch('/api/meetings?limit=100&sort_by=meeting_date&order=desc')
      .then((res) => res.json())
      .then((json) => {
        if (!json.success || !Array.isArray(json.data)) return;
        const list: MeetingOption[] = json.data;
        setMeetings(list);
        const preferred = list.find((m) => m.status === 'upcoming' || m.status === 'active') ?? list[0];
        if (preferred) {
          setMeetingId(preferred.meeting_id);
          loadImages(preferred.meeting_id);
        }
      })
      .catch(() => setError('ไม่สามารถโหลดรายชื่อการประชุมได้'));
  }, [loadImages]);

  // ตัวอย่างรูปที่เลือกก่อนอัปโหลด (คืนหน่วยความจำเมื่อเปลี่ยนไฟล์)
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedMeeting = meetings.find((m) => m.meeting_id === meetingId);

  const openCreate = () => {
    const defaultDate = (selectedMeeting?.start_date || selectedMeeting?.meeting_date || '').slice(0, 10);
    setForm({ ...EMPTY_FORM, programDate: defaultDate });
    setFile(null);
  };

  const openEdit = (img: ProgramImage) => {
    setForm({
      id: img.id,
      programDate: img.date,
      kind: img.kind,
      workshopNo: img.workshopNo ? String(img.workshopNo) : '',
      topic: img.topic,
      sortOrder: String(img.sortOrder),
      imageUrl: img.src,
    });
    setFile(null);
  };

  const closeForm = () => {
    setForm(null);
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!form || !meetingId) return;
    if (!form.programDate) {
      onShowToast?.('กรุณาเลือกวันที่ของโปรแกรม');
      return;
    }
    if (!file && !form.imageUrl) {
      onShowToast?.('กรุณาเลือกรูปตารางกิจกรรม');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (file) {
        const uploaded = await uploadImageToStorage(file, 'programs');
        imageUrl = uploaded.url;
      }
      const payload = {
        meetingId,
        programDate: form.programDate,
        kind: form.kind,
        workshopNo: form.kind === 'workshop' ? Number(form.workshopNo) : null,
        topic: form.topic,
        sortOrder: Number(form.sortOrder || 0),
        imageUrl,
      };
      const res = await fetch(form.id ? `/api/admin/program-images/${form.id}` : '/api/admin/program-images', {
        method: form.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onShowToast?.(form.id ? 'แก้ไขรูปตารางกิจกรรมเรียบร้อยแล้ว' : 'เพิ่มรูปตารางกิจกรรมเรียบร้อยแล้ว');
      closeForm();
      await loadImages(meetingId);
    } catch (err) {
      onShowToast?.(err instanceof Error && err.message ? err.message : 'บันทึกรูปตารางกิจกรรมไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (img: ProgramImage) => {
    const label = `${formatProgramDate(img.date, 'th')} ${programKindLabel(img, 'th')}`;
    if (!window.confirm(`ลบรูปตารางกิจกรรม "${label}" ใช่หรือไม่`)) return;
    setDeletingId(img.id);
    try {
      const res = await fetch(`/api/admin/program-images/${img.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onShowToast?.('ลบรูปตารางกิจกรรมเรียบร้อยแล้ว');
      if (form?.id === img.id) closeForm();
      setImages((list) => list.filter((i) => i.id !== img.id));
    } catch (err) {
      onShowToast?.(err instanceof Error && err.message ? err.message : 'ลบรูปไม่สำเร็จ');
    } finally {
      setDeletingId(null);
    }
  };

  const formPreview = previewUrl || form?.imageUrl || null;

  return (
    // ส่วนนี้อยู่ในฟอร์มตั้งค่าระบบ: กัน Enter ไม่ให้ไปกดบันทึกการตั้งค่าโดยไม่ตั้งใจ
    <div
      className="space-y-5"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
        <Field label="การประชุม" hint="รูปที่เพิ่มจะแสดงในหน้าลงทะเบียนของการประชุมนี้ เรียงตามวันอัตโนมัติ">
          <select value={meetingId} onChange={(e) => changeMeeting(e.target.value)} className={inputCls}>
            {meetings.length === 0 && <option value="">กำลังโหลด...</option>}
            {meetings.map((m) => (
              <option key={m.meeting_id} value={m.meeting_id}>
                {m.meeting_name} · {m.meeting_id}
              </option>
            ))}
          </select>
        </Field>
        <Btn variant="primary" icon={Plus} onClick={openCreate} disabled={!meetingId || saving}>
          เพิ่มรูปตารางกิจกรรม
        </Btn>
      </div>

      {/* ฟอร์มเพิ่ม/แก้ไข */}
      {form && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 sm:p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-[#0026b3]" />
              {form.id ? 'แก้ไขรูปตารางกิจกรรม' : 'เพิ่มรูปตารางกิจกรรม'}
            </p>
            <Btn variant="ghost" size="sm" icon={X} onClick={closeForm} disabled={saving}>
              ยกเลิก
            </Btn>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-5">
            {/* รูป */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-full aspect-[1240/1754] rounded-xl border-2 border-dashed border-slate-300 bg-white hover:border-[#0026b3] overflow-hidden flex flex-col items-center justify-center gap-2 text-slate-500 cursor-pointer transition"
              >
                {formPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={formPreview} alt="ตัวอย่างรูปตารางกิจกรรม" className="absolute inset-0 w-full h-full object-cover object-top" />
                ) : (
                  <>
                    <Upload className="w-6 h-6" />
                    <span className="text-xs font-bold">เลือกรูป</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {formPreview ? 'กดที่รูปเพื่อเปลี่ยน' : 'รองรับ JPG, PNG, WEBP'} · ระบบปรับขนาดไม่เกิน 2400px ให้อัตโนมัติ
              </p>
            </div>

            {/* ข้อมูล */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
              <Field label="วันที่ของโปรแกรม" required hint="ใช้เรียงลำดับและแสดงบนปุ่มเลือกวัน">
                <ThaiDatePicker
                  value={form.programDate}
                  onChange={(val) => setForm((f) => (f ? { ...f, programDate: val } : f))}
                  outputFormat="iso"
                  placeholder="เลือกวันที่"
                />
              </Field>

              <Field label="ประเภท" required>
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                  {(['main', 'workshop'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm((f) => (f ? { ...f, kind: k } : f))}
                      className={`py-2 rounded-lg text-sm font-bold transition cursor-pointer ${
                        form.kind === k ? 'bg-white text-[#0026b3] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {k === 'main' ? 'โปรแกรมหลัก' : 'เวิร์กช็อป'}
                    </button>
                  ))}
                </div>
              </Field>

              {form.kind === 'workshop' && (
                <Field label="หมายเลขเวิร์กช็อป" required hint="เช่น 1 จะแสดงเป็น เวิร์กช็อป 1">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={form.workshopNo}
                    onChange={(e) => setForm((f) => (f ? { ...f, workshopNo: e.target.value } : f))}
                    className={inputCls}
                    placeholder="1"
                  />
                </Field>
              )}

              <Field label="หัวข้อ" hint="แสดงใต้รูป เช่น ART Nurse" className={form.kind === 'workshop' ? '' : 'sm:col-span-2'}>
                <input
                  type="text"
                  maxLength={255}
                  value={form.topic}
                  onChange={(e) => setForm((f) => (f ? { ...f, topic: e.target.value } : f))}
                  className={inputCls}
                  placeholder="ชื่อโปรแกรมหรือหัวข้อเวิร์กช็อป"
                />
              </Field>

              <Field label="ลำดับเพิ่มเติม" hint="ใช้เมื่อมีหลายรูปในวันและประเภทเดียวกัน ตัวเลขน้อยแสดงก่อน">
                <input
                  type="number"
                  min={0}
                  max={999}
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => (f ? { ...f, sortOrder: e.target.value } : f))}
                  className={inputCls}
                />
              </Field>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-1">
                <Btn onClick={closeForm} disabled={saving}>
                  ยกเลิก
                </Btn>
                <Btn variant="primary" icon={Save} loading={saving} onClick={handleSave}>
                  {saving ? 'กำลังบันทึก...' : form.id ? 'บันทึกการแก้ไข' : 'เพิ่มรูป'}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* รายการรูป */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500 py-6 justify-center">
          <span className="w-4 h-4 border-2 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
          กำลังโหลดรูปตารางกิจกรรม...
        </div>
      ) : images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center space-y-1">
          <Images className="w-7 h-7 text-slate-400 mx-auto" />
          <p className="text-sm font-bold text-slate-700">ยังไม่มีรูปตารางกิจกรรมของการประชุมนี้</p>
          <p className="text-xs text-slate-500">
            เมื่อยังไม่มีรูป ปุ่ม &quot;ดูรายการกิจกรรม&quot; ในหน้าลงทะเบียนจะพาไปที่รายการกิจกรรมในแบบฟอร์มแทน
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className={`rounded-2xl border bg-white overflow-hidden shadow-2xs flex flex-col ${
                form?.id === img.id ? 'border-[#0026b3] ring-2 ring-[#0026b3]/20' : 'border-slate-200'
              }`}
            >
              <div className="relative aspect-[1240/1754] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt={img.topic || programKindLabel(img, 'th')} className="absolute inset-0 w-full h-full object-cover object-top" />
                <span className="absolute top-2 left-2 w-7 h-7 rounded-full bg-[#0026b3] text-white text-xs font-black flex items-center justify-center shadow">
                  {idx + 1}
                </span>
              </div>
              <div className="p-3 space-y-1 flex-1">
                <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                  {formatProgramDate(img.date, 'th')}
                </p>
                <p className="text-sm font-extrabold text-[#0026b3]">{programKindLabel(img, 'th')}</p>
                {img.topic && <p className="text-xs text-slate-700 line-clamp-2">{img.topic}</p>}
              </div>
              <div className="grid grid-cols-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openEdit(img)}
                  className="flex items-center justify-center gap-1 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" /> แก้ไข
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(img)}
                  disabled={deletingId === img.id}
                  className="flex items-center justify-center gap-1 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 border-l border-slate-100 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {deletingId === img.id ? 'กำลังลบ...' : 'ลบ'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
