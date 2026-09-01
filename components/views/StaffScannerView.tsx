'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, QrCode, Search, CheckCircle2, AlertTriangle, XCircle, Users, UserCheck, AlertCircle, Video, VideoOff } from 'lucide-react';
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
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[680px] bg-slate-900 text-white font-sans">
      {/* Header Bar */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <BornIvfLogo className="w-8 h-8" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white">ระบบเช็คอินสำหรับเจ้าหน้าที่</span>
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Staff Scanner
              </span>
            </div>
            <p className="text-[11px] text-slate-400">THAISRM Association Summit 2026</p>
          </div>
        </div>
      </div>

      {/* Main Scanner Section */}
      <div className="px-4 py-5 space-y-4 flex-1">
        {/* Real-time Stats Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
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

        {/* Live Camera Scanner Viewport */}
        <div className="relative rounded-3xl overflow-hidden bg-black border-2 border-slate-700 aspect-square max-h-[320px] mx-auto flex items-center justify-center shadow-2xl">
          {!isCameraOn ? (
            /* Standby Screen when Camera is Paused */
            <div className="text-center p-6 space-y-3 animate-fade-in">
              <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
                <VideoOff className="w-7 h-7" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">กล้องถูกปิดอยู่ (Camera Standby)</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  กล้องหยุดทำงานเพื่อประหยัดแบตเตอรี่และทรัพยากรเครื่อง
                </p>
              </div>
              <button
                onClick={() => setIsCameraOn(true)}
                className="px-5 py-2.5 bg-[#0026b3] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer active:scale-95"
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
            <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
              {/* HTML5 QR Code Real Camera Video Container */}
              <div id={readerId} className="w-full h-full object-cover overflow-hidden" />

              {/* Laser Frame Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-[#4ade80] rounded-3xl relative shadow-[0_0_30px_rgba(74,222,128,0.25)] animate-pulse-glow">
                  {/* Animated Scanner Laser */}
                  <div className="w-full h-0.5 bg-[#4ade80] shadow-[0_0_15px_#4ade80] absolute animate-scan-laser" />
                </div>
              </div>

              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center text-xs font-bold text-emerald-400 z-10 animate-scale-up">
                  กำลังประมวลผลการเช็คอิน...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Camera Power Toggle Button (Positioned Directly Under Scanner Frame) */}
        <div className="pt-1">
          <button
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={`w-full py-3.5 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 border cursor-pointer active:scale-[0.98] shadow-sm ${
              isCameraOn
                ? 'bg-rose-500/20 text-rose-200 border-rose-500/40 hover:bg-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isCameraOn ? <VideoOff className="w-4 h-4 text-rose-400" /> : <Video className="w-4 h-4 text-emerald-400" />}
            <span>{isCameraOn ? 'ปิดการทำงานของกล้อง' : 'เปิดกล้องสแกน QR Code'}</span>
          </button>
        </div>

        {/* Quick Test Action Buttons for Demo */}
        <div className="flex gap-2">
          <button
            onClick={() => handleProcessScan('TICKET-2026-PASS')}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ทดสอบสแกนสำเร็จ</span>
          </button>
          <button
            onClick={() => handleProcessScan('TICKET-DUP')}
            className="flex-1 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
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

              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-black/40 border border-white/10">
                {lastScanned.status === 'success' && 'เช็คอินสำเร็จ'}
                {lastScanned.status === 'duplicate' && 'สแกนซ้ำแล้ว'}
                {lastScanned.status === 'invalid' && 'ตั๋วไม่ถูกต้อง'}
              </span>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 text-xs flex justify-between opacity-90 font-medium">
              <span>รหัส: {lastScanned.id}</span>
              <span>เวลา: {lastScanned.checkInTime}</span>
            </div>
          </div>
        )}

        {/* Manual Code Search Fallback Input */}
        <form onSubmit={handleManualCheckIn} className="space-y-1.5 pt-1">
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
              type="submit"
              className="bg-[#0026b3] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              เช็คอิน
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
