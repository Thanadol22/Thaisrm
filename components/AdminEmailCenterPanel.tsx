'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
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
  Trash2,
  Ban,
  Check,
  Zap,
} from 'lucide-react';
import { EmailPreviewModal } from '@/components/EmailPreviewModal';
import { renderAttendeeTicketEmail } from '@/lib/emailTemplates/attendeeQrTemplate';
import { renderCustomBroadcastEmail } from '@/lib/emailTemplates/customTemplate';

interface MeetingOption {
  meeting_id: string;
  meeting_name: string;
  meeting_date: string;
  location?: string;
}

interface AdminEmailCenterPanelProps {
  onShowToast?: (message: string) => void;
}

type EmailSubTab = 'tickets' | 'composer' | 'schedule' | 'smtp';

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
  const [dailyPrograms, setDailyPrograms] = useState<Array<{ date: string; programName: string; isMainProgram: boolean }>>([]);
  const [loadingDailyPrograms, setLoadingDailyPrograms] = useState(false);
  const [autoScheduling, setAutoScheduling] = useState(false);
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

  // --- Sub-Tab 3: Scheduled Dispatch State ---
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [scheduledTasks, setScheduledTasks] = useState<any[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [savingSchedule, setSavingSchedule] = useState(false);

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
        if (json.success && json.data?.programs) {
          setDailyPrograms(json.data.programs);
          if (json.data.programs.length > 0) {
            setSelectedDailyDate(json.data.programs[0].date);
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

  // 2. Fetch scheduled queue when opening schedule tab
  const fetchScheduledQueue = async () => {
    try {
      setLoadingSchedule(true);
      const res = await fetch('/api/email/schedule');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setScheduledTasks(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch scheduled queue:', err);
    } finally {
      setLoadingSchedule(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'schedule') {
      fetchScheduledQueue();
    }
  }, [activeSubTab]);

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
    const selectedProgram = dailyPrograms.find((p) => p.date === selectedDailyDate);
    const modeDesc = isDailyPassMode
      ? `แบบ QR รายวัน (วันที่ ${selectedDailyDate} - ${selectedProgram?.programName || 'Main Program'})`
      : 'แบบบัตรทั่วไป (General Pass)';

    const confirmMsg = `ยืนยันการส่งอีเมล ${modeDesc} สำหรับงาน "${meeting?.meeting_name || selectedMeetingId}" (กลุ่ม: ${statusFilter})?`;
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
          extraNote,
          isDailyMode: isDailyPassMode,
          targetDate: selectedDailyDate,
          programName: selectedProgram?.programName,
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
        notify(json.message || 'ส่งอีเมลบัตรเข้างานสำเร็จเรียบร้อย');
      } else {
        notify(`เกิดข้อผิดพลาด: ${json.error || 'ไม่สามารถส่งอีเมลได้'}`);
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message || 'Server error'}`);
    } finally {
      setSendingTickets(false);
    }
  };

  // 1.1 Auto-schedule all daily QR dispatches (07:00 AM every meeting day)
  const handleAutoScheduleDaily = async () => {
    if (!selectedMeetingId) {
      notify('กรุณาเลือกการประชุมที่ต้องการตั้งเวลา');
      return;
    }
    const meeting = meetings.find((m) => m.meeting_id === selectedMeetingId);
    const confirmMsg = `ยืนยันการตั้งระบบส่ง QR Code ประจำวันอัตโนมัติ ทุกเช้าเวลา 07:00 น. ตลอดทุกวันของงาน "${meeting?.meeting_name || selectedMeetingId}"?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setAutoScheduling(true);
      const res = await fetch('/api/email/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'auto_schedule_daily',
          meetingId: selectedMeetingId,
          dispatchTime: '07:00',
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(json.message || 'ตั้งเวลาส่ง QR Code รายวันอัตโนมัติสำเร็จ');
        fetchScheduledQueue();
      } else {
        notify(`ข้อผิดพลาด: ${json.error}`);
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setAutoScheduling(false);
    }
  };

  // 2. Preview Ticket Email
  const handlePreviewTicket = () => {
    const meeting = meetings.find((m) => m.meeting_id === selectedMeetingId);
    const selectedProgram = dailyPrograms.find((p) => p.date === selectedDailyDate);
    const dateDisplay = isDailyPassMode
      ? `ประจำวันที่ ${selectedDailyDate || '21 ตุลาคม 2569'} (${selectedProgram?.programName || 'Main Program'})`
      : (meeting?.meeting_date ? new Date(meeting.meeting_date).toLocaleDateString('th-TH') : '21 - 22 ตุลาคม 2569');

    const sampleHtml = renderAttendeeTicketEmail({
      recipientName: 'นายแพทย์สมชาย ตัวอย่างแพทย์',
      meetingName: meeting?.meeting_name || 'การประชุมวิชาการประจำปี TSRM 2026',
      meetingDate: dateDisplay,
      location: meeting?.location || 'โรงแรมสยาม เคมปินสกี้ กรุงเทพฯ',
      ticketCode: isDailyPassMode ? `TSRM-DAY-${selectedMeetingId.substring(0, 6) || '2026'}-0012` : 'TSRM-2026-8899',
      memberNo: '0123',
      attendanceStatus: 'ยืนยันสิทธิ์เรียบร้อย (Registered)',
      qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TSRM-PASS:TSRM-DAY-SAMPLE-PASS',
      extraNote: extraNote || (isDailyPassMode ? `บัตรสำหรับเข้าร่วม: ${selectedProgram?.programName || 'Main Program'} • QR Code นี้ใช้ได้เฉพาะวันนี้ 1 ครั้งเท่านั้น` : 'กรุณาแสดง QR Code นี้แก่เจ้าหน้าที่ ณ จุดลงทะเบียนหน้างาน'),
    });

    setPreviewSubject(`[ตัวอย่าง] บัตรเข้างาน (E-Ticket) ${meeting?.meeting_name || 'TSRM 2026'}${isDailyPassMode ? ` (${selectedProgram?.programName || 'Daily Pass'})` : ''}`);
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

  // 4. Schedule Email Handler
  const handleAddSchedule = async (type: 'tickets' | 'custom') => {
    if (!scheduleDateTime) {
      notify('กรุณาเลือกวันและเวลาที่ต้องการส่งล่วงหน้า');
      return;
    }

    const selectedTime = new Date(scheduleDateTime).getTime();
    if (isNaN(selectedTime) || selectedTime <= Date.now()) {
      notify('กรุณาเลือกวันและเวลาในอนาคต');
      return;
    }

    try {
      setSavingSchedule(true);
      let payload: any = {};
      let title = '';

      if (type === 'tickets') {
        const meeting = meetings.find((m) => m.meeting_id === selectedMeetingId);
        title = `ส่ง QR Code: ${meeting?.meeting_name || selectedMeetingId}`;
        payload = {
          meetingId: selectedMeetingId,
          meetingName: meeting?.meeting_name,
          statusFilter,
          extraNote,
        };
      } else {
        if (!subject.trim() || !content.trim()) {
          notify('กรุณาระบุหัวข้อและเนื้อหาอีเมลในแท็บร่างอีเมลก่อนตั้งเวลา');
          return;
        }
        title = `บรอดแคสต์: ${subject}`;
        payload = {
          subject,
          content,
          targetType,
          targetMeetingId,
          customEmails,
        };
      }

      const res = await fetch('/api/email/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          task: {
            title,
            taskType: type,
            scheduledAt: scheduleDateTime,
            payload,
          },
        }),
      });

      const json = await res.json();
      if (json.success) {
        notify('บันทึกการตั้งเวลาส่งอีเมลสำเร็จเรียบร้อย');
        setScheduleDateTime('');
        fetchScheduledQueue();
      } else {
        notify(`ข้อผิดพลาด: ${json.error}`);
      }
    } catch (err: any) {
      notify(`เกิดข้อผิดพลาด: ${err?.message}`);
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleCancelScheduleTask = async (taskId: string) => {
    if (!window.confirm('ต้องการยกเลิกรายการตั้งเวลานี้หรือไม่?')) return;
    try {
      const res = await fetch('/api/email/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', taskId }),
      });
      const json = await res.json();
      if (json.success) {
        notify('ยกเลิกรายการตั้งเวลาแล้ว');
        fetchScheduledQueue();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteScheduleTask = async (taskId: string) => {
    if (!window.confirm('ต้องการลบรายการนี้ออกจากประวัติหรือไม่?')) return;
    try {
      const res = await fetch('/api/email/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', taskId }),
      });
      const json = await res.json();
      if (json.success) {
        notify('ลบรายการสำเร็จ');
        fetchScheduledQueue();
      }
    } catch (err) {
      console.error(err);
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
    <div className="space-y-6 animate-fade-in select-none">
      {/* ─── Top Brand Header ─── */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0026b3] to-[#001768] flex items-center justify-center text-white shadow-lg shadow-blue-900/20 shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">ระบบจัดการอีเมล (Email Center)</h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์ควบคุมการส่งอีเมล E-Ticket, QR Code ตรวจสอบสถานะผู้เข้าร่วม, ร่างอีเมลอิสระ และตั้งเวลาส่งล่วงหน้า
            </p>
          </div>
        </div>

        {/* Quick Tabs Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('tickets')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              activeSubTab === 'tickets'
                ? 'bg-[#0026b3] text-white shadow-md shadow-blue-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>ส่ง QR Code ผู้เข้าร่วม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('composer')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              activeSubTab === 'composer'
                ? 'bg-[#0026b3] text-white shadow-md shadow-blue-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>ร่างอีเมลแบบกำหนดเอง</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('schedule')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              activeSubTab === 'schedule'
                ? 'bg-[#0026b3] text-white shadow-md shadow-blue-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ตั้งเวลาส่งล่วงหน้า</span>
            {scheduledTasks.filter((t) => t.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('smtp')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
              activeSubTab === 'smtp'
                ? 'bg-[#0026b3] text-white shadow-md shadow-blue-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>สถานะ SMTP</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: SEND ATTENDEE QR CODE TICKETS ─── */}
      {activeSubTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">ส่งบัตรเข้างาน (E-Ticket & QR Code)</h2>
                  <p className="text-xs text-slate-500">ระบบจะสร้าง QR Code อัตโนมัติและส่งตรงถึงอีเมลผู้เข้าร่วม</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePreviewTicket}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>ดูตัวอย่างอีเมล</span>
              </button>
            </div>

            {/* 1. Meeting Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>เลือกงานประชุมวิชาการ:</span>
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black text-slate-800">รูปแบบการสร้างและส่ง QR Code:</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setIsDailyPassMode(true)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      isDailyPassMode ? 'bg-[#0026b3] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🎟️ QR Code ประจำวัน (1 สิทธิ์/วัน)
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDailyPassMode(false)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      !isDailyPassMode ? 'bg-[#0026b3] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📄 บัตรทั่วไป (Master Pass)
                  </button>
                </div>
              </div>

              {isDailyPassMode && (
                <div className="pt-2 border-t border-slate-200/60 space-y-2">
                  <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>เลือกวันที่และหลักสูตรที่ต้องการส่ง QR Code ประจำวัน:</span>
                    </span>
                    {loadingDailyPrograms && <span className="text-[10px] text-slate-400">กำลังโหลด...</span>}
                  </label>

                  {dailyPrograms.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dailyPrograms.map((prog) => {
                        const isSelected = selectedDailyDate === prog.date;
                        return (
                          <button
                            key={prog.date}
                            type="button"
                            onClick={() => setSelectedDailyDate(prog.date)}
                            className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50 border-[#0026b3] text-[#0026b3] ring-1 ring-[#0026b3]'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black">{prog.date}</span>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${prog.isMainProgram ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>
                                {prog.isMainProgram ? 'Main Program' : 'Workshop / พิเศษ'}
                              </span>
                            </div>
                            <div className="text-xs font-bold text-slate-800 mt-1">{prog.programName}</div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="date"
                      value={selectedDailyDate}
                      onChange={(e) => setSelectedDailyDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-hidden"
                    />
                  )}
                  <p className="text-[11px] text-slate-500">
                    💡 ระบบจะสร้างรหัส Token ประจำวันและบันทึกลงตาราง <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">meeting_daily_checkins</code> ทันทีที่ส่ง
                  </p>
                </div>
              )}
            </div>

            {/* 2. Status Filter */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#0026b3]" />
                <span>กรองกลุ่มสถานะผู้เข้าร่วม:</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'Registered', label: 'ลงทะเบียนแล้ว', desc: 'สถานะ Registered' },
                  { id: 'all', label: 'ทั้งหมด', desc: 'ทุกสถานะในงาน' },
                  { id: 'Checked_In', label: 'เช็คอินแล้ว', desc: 'Checked-in' },
                  { id: 'Non-Member', label: 'บุคคลทั่วไป', desc: 'Non-Member' },
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

            {/* 3. Extra Note */}
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
                <Zap className="w-4 h-4 text-amber-500" />
                <span>ระบบจะทยอยจัดส่งทีละคนเพื่อป้องกันการติด Spam filter</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSendTickets}
                  disabled={sendingTickets}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#0026b3] to-[#001768] text-white font-black text-xs hover:opacity-95 shadow-md shadow-blue-900/20 transition cursor-pointer disabled:opacity-50"
                >
                  {sendingTickets ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังส่งอีเมล...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>ส่งอีเมล QR Code ทันที</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Information & Scheduled shortcut */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 text-[#4ade80] text-xs font-extrabold uppercase tracking-wider mb-2">
                <Clock className="w-4 h-4" />
                <span>ตั้งเวลาส่งล่วงหน้า</span>
              </div>
              <h3 className="text-base font-black mb-2">ส่งบัตรก่อนวันประชุม</h3>
              <p className="text-xs text-blue-200/80 leading-relaxed mb-4">
                คุณสามารถระบุวันและเวลาเพื่อตั้งระบบให้ส่งบัตร QR Code อัตโนมัติ เช่น ล่วงหน้า 1 วันก่อนวันงาน
              </p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAutoScheduleDaily}
                  disabled={autoScheduling}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black hover:from-amber-300 hover:to-amber-400 transition cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {autoScheduling ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังสร้างตารางส่ง...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ตั้งเวลาส่ง QR ประจำวันอัตโนมัติ (ทุกเช้า 07:00 น.)</span>
                    </>
                  )}
                </button>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-white/20 w-full"></div>
                  <span className="bg-indigo-950 px-2 text-[10px] text-blue-200/60 font-bold uppercase">หรือระบุเวลาเอง</span>
                </div>

                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={(e) => setScheduleDateTime(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => handleAddSchedule('tickets')}
                  disabled={savingSchedule}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4ade80] text-slate-950 text-xs font-black hover:bg-emerald-300 transition cursor-pointer shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>บันทึกตารางเวลาส่ง</span>
                </button>
              </div>
            </div>

            {/* Help Card */}
            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                <HelpCircle className="w-4 h-4 text-[#0026b3]" />
                <span>เกี่ยวกับระบบ QR Code</span>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 leading-relaxed">
                <li>QR Code สร้างขึ้นจากรหัสบัตรเฉพาะรายบุคคล (Unique Pass)</li>
                <li>ผู้เข้าร่วมสามารถเปิดแสดงบนมือถือหรือพิมพ์เอกสารเพื่อสแกนหน้างานได้</li>
                <li>เจ้าหน้าที่สามารถใช้แท็บ <strong>&quot;Staff Scanner&quot;</strong> สแกน QR Code เพื่อเช็คอินเข้างานได้ทันที</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CUSTOM EMAIL COMPOSER & BROADCAST ─── */}
      {activeSubTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0026b3]">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">ร่างและส่งอีเมลแบบกำหนดเอง (Custom Composer)</h2>
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
              <label className="text-xs font-bold text-slate-700">หัวข้ออีเมล (Subject):</label>
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
                คลิกเพื่อแทรกตัวแปรอัตโนมัติ (Dynamic Placeholders):
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
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="อีเมลรับผลทดสอบ..."
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 w-44"
                />
                <button
                  type="button"
                  onClick={handleSendTestCustom}
                  disabled={sendingTest}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  {sendingTest ? 'กำลังส่ง...' : 'ทดสอบส่ง'}
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSendCustomBroadcast}
                  disabled={sendingCustom}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0026b3] text-white font-black text-xs hover:bg-blue-900 transition cursor-pointer shadow-sm"
                >
                  {sendingCustom ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังส่ง...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>ส่งอีเมลทันที</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Schedule & Info */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md space-y-3">
              <div className="flex items-center gap-2 text-[#4ade80] text-xs font-extrabold uppercase tracking-wider">
                <Clock className="w-4 h-4" />
                <span>ตั้งเวลาบรอดแคสต์ล่วงหน้า</span>
              </div>
              <h3 className="text-base font-black">ส่งข่าวสารถึงสมาชิกตามเวลา</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                บันทึกเนื้อหาที่ร่างไว้นี้เพื่อตั้งเวลาส่งล่วงหน้าในระบบ
              </p>
              <input
                type="datetime-local"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleAddSchedule('custom')}
                disabled={savingSchedule}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-black transition cursor-pointer shadow-sm"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>บันทึกการตั้งเวลาบรอดแคสต์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: SCHEDULED TASKS QUEUE ─── */}
      {activeSubTab === 'schedule' && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">รายการงานที่ตั้งเวลาส่งล่วงหน้า (Scheduled Tasks)</h2>
                <p className="text-xs text-slate-500">ตรวจสอบและจัดการคิวการส่งอีเมลอัตโนมัติตามกำหนดเวลา</p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchScheduledQueue}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingSchedule ? 'animate-spin' : ''}`} />
              <span>รีเฟรช</span>
            </button>
          </div>

          {loadingSchedule ? (
            <div className="py-12 text-center text-xs text-slate-400">กำลังโหลดคิวงาน...</div>
          ) : scheduledTasks.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Clock className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-slate-700">ไม่มีรายการตั้งเวลาในขณะนี้</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                คุณสามารถตั้งเวลาส่งบัตรเข้างาน หรืออีเมลข่าวสารล่วงหน้าได้จากแท็บส่ง QR Code หรือแท็บร่างอีเมล
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-3">รหัสงาน</th>
                    <th className="py-3 px-3">ชื่องาน / หัวข้อ</th>
                    <th className="py-3 px-3">ประเภท</th>
                    <th className="py-3 px-3">กำหนดเวลาส่ง</th>
                    <th className="py-3 px-3">สถานะ</th>
                    <th className="py-3 px-3 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {scheduledTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3 font-mono font-bold text-slate-500">{task.id}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-900">{task.title}</td>
                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-50 text-[#0026b3] border border-blue-200/60">
                          {task.taskType === 'tickets' ? 'บัตร QR Code' : 'บรอดแคสต์'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600">
                        {new Date(task.scheduledAt).toLocaleString('th-TH')}
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            task.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : task.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.status === 'pending'
                            ? 'รอดำเนินการ'
                            : task.status === 'completed'
                            ? 'ส่งแล้ว'
                            : 'ยกเลิกแล้ว'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {task.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleCancelScheduleTask(task.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition cursor-pointer"
                              title="ยกเลิก"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteScheduleTask(task.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="ลบรายการ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 4: SMTP STATUS & TEST ─── */}
      {activeSubTab === 'smtp' && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200/80 space-y-6">
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
              <label className="text-xs font-bold text-slate-700">ส่งอีเมลทดสอบไปยัง (Recipient):</label>
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
