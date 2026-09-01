'use client';

import React, { useState, useEffect } from 'react';
import { Camera, QrCode, Search, CheckCircle2, AlertTriangle, XCircle, Flashlight, RefreshCw, Users, ShieldCheck, UserCheck } from 'lucide-react';
import { BornIvfLogo } from '@/components/BornIvfLogo';

interface CheckInRecord {
  id: string;
  name: string;
  ticketType: string;
  email: string;
  checkInTime: string;
  status: 'success' | 'duplicate' | 'invalid';
}

export function StaffScannerView() {
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<CheckInRecord | null>(null);
  const [stats, setStats] = useState({ total: 250, checkedIn: 148 });
  const [cameraActive, setCameraActive] = useState(true);
  const [torchOn, setTorchOn] = useState(false);

  // Demo scan simulation handler
  const handleSimulateScan = (codeStr?: string) => {
    const inputCode = codeStr || manualCode || 'TICKET-2026-8891';
    
    // Simulate database lookup logic
    if (inputCode.includes('DUP') || inputCode === 'TICKET-DUP') {
      setLastScanned({
        id: 'TICKET-2026-0042',
        name: 'สมชาย ใจดี',
        ticketType: 'Born Premium Pass (VVIP)',
        email: 'somchai@example.com',
        checkInTime: '10:15 น.',
        status: 'duplicate'
      });
    } else if (inputCode.includes('ERR')) {
      setLastScanned({
        id: inputCode,
        name: 'ไม่ระบุตัวตน',
        ticketType: 'N/A',
        email: 'N/A',
        checkInTime: 'N/A',
        status: 'invalid'
      });
    } else {
      setLastScanned({
        id: inputCode,
        name: 'ภัทรพล วงศ์สวัสดิ์',
        ticketType: 'Born Premium Pass',
        email: 'phattarapol@example.com',
        checkInTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        status: 'success'
      });
      setStats(prev => ({ ...prev, checkedIn: Math.min(prev.total, prev.checkedIn + 1) }));
    }
    setManualCode('');
  };

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[680px] bg-slate-900 text-white">
      {/* Header Bar */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <BornIvfLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white">ระบบเช็คอินเจ้าหน้าที่</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Staff Scanner
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Born IVF Association Summit 2026</p>
          </div>
        </div>

        <button
          onClick={() => setTorchOn(!torchOn)}
          className={`p-2.5 rounded-xl border transition ${
            torchOn ? 'bg-amber-400 text-slate-950 border-amber-300' : 'bg-slate-800 text-slate-300 border-slate-700'
          }`}
          title="เปิด/ปิดไฟฉาย"
        >
          <Flashlight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Scanner Section */}
      <div className="px-4 py-5 space-y-4 flex-1">
        {/* Real-time Stats Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0026b3] text-white flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold">ผู้เข้าร่วมงานทั้งหมด</p>
              <p className="text-lg font-black text-white">
                {stats.checkedIn} <span className="text-xs text-slate-400 font-normal">/ {stats.total} คน</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              {Math.round((stats.checkedIn / stats.total) * 100)}% เข้างานแล้ว
            </span>
          </div>
        </div>

        {/* Camera Viewport Container */}
        <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-slate-700 aspect-square max-h-[320px] mx-auto flex items-center justify-center shadow-2xl">
          {cameraActive ? (
            <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center">
              {/* Simulated Video Stream & Scanner Frame Overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 via-transparent to-blue-900/10" />
              
              {/* Target Bounding Box Corners */}
              <div className="w-52 h-52 border-2 border-[#4ade80] rounded-3xl relative flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.25)]">
                {/* Scanning Laser Animation */}
                <div className="w-full h-0.5 bg-[#4ade80] shadow-[0_0_12px_#4ade80] absolute top-1/4 animate-pulse" />
                
                <QrCode className="w-16 h-16 text-slate-600/50" />
              </div>

              <p className="absolute bottom-4 text-xs text-slate-300 font-medium bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-700">
                วาง QR Code ของผู้เข้าร่วมในกรอบเพื่อสแกน
              </p>
            </div>
          ) : (
            <div className="text-center p-6 space-y-2">
              <Camera className="w-10 h-10 text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">ปิดกล้องอยู่</p>
            </div>
          )}
        </div>

        {/* Quick Test Action Buttons for Demo */}
        <div className="flex gap-2">
          <button
            onClick={() => handleSimulateScan('TICKET-2026-PASS')}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ทดสอบสแกนสำเร็จ</span>
          </button>
          <button
            onClick={() => handleSimulateScan('TICKET-DUP')}
            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ทดสอบสแกนซ้ำ</span>
          </button>
        </div>

        {/* Scan Result Feedback Card */}
        {lastScanned && (
          <div
            className={`rounded-2xl p-4 border animate-fade-in ${
              lastScanned.status === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-100'
                : lastScanned.status === 'duplicate'
                ? 'bg-amber-950/60 border-amber-500/60 text-amber-100'
                : 'bg-rose-950/60 border-rose-500/60 text-rose-100'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                {lastScanned.status === 'success' && <UserCheck className="w-6 h-6 text-emerald-400" />}
                {lastScanned.status === 'duplicate' && <AlertTriangle className="w-6 h-6 text-amber-400" />}
                {lastScanned.status === 'invalid' && <XCircle className="w-6 h-6 text-rose-400" />}
                <div>
                  <h4 className="font-extrabold text-base leading-tight">{lastScanned.name}</h4>
                  <p className="text-xs opacity-80">{lastScanned.ticketType}</p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-black/40 border border-white/10">
                {lastScanned.status === 'success' && 'เช็คอินสำเร็จ'}
                {lastScanned.status === 'duplicate' && 'สแกนซ้ำแล้ว'}
                {lastScanned.status === 'invalid' && 'ตั๋วไม่ถูกต้อง'}
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 text-xs flex justify-between opacity-90">
              <span>รหัส: {lastScanned.id}</span>
              <span>เวลา: {lastScanned.checkInTime}</span>
            </div>
          </div>
        )}

        {/* Manual Code Search Fallback Input */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-slate-400">ค้นหาด้วยชื่อ / รหัสตั๋วแบบ Manual</label>
          <div className="flex gap-2">
            <div className="relative flex-1 bg-slate-800 border border-slate-700 rounded-xl flex items-center px-3">
              <Search className="w-4 h-4 text-slate-400 mr-2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="กรอกรหัสตั๋ว เช่น TICKET-2026"
                className="bg-transparent w-full text-xs text-white outline-none py-2.5 placeholder:text-slate-500"
              />
            </div>
            <button
              onClick={() => handleSimulateScan()}
              className="bg-[#0026b3] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition"
            >
              เช็คอิน
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
