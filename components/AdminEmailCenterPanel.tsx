'use client';

import React, { useState, useEffect } from 'react';
import { AdminPageHeader, HeaderTabs } from '@/components/admin/AdminPageHeader';
import { Btn } from '@/components/admin/ui';
import {
  QrCode,
  Send,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  HelpCircle,
  Server,
  Check,
  Zap,
  Globe,
  Laptop,
  Video,
  ExternalLink,
  History,
  Building2,
} from 'lucide-react';
import { EmailPreviewModal } from '@/components/EmailPreviewModal';
import { ThaiDatePicker } from '@/components/ThaiDatePicker';
import { renderAttendeeTicketEmail } from '@/lib/emailTemplates/attendeeQrTemplate';
import { renderCustomBroadcastEmail } from '@/lib/emailTemplates/customTemplate';
import { formatThaiDate, DailyProgramInfo, programSupportsFormat } from '@/lib/services/dailyCheckinService';

import { statusLabelTh } from '@/lib/statusLabels';
import { OnlineAttendeesPanel } from '@/components/admin/OnlineAttendeesPanel';
import { EmailLogPanel } from '@/components/admin/EmailLogPanel';
import { SponsorHistoryEmailPanel } from '@/components/admin/SponsorHistoryEmailPanel';
interface MeetingOption {
  meeting_id: string;
  meeting_name: string;
  meeting_date: string;
  location?: string;
}

interface AdminEmailCenterPanelProps {
  onShowToast?: (message: string) => void;
}

type EmailSubTab = 'tickets' | 'online' | 'sponsors' | 'composer' | 'logs' | 'smtp';

export function AdminEmailCenterPanel({ onShowToast }: AdminEmailCenterPanelProps) {
  const [activeSubTab, setActiveSubTab] = useState<EmailSubTab>('tickets');
  const [meetings, setMeetings] = useState<MeetingOption[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(false);

  // --- Sub-Tab 1: Ticket Dispatch State ---
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('Registered');
  const [extraNote, setExtraNote] = useState<string>('');
  const [isDailyPassMode, setIsDailyPassMode] = useState<boolean>(true);
  const [selectedDailyDate, setSelectedDailyDate] = useState<string>('');
  const [selectedDailyProgramKeys, setSelectedDailyProgramKeys] = useState<string[]>([]);
  const [dailyPrograms, setDailyPrograms] = useState<DailyProgramInfo[]>([]);
  const [loadingDailyPrograms, setLoadingDailyPrograms] = useState(false);
  const [sendingTickets, setSendingTickets] = useState(false);
  const [ticketSendProgress, setTicketSendProgress] = useState<{
    total: number;
    success: number;
    failed: number;
    message?: string;
  } | null>(null);

  // --- Sub-Tab 2: Custom Composer State ---
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<'all_members' | 'active_members' | 'meeting_attendees' | 'custom'>('all_members');
  const [targetMeetingId, setTargetMeetingId] = useState('');
  const [customEmails, setCustomEmails] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingCustom, setSendingCustom] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // --- Sub-Tab 4: SMTP State ---
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatusMessage, setSmtpStatusMessage] = useState<string | null>(null);
  const [smtpTestEmail, setSmtpTestEmail] = useState('');

  // --- Preview Modal State ---
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');

  // 1. Fetch meetings list on mount
  useEffect(() => {
    async function loadMeetings() {
      try {
        setLoadingMeetings(true);
        const res = await fetch('/api/meetings');
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMeetings(json.data);
          if (json.data.length > 0 && !selectedMeetingId) {
            setSelectedMeetingId(json.data[0].meeting_id);
            setTargetMeetingId(json.data[0].meeting_id);
          }
        }
      } catch (err) {
        console.error('Failed to load meetings:', err);
      } finally {
        setLoadingMeetings(false);
      }
    }
    loadMeetings();
  }, []);

  // 1.1 Fetch Daily Programs whenever selectedMeetingId changes
  useEffect(() => {
    if (!selectedMeetingId) return;
    async function loadDailyPrograms() {
      try {
        setLoadingDailyPrograms(true);
        const res = await fetch(`/api/meetings/${selectedMeetingId}/daily-programs`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data?.programs)) {
          const progs: DailyProgramInfo[] = json.data.programs;
          setDailyPrograms(progs);
          if (progs.length > 0) {
            const first = progs[0];
            setSelectedDailyDate(first.date);
            const firstKey = first.id || `${first.date}_${first.programName}`;
            setSelectedDailyProgramKeys([firstKey]);
          } else {
            setSelectedDailyProgramKeys([]);
          }
        }
      } catch (err) {
        console.error('Failed to load daily programs:', err);
      } finally {
        setLoadingDailyPrograms(false);
      }
    }
    loadDailyPrograms();
  }, [selectedMeetingId]);

  // Sorted programs (earliest date first)
  const sortedDailyPrograms = React.useMemo(() => {
    return [...dailyPrograms].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.programName || '').localeCompare(b.programName || '');
    });
  }, [dailyPrograms]);

  // Selected Program objects helper (supports multi-selection)
  const selectedPrograms = React.useMemo(() => {
    if (sortedDailyPrograms.length === 0) return [];
    const filtered = sortedDailyPrograms.filter((p) => {
      const itemKey = p.id || `${p.date}_${p.programName}`;
      return selectedDailyProgramKeys.includes(itemKey);
    });
    return filtered.length > 0 ? filtered : [sortedDailyPrograms[0]];
  }, [sortedDailyPrograms, selectedDailyProgramKeys]);

  const handleToggleDailyProgram = (itemKey: string) => {
    setSelectedDailyProgramKeys((prev) => {
      if (prev.includes(itemKey)) {
        if (prev.length === 1) return prev; // Keep at least 1 selected
        return prev.filter((k) => k !== itemKey);
      } else {
        return [...prev, itemKey];
      }
    });
  };

  const handleSelectAllDailyPrograms = () => {
    if (selectedDailyProgramKeys.length === sortedDailyPrograms.length) {
      const firstKey = sortedDailyPrograms[0]?.id || `${sortedDailyPrograms[0]?.date}_${sortedDailyPrograms[0]?.programName}`;
      setSelectedDailyProgramKeys(firstKey ? [firstKey] : []);
    } else {
      setSelectedDailyProgramKeys(
        sortedDailyPrograms.map((p) => p.id || `${p.date}_${p.programName}`)
      );
    }
  };

  // แท็บนี้ส่งบัตร QR สำหรับผู้เข้าร่วมแบบออนไซต์เท่านั้น (ผู้เข้าร่วมออนไลน์ส่งลิงก์จากแท็บลิงก์ประชุมออนไลน์)
  const onsiteAvailable = React.useMemo(
    () => !isDailyPassMode || selectedPrograms.length === 0 || selectedPrograms.every((p) => programSupportsFormat(p.format, 'onsite')),
    [isDailyPassMode, selectedPrograms]
  );

  const notify = (msg: string) => {
    if (onShowToast) onShowToast(msg);
    else alert(msg);
  };

  // ─── HANDLERS ─────────────────────────────────────────────────────────────

  // 1. Send Meeting Tickets
  const handleSendTickets = async () => {
    if (!selectedMeetingId) {
      notify('กรุณาเลือกการประชุมที่ต้องการส่งบัตร');
      return;
    }

    const meeting = meetings.find((m) => m.meeting_id === selectedMeetingId);
    let modeDesc = 'แบบบัตรทั่วไป';
    if (isDailyPassMode) {
      if (selectedPrograms.length === 1) {
        modeDesc = `แบบ QR รายวัน (วันที่ ${formatThaiDate(selectedPrograms[0].date, true)} - ${selectedPrograms[0].programName})`;
      } else {
        modeDesc = `แบบ QR รายวัน (${selectedPrograms.length} รายการ: ${selectedPrograms.map((p) => `${p.programName} [${formatThaiDate(p.date, true)}]`).join(', ')})`;
      }
    }

    if (!onsiteAvailable) {
      notify('รายการที่เลือกไม่ได้จัดแบบออนไซต์ ผู้เข้าร่วมออนไลน์ให้ส่งลิงก์จากแท็บลิงก์ประชุมออนไลน์');
      return;
    }

    const formatDesc = ' (เฉพาะผู้ลงทะเบียนแบบออนไซต์)';

    const confirmMsg = `ยืนยันการส่งอีเมล ${modeDesc}${formatDesc} สำหรับงาน "${meeting?.meeting_name || selectedMeetingId}" (กลุ่ม: ${statusFilter === 'all' ? 'ทั้งหมด' : statusLabelTh(statusFilter)})?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSendingTickets(true);
      setTicketSendProgress(null);

      const res = await fetch('/api/email/send-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: selectedMeetingId,
          statusFilter,
          formatFilter: 'onsite',
          extraNote,
          isDailyMode: isDailyPassMode,
          targetPrograms: isDailyPassMode ? selectedPrograms.map((p) => ({
            targetDate: p.date,
            programName: p.programName,
          })) : undefined,
          targetDate: selectedPrograms[0]?.date || selectedDailyDate,
          programName: selectedPrograms[0]?.programName,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setTicketSendProgress({
          total: json.data.total,
          success: json.data.successCount,
          failed: json.data.failedCount,
          message: json.message,
        });
        notify(json.message || 'ส่งอีเมลสำเร็จเรียบร้อย');
      } else {
        notify(`เกิดข้อผิดพลาด: ${json.error || 'ไม่สามารถส่งอีเมลได้'}`);
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message || 'Server error'}`);
    } finally {
      setSendingTickets(false);
    }
  };

  // 2. Preview Ticket Email (Onsite QR)
  const handlePreviewTicket = () => {
    const meeting = meetings.find((m) => m.meeting_id === selectedMeetingId);
    const activeProg = selectedPrograms[0];
    const targetDateToUse = activeProg?.date || selectedDailyDate;
    const dateDisplay = isDailyPassMode
      ? `ประจำวันที่ ${formatThaiDate(targetDateToUse, true) || targetDateToUse} (${activeProg?.programName || 'Main Program'})`
      : (meeting?.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('th-TH') : '21 - 22 ตุลาคม 2569');

    const sampleHtml = renderAttendeeTicketEmail({
      recipientName: 'นายแพทย์สมชาย ตัวอย่างแพทย์ Onsite',
      meetingName: meeting?.meeting_name || 'การประชุมวิชาการประจำปี TSRM 2026',
      meetingDate: dateDisplay,
      location: meeting?.location || 'โรงแรมสยาม เคมปินสกี้ กรุงเทพฯ',
      ticketCode: isDailyPassMode ? `TSRM-DAY-${selectedMeetingId.substring(0, 6) || '2026'}-0012` : 'TSRM-2026-8899',
      memberNo: '0123',
      attendanceStatus: 'ยืนยันสิทธิ์เรียบร้อย',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TSRM-PASS:TSRM-DAY-SAMPLE-PASS',
      extraNote: extraNote || (isDailyPassMode ? `บัตรสำหรับเข้าร่วม: ${activeProg?.programName || 'Main Program'} • QR Code นี้ใช้ได้เฉพาะวันนี้ 1 ครั้งเท่านั้น` : 'กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่ ณ จุดลงทะเบียนหน้างาน'),
    });

    setPreviewSubject(`[ตัวอย่าง - สำหรับผู้เข้าชม Onsite] บัตรเข้างาน ${meeting?.meeting_name || 'TSRM 2026'}${isDailyPassMode ? ` (${activeProg?.programName || 'Daily Pass'}${selectedPrograms.length > 1 ? ` - 1 จาก ${selectedPrograms.length} รายการที่เลือก` : ''})` : ''}`);
    setPreviewHtml(sampleHtml);

    setIsPreviewOpen(true);
  };

  // 3. Custom Composer Actions
  const handleInsertPlaceholder = (tag: string) => {
    setContent((prev) => `${prev} {{${tag}}}`);
  };

  const handlePreviewCustom = () => {
    if (!content.trim()) {
      notify('กรุณากรอกเนื้อหาอีเมลเพื่อดูตัวอย่าง');
      return;
    }

    const sampleHtml = renderCustomBroadcastEmail({
      subject: subject || 'หัวข้อข่าวสารจากสมาคม TSRM',
      recipientName: 'นายแพทย์สมชาย ตัวอย่างแพทย์',
      rawHtmlContent: content
        .replace(/{{name}}/gi, 'นายแพทย์สมชาย ตัวอย่างแพทย์')
        .replace(/{{member_no}}/gi, '0123')
        .replace(/{{meeting_name}}/gi, 'การประชุมวิชาการประจำปี TSRM 2026')
        .replace(/{{ticket_code}}/gi, 'TSRM-2026-8899')
        .replace(/{{email}}/gi, 'somchai.sample@gmail.com'),
    });

    setPreviewSubject(subject || 'ตัวอย่างอีเมลที่ร่าง');
    setPreviewHtml(sampleHtml);
    setIsPreviewOpen(true);
  };

  const handleSendTestCustom = async () => {
    if (!subject.trim() || !content.trim()) {
      notify('กรุณาระบุหัวข้อและเนื้อหาอีเมลก่อนทดสอบส่ง');
      return;
    }

    if (!testRecipient || !testRecipient.includes('@')) {
      notify('กรุณาระบุอีเมลสำหรับรับข้อความทดสอบที่ถูกต้อง');
      return;
    }

    try {
      setSendingTest(true);
      const res = await fetch('/api/email/send-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          content,
          isTest: true,
          testRecipient,
        }),
      });

      const json = await res.json();
      if (json.success) {
        notify(json.message || `ส่งอีเมลทดสอบไปยัง ${testRecipient} สำเร็จ`);
      } else {
        notify(`ข้อผิดพลาด: ${json.error || 'ส่งเมลทดสอบล้มเหลว'}`);
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendCustomBroadcast = async () => {
    if (!subject.trim() || !content.trim()) {
      notify('กรุณาระบุหัวข้อและเนื้อหาอีเมล');
      return;
    }

    if (targetType === 'custom' && !customEmails.trim()) {
      notify('กรุณาระบุรายชื่ออีเมลผู้รับ');
      return;
    }

    if (targetType === 'meeting_attendees' && !targetMeetingId) {
      notify('กรุณาเลือกงานประชุมที่ต้องการส่ง');
      return;
    }

    const confirmMsg = `ยืนยันการส่งอีเมลไปยังกลุ่มเป้าหมาย "${targetType}" หรือไม่?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSendingCustom(true);
      const res = await fetch('/api/email/send-custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          content,
          targetType,
          targetMeetingId,
          customEmails,
        }),
      });

      const json = await res.json();
      if (json.success) {
        notify(json.message || 'ส่งอีเมลเรียบร้อยแล้ว');
      } else {
        notify(`ข้อผิดพลาด: ${json.error || 'ไม่สามารถส่งอีเมลได้'}`);
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setSendingCustom(false);
    }
  };

  // 5. Test SMTP Connection
  const handleTestSmtp = async () => {
    try {
      setTestingSmtp(true);
      setSmtpStatusMessage(null);

      const res = await fetch('/api/email/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testRecipient: smtpTestEmail || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSmtpStatusMessage(`✅ ${json.message}`);
        notify(json.message);
      } else {
        setSmtpStatusMessage(`❌ ${json.error}: ${json.details || ''}`);
        notify(`ทดสอบไม่ผ่าน: ${json.error}`);
      }
    } catch (err: any) {
      setSmtpStatusMessage(`❌ Error: ${err?.message}`);
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setTestingSmtp(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 select-none">
      <AdminPageHeader
        tab="emails"
        description="ศูนย์ควบคุมการส่งบัตรเข้างานและ QR Code ลิงก์ประชุมออนไลน์ ประวัติการลงทะเบียนของบริษัท และร่างอีเมลอิสระ"
      >
        <HeaderTabs
          value={activeSubTab}
          onChange={setActiveSubTab}
          options={[
            { id: 'tickets', label: 'ส่ง QR Code ผู้เข้าร่วม', icon: QrCode },
            { id: 'online', label: 'ลิงก์ประชุมออนไลน์', icon: Video },
            { id: 'sponsors', label: 'ประวัติบริษัท', icon: Building2 },
            { id: 'composer', label: 'ร่างอีเมลแบบกำหนดเอง', icon: Send },
            { id: 'logs', label: 'ประวัติการส่ง', icon: History },
            { id: 'smtp', label: 'สถานะ SMTP', icon: Server },
          ]}
        />
      </AdminPageHeader>

      {/* ─── TAB 1: SEND ATTENDEE QR CODE TICKETS ─── */}
      {activeSubTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3] shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">ส่งบัตรเข้างาน</h2>
                  <p className="text-xs text-slate-500">ระบบจะสร้าง QR Code อัตโนมัติและส่งตรงถึงอีเมลผู้เข้าร่วม</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handlePreviewTicket()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
                  title="ดูตัวอย่างอีเมลสำหรับผู้เข้าร่วม Onsite (มี QR Code)"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" />
                  <span>ตัวอย่าง Onsite</span>
                </button>
              </div>
            </div>

            {/* 1. Meeting Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>งานประชุมวิชาการ</span>
              </label>
              <select
                value={selectedMeetingId}
                onChange={(e) => setSelectedMeetingId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
              >
                {meetings.map((m) => (
                  <option key={m.meeting_id} value={m.meeting_id}>
                    [{m.meeting_id}] {m.meeting_name} ({m.meeting_date ? new Date(m.meeting_date).toLocaleDateString('th-TH') : 'ยังไม่ระบุวัน'})
                  </option>
                ))}
              </select>
            </div>

            {/* 1.5 Mode Selection (Daily Dynamic QR vs General Pass) */}
            <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-black text-slate-800">รูปแบบการสร้างและส่ง QR Code:</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsDailyPassMode(true)}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      isDailyPassMode ? 'bg-[#0026b3] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎟️ QR Code ประจำวัน
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDailyPassMode(false)}
                    className={`flex-1 sm:flex-none px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                      !isDailyPassMode ? 'bg-[#0026b3] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📄 บัตรทั่วไป
                  </button>
                </div>
              </div>

              {isDailyPassMode && (
                <div className="pt-2 border-t border-slate-200/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <label className="text-xs font-bold text-slate-700">
                        เลือกรายการหลักสูตร / วันที่ที่ต้องการส่ง QR Code:
                      </label>
                      <span className="text-[11px] font-black text-[#0026b3] bg-blue-100/90 px-2.5 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                        เลือกแล้ว {selectedPrograms.length} จาก {sortedDailyPrograms.length} รายการ
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleSelectAllDailyPrograms}
                        className="text-xs font-black text-[#0026b3] hover:text-blue-900 hover:underline cursor-pointer flex items-center gap-1 transition"
                      >
                        {selectedDailyProgramKeys.length === sortedDailyPrograms.length ? 'ยกเลิกเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                      </button>
                      <span className="text-[11px] text-slate-400 font-medium">
                        (เรียงตามลำดับวันที่)
                      </span>
                    </div>
                  </div>

                  {loadingDailyPrograms ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-pulse">
                      {[1, 2].map((n) => (
                        <div key={n} className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                        </div>
                      ))}
                    </div>
                  ) : sortedDailyPrograms.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {sortedDailyPrograms.map((prog) => {
                        const itemKey = prog.id || `${prog.date}_${prog.programName}`;
                        const isSelected = selectedDailyProgramKeys.includes(itemKey);

                        return (
                          <button
                            key={itemKey}
                            type="button"
                            onClick={() => handleToggleDailyProgram(itemKey)}
                            className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between gap-2.5 group ${
                              isSelected
                                ? 'bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border-2 border-[#0026b3] shadow-md shadow-blue-900/10 ring-2 ring-[#0026b3]/20'
                                : 'bg-white border-slate-200/90 text-slate-700 hover:border-blue-300 hover:bg-slate-50/80 hover:shadow-2xs'
                            }`}
                          >
                            {/* Top row: Date Badge & Type Badge */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-black">
                                <Calendar className="w-3 h-3 text-[#0026b3]" />
                                <span>{formatThaiDate(prog.date, true) || prog.date}</span>
                              </div>

                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-md font-black border shrink-0 ${
                                  prog.isMainProgram
                                    ? 'bg-blue-100/80 text-[#0026b3] border-blue-200'
                                    : prog.type === 'workshop'
                                    ? 'bg-purple-100/80 text-purple-800 border-purple-200'
                                    : 'bg-amber-100/80 text-amber-800 border-amber-200'
                                }`}
                              >
                                {prog.isMainProgram ? '🌟 Main Program' : '🛠️ Workshop / พิเศษ'}
                              </span>
                            </div>

                            {/* Middle: Program Name */}
                            <div className="min-w-0">
                              <div
                                className={`text-xs sm:text-sm font-black leading-snug line-clamp-2 transition ${
                                  isSelected ? 'text-[#0026b3]' : 'text-slate-900 group-hover:text-blue-900'
                                }`}
                              >
                                {prog.programName}
                              </div>
                            </div>

                            {/* Bottom: Format / Price & Checkbox indicator */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50 mt-auto">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                                <span>
                                  {prog.format === 'online' ? '💻 Online' : prog.format === 'onsite' ? '🏢 Onsite' : '🌐 Onsite & Online'}
                                </span>
                                {prog.maxSeats && !prog.isMainProgram ? (
                                  <span
                                    className={
                                      typeof prog.remainingSeats === 'number' && prog.remainingSeats <= 0
                                        ? 'text-rose-600'
                                        : 'text-slate-400'
                                    }
                                  >
                                    • {typeof prog.usedSeats === 'number' ? `${prog.usedSeats}/${prog.maxSeats}` : prog.maxSeats} ที่นั่ง
                                    {typeof prog.remainingSeats === 'number' &&
                                      (prog.remainingSeats > 0 ? ` (เหลือ ${prog.remainingSeats})` : ' (เต็ม)')}
                                  </span>
                                ) : typeof prog.usedSeats === 'number' ? (
                                  <span className="text-slate-400">• ลงทะเบียน {prog.usedSeats} คน</span>
                                ) : null}
                              </div>

                              <div className="flex items-center gap-1.5">
                                {isSelected ? (
                                  <div className="flex items-center gap-1.5 text-[11px] font-black text-[#0026b3]">
                                    <div className="w-4 h-4 rounded-md bg-[#0026b3] text-white flex items-center justify-center shadow-2xs">
                                      <Check className="w-3 h-3 stroke-[3]" />
                                    </div>
                                    <span>เลือกแล้ว</span>
                                  </div>
                                ) : (
                                  <div className="w-4 h-4 rounded-md border-2 border-slate-300 group-hover:border-blue-400 transition-colors"></div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2 text-center">
                      <p className="text-xs text-slate-500 font-bold">ไม่พบรายการหลักสูตรย่อยของงานประชุมนี้</p>
                      <div className="max-w-xs mx-auto text-left">
                        <ThaiDatePicker
                          value={selectedDailyDate}
                          onChange={setSelectedDailyDate}
                          outputFormat="iso"
                          placeholder="เลือกวันที่จัดกิจกรรม"
                        />
                      </div>
                    </div>
                  )}

                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    💡 ระบบจะสร้างรหัส Token ประจำวันและบันทึกลงตาราง <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">meeting_daily_checkins</code> ทันทีที่ส่ง
                  </p>
                </div>
              )}
            </div>

            {/* 2. ส่งเฉพาะผู้เข้าร่วมแบบออนไซต์ */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-2xl border text-xs ${onsiteAvailable ? 'bg-slate-50/80 border-slate-200 text-slate-600' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              <span className="flex items-center gap-1.5 font-bold">
                <Globe className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                {onsiteAvailable
                  ? 'ส่งบัตร QR Code เฉพาะผู้ลงทะเบียนแบบออนไซต์'
                  : 'รายการที่เลือกไม่ได้จัดแบบออนไซต์ จึงไม่มีบัตร QR Code ให้ส่ง'}
              </span>
              <button
                type="button"
                onClick={() => setActiveSubTab('online')}
                className="flex items-center gap-1 font-black text-[#0026b3] hover:underline cursor-pointer w-fit"
              >
                <Video className="w-3.5 h-3.5" />
                ผู้เข้าร่วมออนไลน์ส่งลิงก์ที่แท็บลิงก์ประชุมออนไลน์
              </button>
            </div>

            {/* 3. Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>กรองกลุ่มสถานะผู้เข้าร่วม:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Registered', label: 'ลงทะเบียนแล้ว', desc: 'ผู้ที่ลงทะเบียนในงาน' },
                  { id: 'all', label: 'ทั้งหมด', desc: 'ทุกสถานะในงาน' },
                  { id: 'Checked_In', label: 'เช็คอินแล้ว', desc: 'ผู้ที่เช็คอินเข้างานแล้ว' },
                  { id: 'Non-Member', label: 'บุคคลทั่วไป', desc: 'ผู้เข้าร่วมที่ไม่ใช่สมาชิก' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatusFilter(st.id)}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-blue-50 border-[#0026b3] text-[#0026b3] ring-1 ring-[#0026b3]'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black">{st.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Extra Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>ข้อความเพิ่มเติมถึงผู้เข้าร่วม (ระบุในอีเมล):</span>
              </label>
              <textarea
                value={extraNote}
                onChange={(e) => setExtraNote(e.target.value)}
                placeholder="เช่น กรุณาเตรียมบัตรประชาชนหรือหลักฐานแสดงตน ณ จุดลงทะเบียนชั้น 8 อาคารเฉลิมพระบารมี..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
              />
            </div>

            {/* Progress Bar & Status */}
            {ticketSendProgress && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 animate-fade-in space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>ผลการส่งอีเมลล่าสุด</span>
                  </span>
                  <span>
                    สำเร็จ {ticketSendProgress.success} / {ticketSendProgress.total} ท่าน
                  </span>
                </div>
                <div className="w-full bg-emerald-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${(ticketSendProgress.success / (ticketSendProgress.total || 1)) * 100}%`,
                    }}
                  />
                </div>
                {ticketSendProgress.failed > 0 && (
                  <p className="text-[11px] text-rose-600 font-bold">
                    ⚠️ ล้มเหลว {ticketSendProgress.failed} ท่าน (เนื่องจากอีเมลไม่ถูกต้องหรือการเชื่อมต่อ)
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <span>ระบบจะทยอยจัดส่งทีละคนเพื่อป้องกันการติด Spam filter</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Btn variant="primary" icon={Send} loading={sendingTickets} onClick={handleSendTickets} className="w-full sm:w-auto">
                  {sendingTickets ? 'กำลังส่งอีเมล...' : 'ส่งอีเมล QR Code ทันที'}
                </Btn>
              </div>
            </div>
          </div>

          {/* Right Column: Information */}
          <div className="space-y-6">
            {/* Help Card */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                <HelpCircle className="w-4 h-4 text-[#0026b3]" />
                <span>เกี่ยวกับระบบ QR Code</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                <li>QR Code สร้างขึ้นจากรหัสบัตรเฉพาะรายบุคคล</li>
                <li>ผู้เข้าร่วมสามารถเปิดแสดงบนมือถือหรือพิมพ์เอกสารเพื่อสแกนหน้างานได้</li>
                <li>เจ้าหน้าที่สามารถใช้แท็บ <strong>&quot;Staff Scanner&quot;</strong> สแกน QR Code เพื่อเช็คอินเข้างานได้ทันที</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: ONLINE MEETING LINKS ─── */}
      {activeSubTab === 'online' && (
        <OnlineAttendeesPanel
          meetings={meetings}
          meetingId={selectedMeetingId}
          onMeetingChange={setSelectedMeetingId}
          notify={notify}
        />
      )}

      {activeSubTab === 'sponsors' && <SponsorHistoryEmailPanel notify={notify} />}

      {activeSubTab === 'logs' && <EmailLogPanel notify={notify} />}

      {/* ─── TAB 2: CUSTOM EMAIL COMPOSER & BROADCAST ─── */}
      {activeSubTab === 'composer' && (
        <div className="max-w-4xl">
          <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">ร่างและส่งอีเมลแบบกำหนดเอง</h2>
                  <p className="text-xs text-slate-500">สร้างข่าวสาร ประกาศ หรือข้อความแจ้งเตือนพร้อมตัวแปรอัตโนมัติ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePreviewCustom}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ดูตัวอย่าง</span>
              </button>
            </div>

            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>กลุ่มผู้รับเป้าหมาย:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'all_members', label: 'สมาชิกทั้งหมด', desc: 'ทุกสถานะ' },
                  { id: 'active_members', label: 'สมาชิกสถานะปกติ', desc: 'Active members' },
                  { id: 'meeting_attendees', label: 'ผู้เข้าร่วมประชุม', desc: 'ระบุการประชุม' },
                  { id: 'custom', label: 'ระบุอีเมลเอง', desc: 'Custom list' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTargetType(t.id as any)}
                    className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                      targetType === t.id
                        ? 'bg-blue-50 border-[#0026b3] text-[#0026b3] ring-1 ring-[#0026b3]'
                        : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="text-xs font-black">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Target Input */}
            {targetType === 'meeting_attendees' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">เลือกงานประชุมเป้าหมาย:</label>
                <select
                  value={targetMeetingId}
                  onChange={(e) => setTargetMeetingId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                >
                  {meetings.map((m) => (
                    <option key={m.meeting_id} value={m.meeting_id}>
                      [{m.meeting_id}] {m.meeting_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {targetType === 'custom' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">ระบุอีเมลผู้รับ (คั่นด้วยจุลภาคหรือขึ้นบรรทัดใหม่):</label>
                <textarea
                  value={customEmails}
                  onChange={(e) => setCustomEmails(e.target.value)}
                  placeholder="doctor1@hospital.com, doctor2@clinic.co.th"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800"
                />
              </div>
            )}

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">หัวข้ออีเมล:</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="เช่น ประชาสัมพันธ์กำหนดการและหัวข้อบรรยายพิเศษ TSRM 2026"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800"
              />
            </div>

            {/* Dynamic Placeholders Chips */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">
                คลิกเพื่อแทรกตัวแปรอัตโนมัติ:
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { tag: 'name', label: '+ ชื่อผู้รับ' },
                  { tag: 'member_no', label: '+ รหัสสมาชิก' },
                  { tag: 'meeting_name', label: '+ ชื่องานประชุม' },
                  { tag: 'ticket_code', label: '+ รหัสบัตร' },
                  { tag: 'email', label: '+ อีเมล' },
                ].map((chip) => (
                  <button
                    key={chip.tag}
                    type="button"
                    onClick={() => handleInsertPlaceholder(chip.tag)}
                    className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-[#0026b3] border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer shadow-2xs"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">เนื้อหาอีเมล (รองรับการเว้นวรรคและข้อความทั่วไป):</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="พิมพ์ข้อความที่ต้องการสื่อสารที่นี่... ระบบจะจัดหน้าให้อัตโนมัติ"
                rows={8}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 leading-relaxed font-sans"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="อีเมลรับผลทดสอบ..."
                  className="h-10 bg-white border border-slate-300 rounded-xl px-3 text-xs text-slate-800 flex-1 sm:w-52 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3]"
                />
                <Btn icon={Eye} loading={sendingTest} onClick={handleSendTestCustom}>
                  {sendingTest ? 'กำลังส่ง...' : 'ทดสอบส่ง'}
                </Btn>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Btn variant="primary" icon={Send} loading={sendingCustom} onClick={handleSendCustomBroadcast} className="w-full sm:w-auto">
                  {sendingCustom ? 'กำลังส่ง...' : 'ส่งอีเมลทันที'}
                </Btn>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ─── TAB 3: SMTP STATUS & TEST ─── */}
      {activeSubTab === 'smtp' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-5 sm:p-6 shadow-xs border border-slate-200/90 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">ตรวจสอบสถานะการเชื่อมต่อ SMTP Server</h2>
              <p className="text-xs text-slate-500">ทดสอบความพร้อมของบริการส่งอีเมลจริง</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
            <div className="text-xs font-bold text-slate-700">คำแนะนำการตั้งค่า SMTP:</div>
            <p className="text-xs text-slate-600 leading-relaxed">
              ระบบดึงค่าการเชื่อมต่อจาก Environment Variables (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`) หรือใช้บัญชีผู้ส่งของสมาคม หากยังไม่ได้ระบุค่า ระบบจะทำงานใน <strong>Fallback Simulation Mode</strong> โดยอัตโนมัติ เพื่อให้ทดสอบระบบได้โดยไม่เกิดข้อผิดพลาด
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">ส่งอีเมลทดสอบไปยัง:</label>
              <input
                type="email"
                value={smtpTestEmail}
                onChange={(e) => setSmtpTestEmail(e.target.value)}
                placeholder="your.email@example.com (ใส่เพื่อส่งอีเมลจริงเข้ากล่องจดหมาย)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-hidden"
              />
            </div>

            {smtpStatusMessage && (
              <div
                className={`p-4 rounded-xl text-xs font-bold animate-fade-in ${
                  smtpStatusMessage.startsWith('✅')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {smtpStatusMessage}
              </div>
            )}

            <button
              type="button"
              onClick={handleTestSmtp}
              disabled={testingSmtp}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#0026b3] to-[#001768] text-white text-xs font-black hover:opacity-95 transition cursor-pointer shadow-md shadow-blue-900/20 disabled:opacity-50"
            >
              {testingSmtp ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังทดสอบการเชื่อมต่อ...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>ทดสอบการเชื่อมต่อ SMTP เดี๋ยวนี้</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── LIVE PREVIEW MODAL ─── */}
      <EmailPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        subject={previewSubject}
        htmlContent={previewHtml}
      />
    </div>
  );
}
