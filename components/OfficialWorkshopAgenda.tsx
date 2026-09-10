'use client';

import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Printer,
  Sparkles,
  Users,
  Award,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface OfficialWorkshopAgendaProps {
  onPrint?: () => void;
  lang?: string;
}

export function OfficialWorkshopAgenda({
  onPrint,
  lang = 'th',
}: OfficialWorkshopAgendaProps) {
  const [activeTab, setActiveTab] = useState<'ws1' | 'ws3' | 'overview'>('ws1');

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-0">
      {/* Action Toolbar & Sub-tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-xs print:hidden">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('ws1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'ws1'
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            WS 1: ART Nurse
          </button>
          <button
            onClick={() => setActiveTab('ws3')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'ws3'
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            WS 3: Hysteroscopy
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#0026b3] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            {lang === 'th' ? 'สรุปเวิร์กช็อป WS 1-4' : 'WS 1-4 Overview'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-[#0026b3] hover:bg-blue-800 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs active:scale-95"
            title="พิมพ์หรือบันทึกเป็น PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>{lang === 'th' ? 'พิมพ์ / บันทึก PDF' : 'Print / Save PDF'}</span>
          </button>
        </div>
      </div>

      {/* ─── TAB 1: WS 1 ART NURSE ─── */}
      {activeTab === 'ws1' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#03153c] via-[#0026b3] to-[#041a4a] text-white p-6 sm:p-8 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 bg-[#00e5ff]/20 text-[#38bdf8] border border-[#38bdf8]/40 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase">
                <Sparkles className="w-3 h-3 text-[#38bdf8]" />
                <span>34th TSRM 2026 • Precongress Workshop</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Program WS 1: ART Nurse
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-blue-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-300" />
                  <span>วันอังคารที่ 20 ตุลาคม 2569 (20-Oct-2026)</span>
                </div>
                <span className="opacity-40">|</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-cyan-300" />
                  <span>12th Floor Wanalai 1,2 • Grande Centre Point LUMPHINI, Bangkok</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-[#0b276d] text-white flex flex-col sm:flex-row text-xs sm:text-sm font-extrabold">
                <div className="w-full sm:w-44 p-3.5 border-b sm:border-b-0 sm:border-r border-blue-900/60 shrink-0">
                  เวลา (Time)
                </div>
                <div className="flex-1 p-3.5 border-b sm:border-b-0 sm:border-r border-blue-900/60">
                  หัวข้อการบรรยายและวิทยากร (Topic & Speaker)
                </div>
                <div className="w-full sm:w-32 p-3.5 shrink-0 text-center">
                  Sponsor
                </div>
              </div>

              <div className="divide-y divide-slate-200 text-xs sm:text-[13px]">
                {/* 07.30 - 08.15 */}
                <div className="flex flex-col sm:flex-row bg-slate-50/50 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-800 shrink-0">07.30 - 08.15</div>
                  <div className="flex-1 font-semibold text-slate-700">Register (ลงทะเบียน)</div>
                  <div className="w-full sm:w-32 text-center text-slate-400 text-xs mt-1 sm:mt-0">-</div>
                </div>

                {/* 08.15 - 08.30 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-[#0026b3] shrink-0">08.15 - 08.30</div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">Welcome Speech</span>
                    <span className="text-slate-600 block text-xs">President of TSRM : <strong className="text-slate-900">นพ.สวัสดิ์ ไตรตรงึษ์ทัศนา</strong></span>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 08.30 - 09.00 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">08.30 - 09.00</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Semen analysis and sperm preparation</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">ผศ.พญ. อุษณีย์ แสนหมี่</span></div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 09.00 - 09.30 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">09.00 - 09.30</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Ovarian Stimulation protocol for IVF</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">รศ.พญ. ชนกานต์ สืบถวิลกุล</span></div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 09.30 - 10.00 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">09.30 - 10.00</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Ovarian Stimulation protocol for fertility preservation in cancer patients</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">ผศ.พญ.พรทิพย์ สิริยาภิวัฒน์</span></div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 10.00 - 10.30 */}
                <div className="flex flex-col sm:flex-row bg-amber-50/70 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-amber-900 shrink-0">10.00 - 10.30</div>
                  <div className="flex-1 font-bold text-amber-900">☕ Coffee break (พักรับประทานอาหารว่าง)</div>
                  <div className="w-full sm:w-32 text-center text-slate-400 text-xs mt-1 sm:mt-0">-</div>
                </div>

                {/* 10.30 - 11.10 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">10.30 - 11.10</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Endometrial preparation for frozen-thawed embryo transfer</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">รศ.นพ.สมสิญจน์ เพ็ชรยิ้ม</span></div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 11.10 - 11.50 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">11.10 - 11.50</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Infection control and aseptic technique in ART lab</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">อ.นพ. ดิษรุจ โตวิกกัย</span> (อายุรศาสตร์ จุฬาฯ)</div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 12.00 - 13.00 */}
                <div className="flex flex-col sm:flex-row bg-emerald-50/70 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-emerald-900 shrink-0">12.00 - 13.00</div>
                  <div className="flex-1 font-bold text-emerald-900">🍽️ Lunch (พักรับประทานอาหารกลางวัน)</div>
                  <div className="w-full sm:w-32 text-center text-slate-400 text-xs mt-1 sm:mt-0">-</div>
                </div>

                {/* 13.00 - 13.30 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">13.00 - 13.30</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Pre-treatment investigations and treatment in ART</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">พญ.พิมพกา ชวนะเวสน์</span></div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 13.30 - 14.00 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">13.30 - 14.00</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Laboratory testing in ART: what fertility nurse should know.</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">ผศ.พญ. ณิชมน ภาคภิญโญ</span></div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 14.00 - 14.30 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">14.00 - 14.30</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">การขออนุญาตตั้งครรภ์แทน (อุ้มบุญ)</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">เภสัชกรหญิง ชยาวี กาญวัฒะกิจ</span> (สบส.)</div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 14.30 - 15.00 */}
                <div className="flex flex-col sm:flex-row bg-amber-50/70 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-amber-900 shrink-0">14.30 - 15.00</div>
                  <div className="flex-1 font-bold text-amber-900">☕ Coffee break (พักรับประทานอาหารว่าง)</div>
                  <div className="w-full sm:w-32 text-center text-slate-400 text-xs mt-1 sm:mt-0">-</div>
                </div>

                {/* 15.00 - 15.45 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-[#0026b3] shrink-0">15.00 - 15.45</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Counselling patients through IVF/ICSI and embryo transfer: the essential role of fertility nurses</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">คุณเหมือนฝัน สระทองคุ้ม</span> (ศิริราช)</div>
                  </div>
                  <div className="w-full sm:w-32 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* Closing */}
                <div className="flex flex-col sm:flex-row bg-slate-100 p-3.5 items-center justify-between font-bold text-slate-800">
                  <div className="w-full sm:w-44 font-mono text-slate-600">15.45 น.</div>
                  <div className="flex-1 text-red-600 font-extrabold">QA & Conference closed</div>
                  <div className="w-full sm:w-32 text-center text-slate-400 text-xs">-</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: WS 3 HYSTEROSCOPIC SURGERY ─── */}
      {activeTab === 'ws3' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden print:border-none print:shadow-none print:rounded-none">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-[#03153c] via-[#0026b3] to-[#041a4a] text-white p-6 sm:p-8 relative overflow-hidden">
            <div className="relative z-10 space-y-3">
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-3.5 py-1 rounded-full text-[11px] sm:text-xs font-black tracking-wider uppercase">
                <Sparkles className="w-3 h-3 text-emerald-300" />
                <span>34th TSRM 2026 • Precongress Workshop (THAI session)</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
                Program WS 3: Fertility-enhancing hysteroscopic surgery
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-blue-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-cyan-300" />
                  <span>วันอังคารที่ 20 ตุลาคม 2569 (20-Oct-2026)</span>
                </div>
                <span className="opacity-40">|</span>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-cyan-300" />
                  <span>12th Floor ห้องพิมาน 2 • Grande Centre Point LUMPHINI, Bangkok</span>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-[#0b276d] text-white flex flex-col sm:flex-row text-xs sm:text-sm font-extrabold">
                <div className="w-full sm:w-44 p-3.5 border-b sm:border-b-0 sm:border-r border-blue-900/60 shrink-0">
                  เวลา (Time)
                </div>
                <div className="flex-1 p-3.5 border-b sm:border-b-0 sm:border-r border-blue-900/60">
                  หัวข้อการบรรยายและวิทยากร (Topic & Faculty)
                </div>
                <div className="w-full sm:w-48 p-3.5 shrink-0 text-center">
                  Sponsor by
                </div>
              </div>

              <div className="divide-y divide-slate-200 text-xs sm:text-[13px]">
                {/* 07.30 - 08.00 */}
                <div className="flex flex-col sm:flex-row bg-slate-50/50 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-800 shrink-0">07.30 - 08.00</div>
                  <div className="flex-1 font-semibold text-slate-700">Register (ลงทะเบียน)</div>
                  <div className="w-full sm:w-48 text-center text-slate-400 text-xs mt-1 sm:mt-0">-</div>
                </div>

                {/* 08.00 - 08.05 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-[#0026b3] shrink-0">08.00 - 08.05</div>
                  <div className="flex-1">
                    <span className="font-bold text-slate-900">Welcome Speech</span>
                    <span className="text-slate-600 block text-xs">Past president of TSRM : <strong className="text-slate-900">ศ.นพ.แสงชัย พฤทธิพันธุ์</strong></span>
                  </div>
                  <div className="w-full sm:w-48 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 08.05 - 08.20 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">08.05 - 08.20</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Overview hysteroscopy</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">นพ.วิบูลย์ กมลพรวจิตร</span></div>
                  </div>
                  <div className="w-full sm:w-48 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 08.20 - 08.45 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">08.20 - 08.45</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Enhancing ivf outcome with hysteroscopy</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">รศ.นพ.สมสิญจน์ เพ็ชรยิ้ม</span></div>
                  </div>
                  <div className="w-full sm:w-48 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 08.45 - 09.10 */}
                <div className="flex flex-col sm:flex-row bg-white p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-slate-900 shrink-0">08.45 - 09.10</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Enhancing technique of hysteroscopy</div>
                    <div className="text-slate-600 text-xs">Speaker : <span className="font-semibold text-slate-800">ผศ. นพ.ศรีเธียร เลิศวิกูล</span></div>
                  </div>
                  <div className="w-full sm:w-48 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 09.10 - 09.40 */}
                <div className="flex flex-col sm:flex-row bg-sky-50/70 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-sky-900 shrink-0">09.10 - 09.40</div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">Innovative in equipment and instrument for hysteroscopy</div>
                    <div className="text-slate-600 text-xs">Speakers : ทีมผู้เชี่ยวชาญเครื่องมือผ่าตัด</div>
                  </div>
                  <div className="w-full sm:w-48 text-center mt-1 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-sky-100 text-sky-900 font-bold text-[10px] leading-tight">
                      Medtronic • Storz • Olympus • Tawan • BJC
                    </span>
                  </div>
                </div>

                {/* 09.40 - 10.00 */}
                <div className="flex flex-col sm:flex-row bg-amber-50/70 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-amber-900 shrink-0">09.40 - 10.00</div>
                  <div className="flex-1 font-bold text-amber-900">☕ Coffee break (พักรับประทานของว่าง)</div>
                  <div className="w-full sm:w-48 text-center text-slate-400 text-xs mt-1 sm:mt-0">-</div>
                </div>

                {/* 10.00 - 12.00 : Hands on Workshop */}
                <div className="flex flex-col sm:flex-row bg-blue-50/50 p-4 items-start">
                  <div className="w-full sm:w-44 font-mono font-bold text-[#0026b3] shrink-0 pt-0.5">10.00 - 12.00</div>
                  <div className="flex-1 space-y-2">
                    <div className="font-black text-slate-900 text-sm">
                      Hands on Hysteroscopic Workshop
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-700">
                      <div>• ศ.นพ.แสงชัย พฤทธิพันธุ์</div>
                      <div>• นพ.วิบูลย์ กมลพรวจิตร</div>
                      <div>• รศ.นพ.สมสิญจน์ เพ็ชรยิ้ม</div>
                      <div>• ผศ. นพ.ศรีเธียร เลิศวิกูล</div>
                      <div>• นพ.พัฒน์ศมา วิจินศาสตร์วิจัย</div>
                      <div>• พญ.พิมพกา ชวนะเวสน์</div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      พร้อมการสาธิตจากผู้แทน: Medtronic Storz Olympus Tawanmcweis BJC Healthcare
                    </div>
                  </div>
                  <div className="w-full sm:w-48 text-center mt-2 sm:mt-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-[#0026b3] font-bold text-[11px]">TSRM</span>
                  </div>
                </div>

                {/* 12.00 - 13.00 */}
                <div className="flex flex-col sm:flex-row bg-emerald-50/70 p-3.5 items-center">
                  <div className="w-full sm:w-44 font-mono font-bold text-emerald-900 shrink-0">12.00 - 13.00</div>
                  <div className="flex-1 font-bold text-emerald-900">🍽️ Lunch (พักรับประทานอาหารกลางวัน)</div>
                  <div className="w-full sm:w-48 text-center text-slate-400 text-xs mt-1 sm:mt-0">-</div>
                </div>

                {/* Closing */}
                <div className="flex flex-col sm:flex-row bg-slate-100 p-3.5 items-center justify-between font-bold text-slate-800">
                  <div className="w-full sm:w-44 font-mono text-slate-600">13.00 น.</div>
                  <div className="flex-1 text-red-600 font-extrabold">Conference closed (ปิดการประชุมเชิงปฏิบัติการ)</div>
                  <div className="w-full sm:w-48 text-center text-slate-400 text-xs">-</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: WORKSHOPS & REGISTRATION OVERVIEW ─── */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              Precongress Workshop (20 Oct 2026) Overview & Registration Fee
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              34th TSRM 2026 ณ โรงแรม Grande Centre Point LUMPHINI Bangkok
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* WS 1 Card */}
            <div className="p-5 rounded-2xl border-2 border-blue-200 bg-blue-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-[#0026b3] text-white font-black text-xs">
                  PC WS 1
                </span>
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
                  จำกัด 100 ท่าน
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900">ART Nurse</h3>
              <p className="text-xs text-slate-600">
                📍 ห้องวนาลัย 1-2 (ชั้น 12) • ⏰ 07.30 - 15.45 น. (9.00 - 16.00 น.)
              </p>
              <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">สมาชิก: <strong className="text-[#0026b3]">฿ 2,500</strong></span>
                <span className="text-slate-700">บุคคลทั่วไป: <strong className="text-slate-900">฿ 3,500</strong></span>
              </div>
            </div>

            {/* WS 2 Card */}
            <div className="p-5 rounded-2xl border-2 border-indigo-200 bg-indigo-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-700 text-white font-black text-xs">
                  PC WS 2
                </span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  จำกัด 60 ท่าน
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Reproductive Genetics</h3>
              <p className="text-xs text-slate-600">
                📍 ห้องพิมาน 1 (ชั้น 12) • ⏰ 09.00 - 15.30 น.
              </p>
              <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">สมาชิก: <strong className="text-indigo-700">฿ 3,000</strong></span>
                <span className="text-slate-700">บุคคลทั่วไป: <strong className="text-slate-900">฿ 4,000</strong></span>
              </div>
            </div>

            {/* WS 3 Card */}
            <div className="p-5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white font-black text-xs">
                  PC WS 3
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  จำกัด 25 ท่าน
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900">Fertility-enhancing hysteroscopic surgery</h3>
              <p className="text-xs text-slate-600">
                📍 ห้องพิมาน 2 (ชั้น 12) • ⏰ 07.30 - 13.00 น. (8.00 - 12.00 น.)
              </p>
              <div className="pt-2 border-t border-emerald-200/60 text-xs font-bold text-emerald-800">
                Sponsored by Olympus, Tawan, Medtronic, Storz, BJC
              </div>
            </div>

            {/* WS 4 Card */}
            <div className="p-5 rounded-2xl border-2 border-purple-200 bg-purple-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-purple-700 text-white font-black text-xs">
                  PC WS 4
                </span>
                <span className="text-xs font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  จำกัด 25 ท่าน
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900">3D Ultrasound in Reproductive medicine</h3>
              <p className="text-xs text-slate-600">
                📍 ห้องพิมาน 2 (ชั้น 12) • ⏰ 13.00 - 17.00 น.
              </p>
              <div className="pt-2 border-t border-purple-200/60 text-xs font-bold text-purple-800">
                Sponsored by idsMED
              </div>
            </div>
          </div>

          {/* Payment Account Details Box */}
          <div className="bg-slate-900 text-white p-5 sm:p-6 rounded-2xl space-y-3">
            <h4 className="font-black text-sm text-[#4ade80]">
              ข้อมูลการชำระเงินและการลงทะเบียน (Payment Information)
            </h4>
            <div className="text-xs space-y-1.5 text-slate-300">
              <p>• ธนาคาร: <strong className="text-white">กสิกรไทย สาขาประชานิเวศน์ 1</strong></p>
              <p>• บัญชีออมทรัพย์เลขที่: <strong className="text-[#4ade80] text-sm">020-8-16398-1</strong></p>
              <p>• ชื่อบัญชี: <strong className="text-white">สมาคมเวชศาสตร์การเจริญพันธุ์ไทย</strong></p>
              <p>• ติดต่อกองเลขาธิการ: <strong className="text-cyan-300">tsrmcongress@gmail.com</strong></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
