'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, QrCode, Search, CheckCircle2, AlertTriangle, XCircle, Users, UserCheck, AlertCircle, Video, VideoOff, ShieldCheck, Sparkles } from 'lucide-react';
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
  const [stats, setStats] = useState({ total: 500, checkedIn: 148 });
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<any>(null);
  const readerId = "html5-qr-reader";

  // Web Audio API Beep Generator for Scanner Feedback
  const playBeepSound = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context Error:", e);
    }
  };

  // Initialize html5-qrcode real camera scanner (strictly Environment / Back Camera)
  useEffect(() => {
    let html5QrcodeScanner: any = null;

    const startScanner = async () => {
      try {
        setCameraPermissionError(null);
        const { Html5Qrcode } = await import('html5-qrcode');
        html5QrcodeScanner = new Html5Qrcode(readerId);
        scannerRef.current = html5QrcodeScanner;

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        // Strictly set to back camera (environment)
        await html5QrcodeScanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            if (!isProcessing) {
              handleProcessScan(decodedText);
            }
          },
          undefined
        );
      } catch (err: any) {
        console.error("Camera Scanner Error:", err);
        setCameraPermissionError(
          "ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบการอนุญาตใช้งานกล้อง (Camera Permission) หรือใช้งานผ่าน HTTPS"
        );
      }
    };

    if (isCameraOn) {
      startScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current.clear())
          .catch((err: any) => console.error("Error stopping scanner:", err));
      }
    };
  }, [isCameraOn]);

  // Process Scanned Code
  const handleProcessScan = (decodedText: string) => {
    setIsProcessing(true);
    const inputCode = decodedText || 'TICKET-2026-8891';

    if (inputCode.includes('DUP') || inputCode === 'TICKET-DUP') {
      playBeepSound('warning');
      setLastScanned({
        id: 'TICKET-2026-0042',
        name: 'สมชาย ใจดี',
        ticketType: 'THAISRM Premium Pass',
        email: 'somchai@example.com',
        checkInTime: '10:15 น.',
        status: 'duplicate'
      });
    } else if (inputCode.includes('ERR')) {
      playBeepSound('error');
      setLastScanned({
        id: inputCode,
        name: 'ไม่ระบุตัวตน',
        ticketType: 'N/A',
        email: 'N/A',
        checkInTime: 'N/A',
        status: 'invalid'
      });
    } else {
      playBeepSound('success');
      setLastScanned({
        id: inputCode,
        name: 'ภัทรพล วงศ์สวัสดิ์',
        ticketType: 'THAISRM Premium Pass',
        email: 'phattarapol@example.com',
        checkInTime: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        status: 'success'
      });
      setStats(prev => ({ ...prev, checkedIn: Math.min(prev.total, prev.checkedIn + 1) }));
    }

    // Pause for 2 seconds before allowing next scan
    setTimeout(() => {
      setIsProcessing(false);
    }, 2000);
  };

  const handleManualCheckIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScan(manualCode.trim());
    setManualCode('');
  };

  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section with Green Ambient Accent */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-7 pt-7 pb-9 rounded-b-[40px] shadow-xl relative overflow-hidden">
        {/* Glowing Green & Blue Ambient Accents */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4ade80]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-44 h-44 bg-[#0026b3]/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BornIvfLogo className="w-10 h-10 ring-2 ring-[#4ade80]/40 shadow-sm" />
              <div>
                <span className="text-base font-extrabold text-white block leading-tight tracking-wide">THAISRM</span>
                <span className="text-xs text-blue-100/90 font-medium">Meeting Summit 2026</span>
              </div>
            </div>
            {/* Green Accent Badge */}
            <span className="bg-[#4ade80] text-[#061d08] text-[11px] font-black px-3.5 py-1 rounded-full shadow-sm flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Staff Portal</span>
            </span>
          </div>

          <div className="pt-2">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>ระบบเช็คอินสำหรับเจ้าหน้าที่</span>
            </h1>
            <p className="text-xs text-blue-100/90 leading-relaxed mt-1 font-normal">
              สแกน QR Code ตั๋วผู้เข้าร่วมงานเพื่อยืนยันสิทธิ์และเช็คอินเข้างาน
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="px-6 py-6 space-y-4 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Real-time Stats Card with Green/Blue Accent Border */}
          <div className="bg-gradient-to-r from-blue-50/60 via-white to-emerald-50/50 border-l-4 border-l-[#0026b3] border-y border-r border-slate-200/90 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#0026b3] text-white flex items-center justify-center shadow-xs ring-2 ring-[#4ade80]/30">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-extrabold">ผู้เข้าร่วมงานทั้งหมด</p>
                <p className="text-xl font-black text-slate-900">
                  {stats.checkedIn} <span className="text-xs text-slate-500 font-medium">/ {stats.total} คน</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              {/* Ultra Vibrant Animated Neon Green Badge */}
              <span className="inline-flex items-center gap-2 text-xs font-black text-slate-950 bg-gradient-to-r from-[#4ade80] via-[#22c55e] to-[#4ade80] px-4 py-1.5 rounded-full shadow-[0_0_18px_rgba(74,222,128,0.6)] border border-[#86efac] animate-neon-pulse cursor-default">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950" />
                </span>
                <span>{Math.round((stats.checkedIn / stats.total) * 100)}% เข้างานแล้ว</span>
              </span>
            </div>
          </div>

          {/* Live Camera Scanner Viewport with Green Accent Border */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-[#4ade80]/60 aspect-square max-h-[320px] mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(74,222,128,0.15)]">
            {!isCameraOn ? (
              /* Standby Screen when Camera is Paused */
              <div className="text-center p-6 space-y-3 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
                  <VideoOff className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">กล้องถูกปิดอยู่ (Camera Standby)</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    กล้องหยุดทำงานเพื่อประหยัดแบตเตอรี่และทรัพยากรเครื่อง
                  </p>
                </div>
                <button
                  onClick={() => setIsCameraOn(true)}
                  className="px-5 py-2.5 bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] text-xs font-black rounded-xl shadow-md transition cursor-pointer active:scale-95"
                >
                  เปิดกล้องสแกน
                </button>
              </div>
            ) : cameraPermissionError ? (
              <div className="text-center p-6 space-y-3">
                <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
                <p className="text-xs text-rose-200 leading-relaxed max-w-xs">{cameraPermissionError}</p>
                <button
                  onClick={() => setIsCameraOn(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white rounded-xl border border-slate-600 transition cursor-pointer"
                >
                  ลองเปิดใหม่อีกครั้ง
                </button>
              </div>
            ) : (
              <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                {/* HTML5 QR Code Real Camera Video Container */}
                <div id={readerId} className="w-full h-full object-cover overflow-hidden" />

                {/* Laser Frame Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-52 h-52 border-2 border-[#4ade80] rounded-3xl relative shadow-[0_0_35px_rgba(74,222,128,0.4)] animate-pulse-glow">
                    {/* Animated Scanner Laser */}
                    <div className="w-full h-0.5 bg-[#4ade80] shadow-[0_0_18px_#4ade80] absolute animate-scan-laser" />
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center text-xs font-bold text-[#4ade80] z-10 animate-scale-up">
                    กำลังประมวลผลการเช็คอิน...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camera Power Toggle Button (Positioned Directly Under Scanner Frame) */}
          <div className="pt-0.5">
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-full py-3.5 px-4 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 border cursor-pointer active:scale-[0.99] shadow-sm ${isCameraOn
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] border-transparent shadow-md'
                }`}
            >
              {isCameraOn ? <VideoOff className="w-4 h-4 text-rose-600" /> : <Video className="w-4 h-4 text-[#061d08]" />}
              <span>{isCameraOn ? 'ปิดการทำงานของกล้อง' : 'เปิดกล้องสแกน QR Code'}</span>
            </button>
          </div>

          {/* Quick Test Action Buttons for Demo */}
          <div className="flex gap-2">
            <button
              onClick={() => handleProcessScan('TICKET-2026-PASS')}
              className="flex-1 py-3 px-3 rounded-2xl bg-[#4ade80]/20 hover:bg-[#4ade80]/30 text-emerald-950 border border-[#4ade80]/50 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>ทดสอบสแกนสำเร็จ</span>
            </button>
            <button
              onClick={() => handleProcessScan('TICKET-DUP')}
              className="flex-1 py-3 px-3 rounded-2xl bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 border border-amber-300/90 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>ทดสอบสแกนซ้ำ</span>
            </button>
          </div>

          {/* Scan Result Feedback Card */}
          {lastScanned && (
            <div
              className={`rounded-2xl p-4 border animate-scale-up shadow-sm ${lastScanned.status === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : lastScanned.status === 'duplicate'
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  {lastScanned.status === 'success' && <UserCheck className="w-6 h-6 text-emerald-600" />}
                  {lastScanned.status === 'duplicate' && <AlertTriangle className="w-6 h-6 text-amber-600" />}
                  {lastScanned.status === 'invalid' && <XCircle className="w-6 h-6 text-rose-600" />}
                  <div>
                    <h4 className="font-extrabold text-base leading-tight text-slate-900">{lastScanned.name}</h4>
                    <p className="text-xs text-slate-600 font-medium">{lastScanned.ticketType}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${lastScanned.status === 'success'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : lastScanned.status === 'duplicate'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-rose-600 text-white border-rose-700'
                    }`}
                >
                  {lastScanned.status === 'success' && 'เช็คอินสำเร็จ'}
                  {lastScanned.status === 'duplicate' && 'สแกนซ้ำแล้ว'}
                  {lastScanned.status === 'invalid' && 'ตั๋วไม่ถูกต้อง'}
                </span>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-xs flex justify-between text-slate-600 font-semibold">
                <span>รหัส: {lastScanned.id}</span>
                <span>เวลา: {lastScanned.checkInTime}</span>
              </div>
            </div>
          )}
        </div>

        {/* Manual Code Search Fallback Input */}
        <form onSubmit={handleManualCheckIn} className="space-y-1.5 pt-2 pb-2">
          <label className="text-xs font-extrabold text-slate-600">ค้นหาด้วยชื่อ / รหัสตั๋วแบบ Manual</label>
          <div className="flex gap-2">
            <div className="relative flex-1 bg-white border border-slate-200 focus-within:border-[#0026b3] focus-within:ring-2 focus-within:ring-[#0026b3]/20 rounded-2xl flex items-center px-3.5 shadow-2xs transition">
              <Search className="w-4 h-4 text-[#0026b3] mr-2" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="กรอกรหัสตั๋ว เช่น TICKET-2026"
                className="bg-transparent w-full text-xs text-slate-800 outline-none py-3 placeholder:text-slate-400 font-medium"
              />
            </div>
            <button
              type="submit"
              className="bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] text-xs font-black px-5 py-3 rounded-2xl transition cursor-pointer active:scale-95 shadow-sm"
            >
              เช็คอิน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
