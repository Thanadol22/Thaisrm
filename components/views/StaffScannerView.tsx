import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Html5Qrcode } from 'html5-qrcode';
import {
  Camera,
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Users,
  UserCheck,
  AlertCircle,
  Video,
  VideoOff,
  ShieldCheck,
  Sparkles,
  Globe,
  Lock,
  Delete,
  Calendar,
  MapPin,
  RefreshCw,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { useLanguage } from '@/context/LanguageContext';

interface CheckInRecord {
  id: string;
  name: string;
  ticketType: string;
  email: string;
  checkInTime: string;
  status: 'success' | 'duplicate' | 'invalid';
}

interface ActiveMeetingInfo {
  id: string;
  name: string;
  date?: string | Date;
  time?: string;
  location?: string;
  type?: string;
  status?: string;
}

export function StaffScannerView() {
  const router = useRouter();
  const { lang, toggleLang, t } = useLanguage();

  // Staff Passcode Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string>('');
  const [pinError, setPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState<string>('');
  const [isShake, setIsShake] = useState(false);

  // Active Meeting context from Database
  const [activeMeeting, setActiveMeeting] = useState<ActiveMeetingInfo | null>(null);

  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState<CheckInRecord | null>(null);
  const [stats, setStats] = useState({ total: 0, checkedIn: 0 });
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "html5-qr-reader";
  const cameraPermErrorRef = useRef<string>('');

  // Fetch / Refresh Stats from Database
  const fetchMeetingStats = useCallback(async (meetingId?: string, staffPinVal?: string) => {
    try {
      setIsRefreshingStats(true);
      const queryParams = new URLSearchParams();
      if (meetingId) queryParams.set('meetingId', meetingId);
      if (staffPinVal) queryParams.set('pin', staffPinVal);

      const res = await fetch(`/api/staff/stats?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        if (json.stats) {
          setStats(json.stats);
        }
        if (json.meeting && !activeMeeting) {
          setActiveMeeting(json.meeting);
        }
      }
    } catch (err) {
      console.error('Error fetching staff stats:', err);
    } finally {
      setIsRefreshingStats(false);
    }
  }, [activeMeeting]);

  // Check saved staff session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isAuthed = (sessionStorage.getItem('tsrm_staff_authed') || sessionStorage.getItem('thaisrm_staff_authed')) === 'true';
      const storedMeeting = sessionStorage.getItem('tsrm_staff_meeting') || sessionStorage.getItem('thaisrm_staff_meeting');
      const storedPin = sessionStorage.getItem('tsrm_staff_pin') || sessionStorage.getItem('thaisrm_staff_pin') || '';

      if (isAuthed) {
        setIsAuthenticated(true);
        if (storedPin) setSavedPin(storedPin);
        if (storedMeeting) {
          try {
            const parsed = JSON.parse(storedMeeting);
            setActiveMeeting(parsed);
            fetchMeetingStats(parsed.id, storedPin);
          } catch {
            fetchMeetingStats(undefined, storedPin);
          }
        } else {
          fetchMeetingStats(undefined, storedPin);
        }
      }
    }
    setIsAuthChecking(false);
  }, [fetchMeetingStats]);

  // Periodic stats polling every 20 seconds to sync check-ins across multiple staff devices
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      fetchMeetingStats(activeMeeting?.id, savedPin);
    }, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeMeeting?.id, savedPin, fetchMeetingStats]);

  // Shared Web Audio API Beep Generator for Instant Audio Feedback
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtxRef.current = new AudioContextClass();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playBeepSound = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = getAudioContext();
      if (!audioCtx) return;
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
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Mid pitch
        gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // Low pitch error
        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.warn("Audio Context Error:", e);
    }
  };

  // Handle PIN verification via Server API (Validates against meetings.staff_code in DB)
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyPin = async (inputPin: string) => {
    setIsVerifying(true);
    setPinErrorMessage('');
    try {
      const res = await fetch('/api/staff/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: inputPin }),
      });
      const data = await res.json();

      if (data.success) {
        playBeepSound('success');
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('tsrm_staff_authed', 'true');
          sessionStorage.setItem('tsrm_staff_pin', inputPin);
          if (data.meeting) {
            sessionStorage.setItem('tsrm_staff_meeting', JSON.stringify(data.meeting));
          }
        }
        setSavedPin(inputPin);
        if (data.meeting) {
          setActiveMeeting(data.meeting);
        }
        if (data.stats) {
          setStats(data.stats);
        }
        setIsAuthenticated(true);
        setPinError(false);
      } else {
        playBeepSound('error');
        setPinError(true);
        setPinErrorMessage(data.error || t.staff.passcodeIncorrect);
        setIsShake(true);
        setPin('');
        setTimeout(() => setIsShake(false), 500);
      }
    } catch {
      playBeepSound('error');
      setPinError(true);
      setPinErrorMessage(t.staff.passcodeIncorrect);
      setIsShake(true);
      setPin('');
      setTimeout(() => setIsShake(false), 500);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + num;
    setPin(newPin);
    setPinError(false);
    if (newPin.length === 6) {
      handleVerifyPin(newPin);
    }
  };

  const handleDeletePin = () => {
    setPin(prev => prev.slice(0, -1));
    setPinError(false);
  };

  const handleLockSystem = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('tsrm_staff_authed');
      sessionStorage.removeItem('tsrm_staff_meeting');
      sessionStorage.removeItem('tsrm_staff_pin');
      sessionStorage.removeItem('thaisrm_staff_authed');
      sessionStorage.removeItem('thaisrm_staff_meeting');
      sessionStorage.removeItem('thaisrm_staff_pin');
    }
    setIsAuthenticated(false);
    setActiveMeeting(null);
    setSavedPin('');
    setPin('');
  };

  const handleBackToLogin = () => {
    handleLockSystem();
    router.push('/login');
  };

  // Keep camera permission error text in sync with language
  useEffect(() => {
    cameraPermErrorRef.current = t.staff.cameraPermissionError;
  }, [t.staff.cameraPermissionError]);

  // Real Database Scan Processing Function
  const handleProcessScan = useCallback(async (decodedText: string) => {
    const trimmed = (decodedText || '').trim();
    if (!trimmed) return;

    setIsProcessing(true);

    try {
      const res = await fetch('/api/staff/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: activeMeeting?.id,
          code: trimmed,
          staffPin: savedPin,
        }),
      });

      const json = await res.json();

      if (json.success && json.record) {
        // Play appropriate sound feedback
        if (json.status === 'success') {
          playBeepSound('success');
        } else if (json.status === 'duplicate') {
          playBeepSound('warning');
        } else {
          playBeepSound('error');
        }

        setLastScanned({
          id: json.record.id,
          name: json.record.name,
          ticketType: json.record.ticketType,
          email: json.record.email,
          checkInTime: json.record.checkInTime,
          status: json.record.status,
        });

        // Update real-time stats count from database
        if (json.stats) {
          setStats(json.stats);
        }
      } else {
        playBeepSound('error');
        setLastScanned({
          id: trimmed,
          name: json.error || t.staff.unidentified,
          ticketType: 'N/A',
          email: 'N/A',
          checkInTime: 'N/A',
          status: 'invalid',
        });
      }
    } catch (err) {
      console.error('Scan processing error:', err);
      playBeepSound('error');
      setLastScanned({
        id: trimmed,
        name: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
        ticketType: 'N/A',
        email: 'N/A',
        checkInTime: 'N/A',
        status: 'invalid',
      });
    } finally {
      // Pause for 1.8 seconds before allowing next camera frame scan
      setTimeout(() => {
        setIsProcessing(false);
      }, 1800);
    }
  }, [activeMeeting?.id, savedPin, t.staff.unidentified]);

  // Initialize html5-qrcode real camera scanner (strictly Back Camera)
  useEffect(() => {
    let html5QrcodeScanner: Html5Qrcode | null = null;

    const startScanner = async () => {
      try {
        setCameraPermissionError(null);
        const { Html5Qrcode: Html5QrcodeClass } = await import('html5-qrcode');
        html5QrcodeScanner = new Html5QrcodeClass(readerId);
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
      } catch (err: unknown) {
        console.error("Camera Scanner Error:", err);
        setCameraPermissionError(cameraPermErrorRef.current);
      }
    };

    if (isCameraOn && isAuthenticated) {
      startScanner();
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch((err: unknown) => console.error("Error stopping scanner:", err));
      }
    };
  }, [isCameraOn, isAuthenticated, isProcessing, handleProcessScan]);

  const handleManualCheckIn = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessScan(manualCode.trim());
    setManualCode('');
  };

  // Avoid UI flicker while checking session/local storage
  if (isAuthChecking) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[640px]">
        <div className="w-8 h-8 border-4 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render PIN Passcode Entry Guard Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
        {/* Header Blue Card Section */}
        <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-5 sm:px-7 pt-6 sm:pt-8 pb-8 sm:pb-10 rounded-b-[32px] sm:rounded-b-[40px] shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4ade80]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 -left-12 w-44 h-44 bg-[#0026b3]/40 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div
                onClick={handleBackToLogin}
                className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group hover:opacity-90 transition"
                title="กลับสู่หน้าเข้าสู่ระบบ / Back to Login"
              >
                <ThaiSrmLogo className="w-8 h-8 sm:w-10 sm:h-10 ring-2 ring-[#4ade80]/40 shadow-sm shrink-0 group-hover:scale-105 transition-transform" />
                <div className="min-w-0">
                  <span className="text-[10px] sm:text-xs font-bold text-blue-200 block leading-tight truncate">
                    {t.associationName}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-white block leading-tight tracking-wide truncate">
                    {t.brandName}
                  </span>
                </div>
              </div>

              {/* Language Switcher Pill */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shrink-0 shadow-2xs"
              >
                <Globe className="w-3 h-3 text-blue-200 shrink-0" />
                <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
                <span className="text-white/40 font-normal">|</span>
                <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
              </button>
            </div>

            <div className="pt-2 text-center space-y-2">
              <div className="w-14 h-14 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-7 h-7 text-[#4ade80]" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {t.staff.passcodeTitle}
              </h1>
              <p className="text-xs text-blue-100/90 leading-relaxed font-normal max-w-xs mx-auto">
                {lang === 'th'
                  ? 'กรอกรหัส PIN 6 หลัก ประจำรอบการประชุม (ตั้งค่าได้จากเมนู Admin)'
                  : 'Enter 6-digit staff PIN configured for the active conference'}
              </p>
            </div>
          </div>
        </div>

        {/* Main Body with PIN Input */}
        <div className="px-5 sm:px-8 py-6 flex-1 flex flex-col justify-between items-center max-w-sm mx-auto w-full">
          {/* Hidden Input for Desktop Keyboard Typing */}
          <input
            type="password"
            pattern="[0-9]*"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setPin(val);
              setPinError(false);
              if (val.length === 6) handleVerifyPin(val);
            }}
            className="sr-only"
            autoFocus
            id="staff-pin-input"
          />

          {/* 6 Digit Indicators */}
          <div
            onClick={() => document.getElementById('staff-pin-input')?.focus()}
            className={`flex justify-center gap-2.5 sm:gap-3 my-3 cursor-pointer ${isShake ? 'animate-shake' : ''}`}
          >
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className={`w-10 h-12 sm:w-11 sm:h-13 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all duration-200 ${pin.length > index
                  ? 'border-[#0026b3] bg-[#0026b3] text-white shadow-md scale-105'
                  : pin.length === index
                    ? 'border-[#0026b3] bg-blue-50/80 text-blue-900 animate-pulse'
                    : 'border-slate-200 bg-white text-slate-400'
                  }`}
              >
                {pin.length > index ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Error Feedback */}
          {pinError && (
            <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-full text-xs font-extrabold animate-bounce my-1 text-center">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pinErrorMessage || t.staff.passcodeIncorrect}</span>
            </div>
          )}

          {/* Numeric Keypad Buttons */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 w-full max-w-[280px] my-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
              <button
                key={num}
                onClick={() => handleKeyPress(num)}
                className="h-12 sm:h-13 rounded-2xl bg-white border border-slate-200/90 text-slate-800 font-extrabold text-xl hover:bg-slate-50 active:scale-95 shadow-2xs transition flex items-center justify-center cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              onClick={() => setPin('')}
              className="h-12 sm:h-13 rounded-2xl bg-slate-100 text-slate-600 font-extrabold text-xs hover:bg-slate-200 active:scale-95 transition flex items-center justify-center cursor-pointer"
            >
              {t.staff.clearButton} (C)
            </button>
            <button
              onClick={() => handleKeyPress('0')}
              className="h-12 sm:h-13 rounded-2xl bg-white border border-slate-200/90 text-slate-800 font-extrabold text-xl hover:bg-slate-50 active:scale-95 shadow-2xs transition flex items-center justify-center cursor-pointer"
            >
              0
            </button>
            <button
              onClick={handleDeletePin}
              className="h-12 sm:h-13 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95 transition flex items-center justify-center cursor-pointer"
            >
              <Delete className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          {isVerifying && (
            <p className="text-[11px] text-[#0026b3] font-bold text-center pb-2 animate-pulse flex items-center justify-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>{t.staff.verifying}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Render Full Authenticated Staff Scanner View
  return (
    <div className="flex-1 flex flex-col justify-between animate-fade-in min-h-[640px]">
      {/* Header Blue Card Section with Green Ambient Accent */}
      <div className="bg-gradient-to-b from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white px-4 sm:px-7 pt-4 sm:pt-6 pb-5 sm:pb-7 rounded-b-[32px] sm:rounded-b-[40px] shadow-xl relative overflow-hidden">
        {/* Glowing Green & Blue Ambient Accents */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#4ade80]/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -left-12 w-44 h-44 bg-[#0026b3]/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div
              onClick={handleBackToLogin}
              className="flex items-center gap-2.5 sm:gap-3 min-w-0 cursor-pointer group hover:opacity-90 transition"
              title="กลับสู่หน้าเข้าสู่ระบบ / Back to Login"
            >
              <ThaiSrmLogo className="w-8 h-8 sm:w-10 sm:h-10 ring-2 ring-[#4ade80]/40 shadow-sm shrink-0 group-hover:scale-105 transition-transform" />
              <div className="min-w-0">
                <span className="text-[10px] sm:text-xs font-bold text-blue-200 block leading-tight truncate">
                  {t.associationName}
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-white block leading-tight tracking-wide truncate">
                  {t.brandName}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Language Switcher Pill */}
              <button
                onClick={toggleLang}
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white backdrop-blur-md px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition border border-white/20 cursor-pointer active:scale-95 shrink-0 shadow-2xs"
                title="Switch Language / สลับภาษา"
              >
                <Globe className="w-3 h-3 text-blue-200 shrink-0" />
                <span className={lang === 'th' ? 'text-white font-black' : 'text-blue-200/60'}>TH</span>
                <span className="text-white/40 font-normal">|</span>
                <span className={lang === 'en' ? 'text-white font-black' : 'text-blue-200/60'}>EN</span>
              </button>

              {/* Lock / Exit Staff Mode Button */}
              <button
                onClick={handleLockSystem}
                className="flex items-center gap-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-extrabold transition cursor-pointer active:scale-95 shrink-0"
                title="ออกจากระบบเจ้าหน้าที่ / Lock Staff View"
              >
                <Lock className="w-3 h-3 text-rose-300 shrink-0" />
                <span>{t.staff.passcodeLock}</span>
              </button>
            </div>
          </div>

          {/* Active Meeting Context Banner in Header */}
          <div className="pt-1">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="bg-[#4ade80] text-[#061d08] text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
                <span>จุดเช็คอินสตาฟ (STAFF)</span>
              </span>
              {activeMeeting?.id && (
                <span className="bg-white/20 text-white font-mono text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-white/20">
                  {activeMeeting.id}
                </span>
              )}
            </div>

            <h1 className="text-base sm:text-lg font-black text-white tracking-tight leading-snug truncate" title={activeMeeting?.name || t.staff.title}>
              {activeMeeting?.name || t.staff.title}
            </h1>

            {activeMeeting?.location && (
              <p className="text-[11px] text-blue-100/80 leading-tight flex items-center gap-1 mt-0.5 truncate" title={activeMeeting.location}>
                <MapPin className="w-3 h-3 text-[#4ade80] shrink-0" />
                <span className="truncate">{activeMeeting.location}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-3.5">
          {/* Real-time Stats Card with Green/Blue Accent Border */}
          <div className="bg-gradient-to-r from-blue-50/60 via-white to-emerald-50/50 border-l-4 border-l-[#0026b3] border-y border-r border-slate-200/90 rounded-2xl sm:rounded-3xl p-3 sm:p-4 flex items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#0026b3] text-white flex items-center justify-center shadow-xs ring-2 ring-[#4ade80]/30 shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[11px] sm:text-xs text-slate-500 font-extrabold whitespace-nowrap">{t.staff.statsTotal}</p>
                  <button
                    type="button"
                    onClick={() => fetchMeetingStats(activeMeeting?.id, savedPin)}
                    disabled={isRefreshingStats}
                    className="text-slate-400 hover:text-[#0026b3] transition cursor-pointer p-0.5"
                    title="รีเฟรชสถิติล่าสุด"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingStats ? 'animate-spin text-[#0026b3]' : ''}`} />
                  </button>
                </div>
                <p className="text-base sm:text-xl font-black text-slate-900 leading-tight whitespace-nowrap">
                  {stats.checkedIn} <span className="text-[10px] sm:text-xs text-slate-500 font-medium">/ {stats.total} คน</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              {/* Ultra Smooth Vibrant Animated Neon Green Badge */}
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-slate-950 bg-gradient-to-r from-[#4ade80] via-[#22c55e] to-[#4ade80] px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-[0_0_18px_rgba(74,222,128,0.6)] border border-[#86efac] animate-neon-pulse cursor-default whitespace-nowrap">
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-slate-950" />
                </span>
                <span className="whitespace-nowrap">
                  {stats.total > 0 ? Math.round((stats.checkedIn / stats.total) * 100) : 0}% {t.staff.checkedInPercent}
                </span>
              </span>
            </div>
          </div>

          {/* Live Camera Scanner Viewport with Green Accent Border */}
          <div className="relative rounded-3xl overflow-hidden bg-slate-950 border-2 border-[#4ade80]/60 aspect-square max-h-[300px] mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(74,222,128,0.15)]">
            {!isCameraOn ? (
              /* Standby Screen when Camera is Paused */
              <div className="text-center p-6 space-y-3 animate-fade-in">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
                  <VideoOff className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">{t.staff.cameraStandbyTitle}</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {t.staff.cameraStandbyDesc}
                  </p>
                </div>
                <button
                  onClick={() => setIsCameraOn(true)}
                  className="px-5 py-2.5 bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] text-xs font-black rounded-xl shadow-md transition cursor-pointer active:scale-95"
                >
                  {t.staff.turnOnCamera}
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
                  {t.staff.retryCamera}
                </button>
              </div>
            ) : (
              <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                {/* HTML5 QR Code Real Camera Video Container */}
                <div id={readerId} className="w-full h-full object-cover overflow-hidden" />

                {/* Laser Frame Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-48 h-48 sm:w-52 sm:h-52 border-2 border-[#4ade80] rounded-3xl relative shadow-[0_0_35px_rgba(74,222,128,0.4)] animate-pulse-glow">
                    {/* Animated Scanner Laser */}
                    <div className="w-full h-0.5 bg-[#4ade80] shadow-[0_0_18px_#4ade80] absolute animate-scan-laser" />
                  </div>
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 bg-[#0026b3]/90 backdrop-blur-xs flex items-center justify-center text-xs sm:text-sm font-bold text-[#4ade80] z-10 animate-scale-up gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{t.staff.processingScan}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Camera Power Toggle Button */}
          <div className="pt-0.5">
            <button
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={`w-full py-2.5 sm:py-3 px-4 rounded-2xl text-xs font-extrabold transition flex items-center justify-center gap-2 border cursor-pointer active:scale-[0.99] shadow-sm ${isCameraOn
                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                : 'bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] border-transparent shadow-md'
                }`}
            >
              {isCameraOn ? <VideoOff className="w-4 h-4 text-rose-600" /> : <Video className="w-4 h-4 text-[#061d08]" />}
              <span>{isCameraOn ? t.staff.cameraOn : t.staff.cameraOff}</span>
            </button>
          </div>

          {/* Scan Result Feedback Card */}
          {lastScanned && (
            <div
              className={`rounded-2xl p-3.5 sm:p-4 border animate-scale-up shadow-sm transition-all ${lastScanned.status === 'success'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 ring-2 ring-emerald-200'
                : lastScanned.status === 'duplicate'
                  ? 'bg-amber-50 border-amber-300 text-amber-950 ring-2 ring-amber-200'
                  : 'bg-rose-50 border-rose-300 text-rose-950 ring-2 ring-rose-200'
                }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                  {lastScanned.status === 'success' && <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 shrink-0" />}
                  {lastScanned.status === 'duplicate' && <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 shrink-0" />}
                  {lastScanned.status === 'invalid' && <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 shrink-0" />}
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm sm:text-base leading-tight text-slate-900 truncate">{lastScanned.name}</h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium truncate">{lastScanned.ticketType}</p>
                  </div>
                </div>

                <span
                  className={`text-[9px] sm:text-[10px] font-black uppercase px-2 sm:px-2.5 py-0.5 rounded-full border shrink-0 whitespace-nowrap ${lastScanned.status === 'success'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : lastScanned.status === 'duplicate'
                      ? 'bg-amber-500 text-white border-amber-600'
                      : 'bg-rose-600 text-white border-rose-700'
                    }`}
                >
                  {lastScanned.status === 'success' && (lang === 'th' ? '✓ สำเร็จ' : 'Success')}
                  {lastScanned.status === 'duplicate' && (lang === 'th' ? '⚠️ สแกนซ้ำแล้ว' : 'Duplicate')}
                  {lastScanned.status === 'invalid' && (lang === 'th' ? '✗ ไม่พบข้อมูล' : 'Invalid')}
                </span>
              </div>

              {lastScanned.status === 'duplicate' && (
                <div className="mt-2 text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-xl border border-amber-200 font-medium">
                  📌 ข้อมูลถูกบันทึกสำเร็จไปแล้วเมื่อ <strong>{lastScanned.checkInTime}</strong> (ระบบคงเวลาเช็คอินเดิมไว้)
                </div>
              )}

              <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] sm:text-xs flex flex-wrap justify-between items-end text-slate-600 font-semibold gap-2">
                <div className="min-w-0">
                  <span className="truncate block">{t.staff.participantName} {lastScanned.name}</span>
                  {lastScanned.id && (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-blue-900 bg-blue-100/80 font-black px-2 py-0.5 rounded-md mt-1">
                      Token / Code: {lastScanned.id}
                    </span>
                  )}
                </div>
                <span className="shrink-0 whitespace-nowrap text-slate-500 font-medium">
                  {t.staff.checkInTimeLabel} {lastScanned.checkInTime}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Manual Code Search Fallback Input */}
        <form onSubmit={handleManualCheckIn} className="space-y-1.5 pt-2 pb-1">
          <label className="text-[11px] sm:text-xs font-extrabold text-slate-600 block">
            {lang === 'th' ? 'ค้นหาหรือป้อนเลขสมาชิก / รหัสตั๋วด้วยตนเอง' : t.staff.manualTitle}
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1 bg-white border border-slate-200 focus-within:border-[#0026b3] focus-within:ring-2 focus-within:ring-[#0026b3]/20 rounded-2xl flex items-center px-3 sm:px-3.5 shadow-2xs transition min-w-0">
              <Search className="w-4 h-4 text-[#0026b3] mr-2 shrink-0" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder={lang === 'th' ? 'เช่น 0123, TSRM-2026-8891, หรือเบอร์โทร' : t.staff.manualPlaceholder}
                className="bg-transparent w-full text-[11px] sm:text-xs text-slate-800 outline-none py-2.5 sm:py-3 placeholder:text-slate-400 font-medium min-w-0"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim() || isProcessing}
              className={`text-[11px] sm:text-xs font-black px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl transition shadow-sm shrink-0 whitespace-nowrap ${
                !manualCode.trim() || isProcessing
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-[#4ade80] hover:bg-[#3ec424] text-[#061d08] cursor-pointer active:scale-95'
              }`}
            >
              {t.staff.checkInButton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
