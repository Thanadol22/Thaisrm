'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Users,
  Ticket,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ExternalLink,
  History,
  Copy,
  Check,
  Mail,
  Calendar,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Eye,
  X,
} from 'lucide-react';
import { createPortal } from 'react-dom';

interface SponsorItem {
  id: string;
  name: string;
  tier: 'Platinum' | 'Gold' | 'Silver';
  contact_name?: string;
  contact_email: string;
  is_active: boolean;
  total_allocated_quota: number;
  total_used_seats: number;
  total_registered_members: number;
  quotas?: any[];
}

export default function AdminSponsorsPanel() {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // History Modal State
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedSponsorForHistory, setSelectedSponsorForHistory] = useState<SponsorItem | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Add Sponsor Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSponsorForm, setNewSponsorForm] = useState({
    name: '',
    tier: 'Silver',
    contactEmail: '',
    contactName: '',
    initialQuota: '0',
  });
  const [addingSponsor, setAddingSponsor] = useState(false);
  const [formError, setFormError] = useState('');

  // SSR Mounted guard for modals
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchSponsors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sponsors');
      const data = await res.json();
      if (res.ok && data.success) {
        setSponsors(data.sponsors || []);
      }
    } catch (err) {
      console.error('Failed to load sponsors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSponsors();
  }, []);

  // Filtered sponsors
  const filteredSponsors = useMemo(() => {
    return sponsors.filter((sp) => {
      const matchesTier = selectedTier === 'all' || sp.tier === selectedTier;
      const matchesSearch =
        !searchTerm ||
        sp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sp.contact_email.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTier && matchesSearch;
    });
  }, [sponsors, selectedTier, searchTerm]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalSponsors = sponsors.length;
    const platinumCount = sponsors.filter((s) => s.tier === 'Platinum').length;
    const goldCount = sponsors.filter((s) => s.tier === 'Gold').length;
    const silverCount = sponsors.filter((s) => s.tier === 'Silver').length;
    const totalQuota = sponsors.reduce((sum, s) => sum + (s.total_allocated_quota || 0), 0);
    const totalUsed = sponsors.reduce((sum, s) => sum + (s.total_used_seats || 0), 0);
    return { totalSponsors, platinumCount, goldCount, silverCount, totalQuota, totalUsed };
  }, [sponsors]);

  // Open History Modal
  const handleOpenHistory = async (sponsor: SponsorItem) => {
    setSelectedSponsorForHistory(sponsor);
    setHistoryModalOpen(true);
    setHistoryLoading(true);

    try {
      const res = await fetch(`/api/sponsors/${sponsor.id}/history`);
      const data = await res.json();
      if (res.ok && data.success) {
        setHistoryList(data.history || []);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Copy portal direct link
  const handleCopyLink = (email: string, sponsorId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalUrl = `${origin}/sponsor/group-register`;
    navigator.clipboard.writeText(portalUrl);
    setCopiedId(sponsorId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Add Sponsor Submit
  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSponsorForm.name.trim() || !newSponsorForm.contactEmail.trim()) {
      setFormError('กรุณาระบุชื่อบริษัทและอีเมลตัวแทน');
      return;
    }

    setAddingSponsor(true);
    setFormError('');

    try {
      const res = await fetch('/api/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSponsorForm),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.message || 'ไม่สามารถเพิ่มบริษัทได้');
        return;
      }

      setAddModalOpen(false);
      setNewSponsorForm({
        name: '',
        tier: 'Silver',
        contactEmail: '',
        contactName: '',
        initialQuota: '0',
      });
      fetchSponsors();
    } catch (err) {
      setFormError('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setAddingSponsor(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-400" />
            ระบบจัดการบริษัทสปอนเซอร์ (Corporate Sponsors & Quotas)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            จัดการรายชื่อบริษัทสปอนเซอร์, โควต้าคูปองฟรี, และตรวจสอบรายชื่อสมาชิกที่แต่ละบริษัทเคยลงทะเบียน
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/sponsor/group-register"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            เปิดหน้า Portal ตัวแทน
          </a>
          <button
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            เพิ่มบริษัทใหม่
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">บริษัททั้งหมด</span>
          <div className="text-2xl font-black text-white mt-1">{stats.totalSponsors}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            💎 {stats.platinumCount} | 🥇 {stats.goldCount} | 🥈 {stats.silverCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/20">
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Platinum Sponsors</span>
          <div className="text-2xl font-black text-purple-300 mt-1">{stats.platinumCount}</div>
          <div className="text-[10px] text-purple-400/70 mt-0.5">เช่น LG Chem (20 ที่นั่ง)</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Gold Sponsors</span>
          <div className="text-2xl font-black text-amber-300 mt-1">{stats.goldCount}</div>
          <div className="text-[10px] text-amber-400/70 mt-0.5">เช่น Merck, Ferring, Organon (8 ที่นั่ง)</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-blue-500/20">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">โควต้าที่ใช้ / ทั้งหมด</span>
          <div className="text-2xl font-black text-blue-400 mt-1">
            {stats.totalUsed} <span className="text-sm font-normal text-slate-500">/ {stats.totalQuota}</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            คงเหลือ {Math.max(0, stats.totalQuota - stats.totalUsed)} สิทธิ์
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อบริษัท หรืออีเมลตัวแทน..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Tier Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'ทั้งหมด' },
            { id: 'Platinum', label: '💎 Platinum' },
            { id: 'Gold', label: '🥇 Gold' },
            { id: 'Silver', label: '🥈 Silver' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTier(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                selectedTier === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <button
            onClick={fetchSponsors}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors shrink-0 ml-1 cursor-pointer"
            title="รีเฟรชข้อมูล"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sponsors Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RotateCw className="w-4 h-4 animate-spin text-blue-400" />
            กำลังโหลดข้อมูลบริษัทสปอนเซอร์...
          </div>
        ) : filteredSponsors.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400">
            ไม่พบข้อมูลบริษัทสปอนเซอร์ตามเงื่อนไขที่ค้นหา
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">ระดับ (Tier)</th>
                  <th className="py-3.5 px-4">ชื่อบริษัท</th>
                  <th className="py-3.5 px-4">อีเมลตัวแทนผู้ประสานงาน</th>
                  <th className="py-3.5 px-4 text-center">โควต้าที่จัดสรร</th>
                  <th className="py-3.5 px-4 text-center">ใช้ไปแล้ว</th>
                  <th className="py-3.5 px-4 text-center">ประวัติสมาชิก</th>
                  <th className="py-3.5 px-4 text-right">ลิงก์ Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSponsors.map((sp) => {
                  const isCopied = copiedId === sp.id;
                  return (
                    <tr key={sp.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                            sp.tier === 'Platinum'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : sp.tier === 'Gold'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-700/50 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {sp.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{sp.name}</div>
                        {sp.contact_name && (
                          <div className="text-[11px] text-slate-400">ผู้ติดต่อ: {sp.contact_name}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {sp.contact_email}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-black text-sm text-white">
                          {sp.total_allocated_quota || 0}
                        </span>
                        <span className="text-slate-500 ml-1">ที่นั่ง</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-bold text-blue-400">
                          {sp.total_used_seats || 0}
                        </span>
                        <span className="text-slate-500 ml-1">คน</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenHistory(sp)}
                          className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-blue-600/30 text-slate-300 hover:text-blue-300 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          ดูรายชื่อ ({sp.total_registered_members || 0})
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleCopyLink(sp.contact_email, sp.id)}
                          className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                          }`}
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          {isCopied ? 'คัดลอกแล้ว' : 'Copy Link'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* 1. MODAL: HISTORY OF MEMBERS REGISTERED BY SPONSOR */}
      {/* ======================================================= */}
      {mounted &&
        historyModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">
                      ประวัติสมาชิกที่ {selectedSponsorForHistory?.name} เคยลงทะเบียน
                    </h3>
                    <p className="text-xs text-slate-400">
                      อีเมลตัวแทน: {selectedSponsorForHistory?.contact_email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1">
                {historyLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin" />
                    กำลังโหลดประวัติ...
                  </div>
                ) : historyList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    ยังไม่มีประวัติสมาชิกที่บริษัทนี้เคยลงทะเบียน
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">เลขสมาชิก</th>
                          <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                          <th className="py-2.5 px-3">งานประชุม</th>
                          <th className="py-2.5 px-3">รหัส Ticket</th>
                          <th className="py-2.5 px-3">วันที่ทำรายการ</th>
                          <th className="py-2.5 px-3">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {historyList.map((row) => (
                          <tr key={row.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-mono font-bold text-blue-400">
                              {row.memberNo}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-white">{row.attendeeName}</div>
                              <div className="text-[11px] text-slate-400">{row.attendeeEmail}</div>
                            </td>
                            <td className="py-3 px-3">{row.meetingName || row.meetingId}</td>
                            <td className="py-3 px-3 font-mono text-amber-300 font-bold">
                              {row.ticketCode || '-'}
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              {new Date(row.registeredAt).toLocaleDateString('th-TH')}
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {row.attendanceStatus || 'Registered'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex justify-end">
                <button
                  onClick={() => setHistoryModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ======================================================= */}
      {/* 2. MODAL: ADD NEW SPONSOR */}
      {/* ======================================================= */}
      {mounted &&
        addModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-blue-400" />
                  เพิ่มข้อมูลบริษัทสปอนเซอร์
                </h3>
                <button
                  onClick={() => setAddModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSponsor} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ชื่อบริษัท <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSponsorForm.name}
                    onChange={(e) => setNewSponsorForm({ ...newSponsorForm, name: e.target.value })}
                    placeholder="เช่น LG Chem, Merck, Ferring"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ระดับสปอนเซอร์ (Tier) <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={newSponsorForm.tier}
                    onChange={(e) => setNewSponsorForm({ ...newSponsorForm, tier: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Platinum">💎 Platinum</option>
                    <option value="Gold">🥇 Gold</option>
                    <option value="Silver">🥈 Silver</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    อีเมลตัวแทนผู้ประสานงาน <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={newSponsorForm.contactEmail}
                    onChange={(e) => setNewSponsorForm({ ...newSponsorForm, contactEmail: e.target.value })}
                    placeholder="rep@company.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    * อีเมลนี้จะใช้สำหรับรับรหัสชั่วคราว (OTP) เพื่อเข้าสู่ระบบลงทะเบียนกลุ่ม
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    ชื่อผู้ประสานงาน (Optional)
                  </label>
                  <input
                    type="text"
                    value={newSponsorForm.contactName}
                    onChange={(e) => setNewSponsorForm({ ...newSponsorForm, contactName: e.target.value })}
                    placeholder="เช่น คุณสมชาย (ผู้จัดการฝ่ายขาย)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={addingSponsor}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {addingSponsor ? 'กำลังบันทึก...' : 'บันทึกข้อมูลบริษัท'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
