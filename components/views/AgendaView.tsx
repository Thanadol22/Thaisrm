'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Calendar,
  Clock,
  MapPin,
  Award,
  Download,
  QrCode,
  CheckCircle2,
  Users,
  Search,
  Filter,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  ExternalLink,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Building,
  GraduationCap,
  LogOut,
  X,
  UserCheck,
  ChevronUp,
  Copy,
  Check,
  ShieldCheck,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import QRCode from 'qrcode';
import Velaris from '@/components/ui/velaris';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { useLanguage } from '@/context/LanguageContext';
import { OfficialWorkshopAgenda } from '@/components/OfficialWorkshopAgenda';

// Zero-overhead Scroll Progress Bar using RAF & direct DOM updates (0 React re-renders)
function ScrollProgressBar() {
  const barRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (barRef.current) {
            const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = totalScrollHeight > 0 ? (window.scrollY / totalScrollHeight) * 100 : 0;
            barRef.current.style.width = `${progress}%`;
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-900/10 pointer-events-none">
      <div
        ref={barRef}
        className="h-full bg-gradient-to-r from-[#0026b3] via-[#0055ff] to-[#4ade80] shadow-[0_0_10px_rgba(74,222,128,0.8)]"
        style={{ width: '0%', transition: 'width 75ms ease-out' }}
      />
    </div>
  );
}

// Scroll-driven Reveal Component using IntersectionObserver
function RevealOnScroll({
  children,
  className = '',
  delay = 0,
  direction = 'up'
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'fade';
}) {
  const [isVisible, setIsVisible] = React.useState(false);
  const domRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
    );

    const currentTarget = domRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, []);

  const getTransformStyle = () => {
    if (isVisible) return 'opacity-100 translate-x-0 translate-y-0 scale-100';
    switch (direction) {
      case 'up':
        return 'opacity-0 translate-y-8';
      case 'down':
        return 'opacity-0 -translate-y-8';
      case 'left':
        return 'opacity-0 translate-x-8';
      case 'right':
        return 'opacity-0 -translate-x-8';
      case 'fade':
        return 'opacity-0 scale-95';
      default:
        return 'opacity-0 translate-y-8';
    }
  };

  return (
    <div
      ref={domRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${getTransformStyle()} ${className}`}
    >
      {children}
    </div>
  );
}

interface Speaker {
  nameTh: string;
  nameEn: string;
  titleTh: string;
  titleEn: string;
  institutionTh: string;
  institutionEn: string;
  avatarBg: string;
  avatarInitials: string;
}

interface AgendaSession {
  id: string;
  day: number;
  time: string;
  roomTh: string;
  roomEn: string;
  category: 'keynote' | 'embryology' | 'surgery' | 'symposium' | 'general';
  sponsor?: string;
  workshopTrack?: 'ws1' | 'ws3';
  titleTh: string;
  titleEn: string;
  descriptionTh: string;
  descriptionEn: string;
  speakers: Speaker[];
  moderators?: Speaker[];
  isHighlight?: boolean;
  hasCme?: boolean;
  hasLiveStream?: boolean;
  slideUrl?: string;
}

const AGENDA_DATA: AgendaSession[] = [
  // ==========================================
  // DAY 1 (Oct 20, 2026: Precongress Workshops)
  // ==========================================
  // --- Workshop 1: ART Nurse (12th Floor Wanalai 1,2) ---
  {
    id: 'd1-ws1-reg',
    day: 1,
    time: '07:30 - 08:15',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'general',
    workshopTrack: 'ws1',
    titleTh: '[WS 1: ART Nurse] ลงทะเบียนเข้าร่วมการประชุมเชิงปฏิบัติการ',
    titleEn: '[WS 1: ART Nurse] Workshop Registration',
    descriptionTh: 'ลงทะเบียนรับเอกสารวิชาการ สูจิบัตร และอุปกรณ์สำหรับผู้เข้าร่วม Program WS 1 ART Nurse',
    descriptionEn: 'Attendee registration and symposium kit collection for ART Nurse Program.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd1-ws1-welcome',
    day: 1,
    time: '08:15 - 08:30',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'keynote',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Welcome Speech & พิธีเปิดเวิร์กช็อป',
    titleEn: '[WS 1: ART Nurse] Welcome Speech by TSRM President',
    descriptionTh: 'กล่าวเปิดการประชุมเชิงปฏิบัติการ Program WS 1 ART Nurse โดย นพ.สวัสดิ์ ไตรตรงึษ์ทัศนา นายกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
    descriptionEn: 'Opening address by Dr. Sawat Traitrongtassana, President of Thai Society for Reproductive Medicine (TSRM).',
    speakers: [
      {
        nameTh: 'นพ.สวัสดิ์ ไตรตรงึษ์ทัศนา',
        nameEn: 'Dr. Sawat Traitrongtassana, MD',
        titleTh: 'นายกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย (President of TSRM)',
        titleEn: 'President, Thai Society for Reproductive Medicine',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-700 to-indigo-900',
        avatarInitials: 'สต'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd1-ws1-s1',
    day: 1,
    time: '08:30 - 09:00',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'embryology',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Semen analysis and sperm preparation',
    titleEn: '[WS 1: ART Nurse] Semen analysis and sperm preparation',
    descriptionTh: 'หลักการและเทคนิคการตรวจวิเคราะห์น้ำอสุจิและการเตรียมสเปิร์มสำหรับการปฏิสนธิทางการแพทย์',
    descriptionEn: 'Essential principles of semen evaluation, parameters, and preparation methods in reproductive technology.',
    speakers: [
      {
        nameTh: 'ผศ.พญ. อุษณีย์ แสนหมี่',
        nameEn: 'Asst. Prof. Ussanee Sanmee, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Endocrinologist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-pink-600 to-rose-700',
        avatarInitials: 'อส'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws1-s2',
    day: 1,
    time: '09:00 - 09:30',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'surgery',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Ovarian Stimulation protocol for IVF',
    titleEn: '[WS 1: ART Nurse] Ovarian Stimulation protocol for IVF',
    descriptionTh: 'โพรโทคอลการกระตุ้นรังไข่สำหรับการทำเด็กหลอดแก้ว บทบาทและการดูแลผู้ป่วยของพยาบาลผู้มีบุตรยาก',
    descriptionEn: 'Protocols for controlled ovarian stimulation in IVF cycles and patient monitoring essentials.',
    speakers: [
      {
        nameTh: 'รศ.พญ. ชนกานต์ สืบถวิลกุล',
        nameEn: 'Assoc. Prof. Chonnakarn Suebthawinkul, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Specialist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-purple-600 to-indigo-700',
        avatarInitials: 'ชส'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws1-s3',
    day: 1,
    time: '09:30 - 10:00',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'surgery',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Ovarian Stimulation protocol for fertility preservation in cancer patients',
    titleEn: '[WS 1: ART Nurse] Ovarian Stimulation protocol for fertility preservation in cancer patients',
    descriptionTh: 'แนวทางการกระตุ้นไข่เพื่อการอนุรักษ์ภาวะเจริญพันธุ์ในผู้ป่วยโรคมะเร็งอย่างปลอดภัยและมีประสิทธิภาพ',
    descriptionEn: 'Oncofertility strategies and tailored ovarian stimulation protocols for cancer patients prior to gonadotoxic therapy.',
    speakers: [
      {
        nameTh: 'ผศ.พญ. พรทิพย์ สิริยาภิวัฒน์',
        nameEn: 'Asst. Prof. Pornthip Sirayapiwat, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Endocrinologist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-teal-600 to-emerald-700',
        avatarInitials: 'พส'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws1-break1',
    day: 1,
    time: '10:00 - 10:30',
    roomTh: 'Foyer ชั้น 12',
    roomEn: '12th Floor Foyer',
    category: 'general',
    workshopTrack: 'ws1',
    titleTh: '☕ พักรับประทานอาหารว่าง (Coffee Break)',
    titleEn: 'Coffee Break & Refreshments',
    descriptionTh: 'พักรับประทานของว่าง เครื่องดื่ม ชา และกาแฟ',
    descriptionEn: 'Morning coffee break and networking refreshments.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd1-ws1-s4',
    day: 1,
    time: '10:30 - 11:10',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'surgery',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Endometrial preparation for frozen-thawed embryo transfer',
    titleEn: '[WS 1: ART Nurse] Endometrial preparation for frozen-thawed embryo transfer',
    descriptionTh: 'การเตรียมเยื่อบุโพรงมดลูกสำหรับการย้ายตัวอ่อนแช่แข็งเพื่อเพิ่มอัตราการตั้งครรภ์',
    descriptionEn: 'Clinical strategies for endometrial priming in FET cycles: natural, stimulated, and programmed hormonal regimens.',
    speakers: [
      {
        nameTh: 'รศ.นพ. สมสิญจน์ เพ็ชรยิ้ม',
        nameEn: 'Assoc. Prof. Somsin Petyim, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Endocrinologist & Infertility Specialist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-600 to-sky-700',
        avatarInitials: 'สพ'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws1-s5',
    day: 1,
    time: '11:10 - 11:50',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'embryology',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Infection control and aseptic technique in ART lab',
    titleEn: '[WS 1: ART Nurse] Infection control and aseptic technique in ART lab',
    descriptionTh: 'การควบคุมการติดเชื้อและเทคนิคปลอดเชื้อมาตรฐานสากลในห้องปฏิบัติการเทคโนโลยีช่วยการเจริญพันธุ์',
    descriptionEn: 'Rigorous aseptic techniques, pathogen containment, and infection control standards in the ART laboratory.',
    speakers: [
      {
        nameTh: 'อ.นพ. ดิษรุจ โตวิกกัย',
        nameEn: 'Dr. Ditsapoj Towikkai, MD',
        titleTh: 'ภาควิชาอายุรศาสตร์ คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
        titleEn: 'Department of Medicine, Chulalongkorn University',
        institutionTh: 'รพ.จุฬาลงกรณ์',
        institutionEn: 'Chulalongkorn Memorial Hospital',
        avatarBg: 'from-amber-600 to-orange-700',
        avatarInitials: 'ดต'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws1-lunch',
    day: 1,
    time: '12:00 - 13:00',
    roomTh: 'Dining Room ชั้น 12',
    roomEn: '12th Floor Dining Room',
    category: 'general',
    workshopTrack: 'ws1',
    titleTh: '🍽️ พักรับประทานอาหารกลางวัน (Lunch)',
    titleEn: 'Luncheon Break',
    descriptionTh: 'พักรับประทานอาหารกลางวัน',
    descriptionEn: 'Buffet lunch for workshop participants.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd1-ws1-s6',
    day: 1,
    time: '13:00 - 13:30',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'surgery',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Pre-treatment investigations and treatment in ART',
    titleEn: '[WS 1: ART Nurse] Pre-treatment investigations and treatment in ART',
    descriptionTh: 'การตรวจวินิจฉัยก่อนเริ่มการรักษาและการวางแผนให้การรักษาในเทคโนโลยีช่วยการเจริญพันธุ์',
    descriptionEn: 'Diagnostic workups, baseline evaluations, and clinical pathways for infertile couples embarking on ART.',
    speakers: [
      {
        nameTh: 'พญ. พิมพกา ชวนะเวสน์',
        nameEn: 'Dr. Pimpaka Chawanaves, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Endocrinologist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-rose-600 to-pink-700',
        avatarInitials: 'พช'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws1-s7',
    day: 1,
    time: '13:30 - 14:00',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'embryology',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Laboratory testing in ART: what fertility nurse should know.',
    titleEn: '[WS 1: ART Nurse] Laboratory testing in ART: what fertility nurse should know.',
    descriptionTh: 'การตรวจทางห้องปฏิบัติการใน ART ที่พยาบาลและบุคลากรทางการแพทย์ผู้ดูแลผู้มีบุตรยากต้องทราบ',
    descriptionEn: 'Key lab diagnostics, hormone profiling, quality control, and clinical interpretation essentials for fertility nurses.',
    speakers: [
      {
        nameTh: 'ผศ.พญ. ณิชมน ภาคภิญโญ',
        nameEn: 'Asst. Prof. Nichamon Pakpinyo, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Specialist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-indigo-600 to-purple-700',
        avatarInitials: 'ณภ'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws1-s8',
    day: 1,
    time: '14:00 - 14:30',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'keynote',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] การขออนุญาตตั้งครรภ์แทน (อุ้มบุญ)',
    titleEn: '[WS 1: ART Nurse] Legal & Regulatory Process of Gestational Surrogacy in Thailand',
    descriptionTh: 'กระบวนการและข้อกำหนดทางกฎหมายในการขออนุญาตตั้งครรภ์แทน (อุ้มบุญ) ภายใต้การกำกับดูแลของ สบส.',
    descriptionEn: 'Regulatory guidelines, legal compliance, and permission application processes for surrogacy in Thailand.',
    speakers: [
      {
        nameTh: 'เภสัชกรหญิง ชยาวี กาญวัฒะกิจ',
        nameEn: 'Chayawee Kanwattanakit, RPh',
        titleTh: 'กรมสนับสนุนบริการสุขภาพ (สบส.) กระทรวงสาธารณสุข',
        titleEn: 'Department of Health Service Support (HSS)',
        institutionTh: 'กรมสนับสนุนบริการสุขภาพ (สบส.)',
        institutionEn: 'Ministry of Public Health, Thailand',
        avatarBg: 'from-cyan-600 to-blue-800',
        avatarInitials: 'ชก'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd1-ws1-break2',
    day: 1,
    time: '14:30 - 15:00',
    roomTh: 'Foyer ชั้น 12',
    roomEn: '12th Floor Foyer',
    category: 'general',
    workshopTrack: 'ws1',
    titleTh: '☕ พักรับประทานอาหารว่าง (Coffee Break)',
    titleEn: 'Afternoon Refreshments & Coffee Break',
    descriptionTh: 'พักรับประทานของว่าง เครื่องดื่ม ชา และกาแฟ',
    descriptionEn: 'Afternoon coffee and tea break.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd1-ws1-s9',
    day: 1,
    time: '15:00 - 15:45',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'keynote',
    workshopTrack: 'ws1',
    sponsor: 'TSRM',
    titleTh: '[WS 1: ART Nurse] Counselling patients through IVF/ICSI and embryo transfer: the essential role of fertility nurses',
    titleEn: '[WS 1: ART Nurse] Counselling patients through IVF/ICSI and embryo transfer: the essential role of fertility nurses',
    descriptionTh: 'การให้คำปรึกษาและดูแลจิตใจผู้ป่วยตลอดเส้นทางการรักษา IVF/ICSI และการย้ายตัวอ่อน: บทบาทสำคัญของพยาบาลเวชศาสตร์การเจริญพันธุ์',
    descriptionEn: 'Psychological support, patient communication, and comprehensive counseling through stimulation, retrieval, and embryo transfer.',
    speakers: [
      {
        nameTh: 'คุณเหมือนฝัน สระทองคุ้ม',
        nameEn: 'Muenfan Sratongkhum, RN',
        titleTh: 'พยาบาลวิชาชีพผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์ คณะแพทยศาสตร์ศิริราชพยาบาล',
        titleEn: 'Clinical Fertility Nurse Specialist, Siriraj Hospital',
        institutionTh: 'คณะแพทยศาสตร์ศิริราชพยาบาล',
        institutionEn: 'Faculty of Medicine Siriraj Hospital, Mahidol University',
        avatarBg: 'from-emerald-600 to-teal-800',
        avatarInitials: 'มห'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd1-ws1-close',
    day: 1,
    time: '15:45',
    roomTh: 'ห้องวนาลัย 1, 2 ชั้น 12',
    roomEn: '12th Floor Wanalai 1, 2',
    category: 'general',
    workshopTrack: 'ws1',
    titleTh: '[WS 1: ART Nurse] ถาม-ตอบ (QA) และปิดการประชุมเชิงปฏิบัติการ',
    titleEn: '[WS 1: ART Nurse] Q&A and Workshop Concluded',
    descriptionTh: 'ช่วงถาม-ตอบข้อซักถาม สรุปประเด็นสำคัญ และปิดการประชุม Program WS 1 ART Nurse',
    descriptionEn: 'Open Q&A session, closing remarks, and CME check-out for ART Nurse Program.',
    speakers: [],
    hasCme: true
  },

  // --- Workshop 3: Fertility-enhancing hysteroscopic surgery (THAI session) (12th Floor ห้องพิมาน 2) ---
  {
    id: 'd1-ws3-reg',
    day: 1,
    time: '07:30 - 08:00',
    roomTh: 'ห้องพิมาน 2 ชั้น 12',
    roomEn: '12th Floor Phiman 2 Room',
    category: 'general',
    workshopTrack: 'ws3',
    titleTh: '[WS 3: Hysteroscopy] ลงทะเบียนเข้าร่วมเวิร์กช็อปผ่าตัดส่องกล้อง',
    titleEn: '[WS 3: Hysteroscopy] Workshop Registration',
    descriptionTh: 'ลงทะเบียนรับอุปกรณ์และเอกสารการอบรมเชิงปฏิบัติการ Hands-on Hysteroscopy',
    descriptionEn: 'Registration and workshop syllabus collection for hysteroscopic surgery attendees.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd1-ws3-welcome',
    day: 1,
    time: '08:00 - 08:05',
    roomTh: 'ห้องพิมาน 2 ชั้น 12',
    roomEn: '12th Floor Phiman 2 Room',
    category: 'keynote',
    workshopTrack: 'ws3',
    sponsor: 'TSRM',
    titleTh: '[WS 3: Hysteroscopy] Welcome Speech โดยอดีตนายกสมาคมฯ',
    titleEn: '[WS 3: Hysteroscopy] Welcome Speech by Past President of TSRM',
    descriptionTh: 'กล่าวต้อนรับและเปิดการอบรมเชิงปฏิบัติการ Fertility-enhancing hysteroscopic surgery โดย ศ.นพ.แสงชัย พฤทธิพันธุ์',
    descriptionEn: 'Welcome address by Prof. Saengchai Pruksapanyarat, MD, Past President of TSRM.',
    speakers: [
      {
        nameTh: 'ศ.นพ.แสงชัย พฤทธิพันธุ์',
        nameEn: 'Prof. Saengchai Pruksapanyarat, MD',
        titleTh: 'Past President of TSRM / ผู้เชี่ยวชาญด้านผ่าตัดผ่านกล้องทางนรีเวช',
        titleEn: 'Past President of TSRM / Gynecologic Endoscopic Surgeon',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-700 to-slate-900',
        avatarInitials: 'สพ'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd1-ws3-s1',
    day: 1,
    time: '08:05 - 08:20',
    roomTh: 'ห้องพิมาน 2 ชั้น 12',
    roomEn: '12th Floor Phiman 2 Room',
    category: 'surgery',
    workshopTrack: 'ws3',
    sponsor: 'TSRM',
    titleTh: '[WS 3: Hysteroscopy] Overview hysteroscopy',
    titleEn: '[WS 3: Hysteroscopy] Overview hysteroscopy',
    descriptionTh: 'ภาพรวมการตรวจวินิจฉัยและรักษาด้วยการส่องกล้องตรวจโพรงมดลูกในเวชศาสตร์การเจริญพันธุ์',
    descriptionEn: 'Comprehensive overview of diagnostic and operative hysteroscopy in reproductive medicine.',
    speakers: [
      {
        nameTh: 'นพ.วิบูลย์ กมลพรวจิตร',
        nameEn: 'Dr. Wibool Kamolpornwichit, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์และผ่าตัดผ่านกล้อง',
        titleEn: 'Reproductive Surgeon & Endoscopist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-teal-600 to-cyan-700',
        avatarInitials: 'วก'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws3-s2',
    day: 1,
    time: '08:20 - 08:45',
    roomTh: 'ห้องพิมาน 2 ชั้น 12',
    roomEn: '12th Floor Phiman 2 Room',
    category: 'surgery',
    workshopTrack: 'ws3',
    sponsor: 'TSRM',
    titleTh: '[WS 3: Hysteroscopy] Enhancing IVF outcome with hysteroscopy',
    titleEn: '[WS 3: Hysteroscopy] Enhancing IVF outcome with hysteroscopy',
    descriptionTh: 'การเพิ่มอัตราความสำเร็จของการทำเด็กหลอดแก้วด้วยการผ่าตัดส่องกล้องโพรงมดลูกแก้ไขความผิดปกติ',
    descriptionEn: 'Evidence-based improvements in implantation and live birth rates through corrective hysteroscopic intervention.',
    speakers: [
      {
        nameTh: 'รศ.นพ.สมสิญจน์ เพ็ชรยิ้ม',
        nameEn: 'Assoc. Prof. Somsin Petyim, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Endocrinologist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-600 to-indigo-700',
        avatarInitials: 'สพ'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws3-s3',
    day: 1,
    time: '08:45 - 09:10',
    roomTh: 'ห้องพิมาน 2 ชั้น 12',
    roomEn: '12th Floor Phiman 2 Room',
    category: 'surgery',
    workshopTrack: 'ws3',
    sponsor: 'TSRM',
    titleTh: '[WS 3: Hysteroscopy] Enhancing technique of hysteroscopy',
    titleEn: '[WS 3: Hysteroscopy] Enhancing technique of hysteroscopy',
    descriptionTh: 'เทคนิคขั้นสูงและเคล็ดลับทางศัลยกรรมในการผ่าตัดส่องกล้องโพรงมดลูกอย่างปลอดภัยและได้ผลสูงสุด',
    descriptionEn: 'Advanced surgical tips, fluid management, energy systems, and complication prevention in hysteroscopic procedures.',
    speakers: [
      {
        nameTh: 'ผศ. นพ.ศรีเธียร เลิศวิกูล',
        nameEn: 'Asst. Prof. Sritheirn Lertvikool, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านการผ่าตัดผ่านกล้องทางนรีเวช',
        titleEn: 'Minimally Invasive Gynecologic Surgeon',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-purple-600 to-pink-700',
        avatarInitials: 'ศล'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws3-s4',
    day: 1,
    time: '09:10 - 09:40',
    roomTh: 'ห้องพิมาน 2 ชั้น 12',
    roomEn: '12th Floor Phiman 2 Room',
    category: 'symposium',
    workshopTrack: 'ws3',
    sponsor: 'Medtronic • Storz • Olympus • Tawan • BJC',
    titleTh: '[WS 3: Hysteroscopy] Innovative in equipment and instrument for hysteroscopy',
    titleEn: '[WS 3: Hysteroscopy] Innovative in equipment and instrument for hysteroscopy',
    descriptionTh: 'นวัตกรรมและเทคโนโลยีเครื่องมือผ่าตัดส่องกล้องโพรงมดลูกรุ่นใหม่ล่าสุด',
    descriptionEn: 'Next-generation optical systems, miniature resectoscopes, and morcellation instrumentation.',
    speakers: [
      {
        nameTh: 'ทีมผู้เชี่ยวชาญด้านเครื่องมือแพทย์',
        nameEn: 'Surgical Technology Specialists Panel',
        titleTh: 'Medtronic Storz Olympus Tawanmcweis BJC Healthcare',
        titleEn: 'Medtronic Storz Olympus Tawanmcweis BJC Healthcare',
        institutionTh: 'Medtronic / Olympus / Storz / Tawan / BJC',
        institutionEn: 'Industry Consortium',
        avatarBg: 'from-sky-600 to-blue-800',
        avatarInitials: 'IN'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-ws3-break',
    day: 1,
    time: '09:40 - 10:00',
    roomTh: 'Foyer ชั้น 12',
    roomEn: '12th Floor Foyer',
    category: 'general',
    workshopTrack: 'ws3',
    titleTh: '☕ พักรับประทานอาหารว่าง (Coffee Break)',
    titleEn: 'Morning Coffee Break',
    descriptionTh: 'พักรับประทานของว่าง เครื่องดื่ม ชา และกาแฟ',
    descriptionEn: 'Coffee and light morning refreshments.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd1-ws3-s5',
    day: 1,
    time: '10:00 - 12:00',
    roomTh: 'ห้องพิมาน 2 ชั้น 12',
    roomEn: '12th Floor Phiman 2 Room',
    category: 'surgery',
    workshopTrack: 'ws3',
    sponsor: 'TSRM',
    titleTh: '[WS 3: Hysteroscopy] Hands on Hysteroscopic Workshop',
    titleEn: '[WS 3: Hysteroscopy] Hands on Hysteroscopic Surgical Workshop',
    descriptionTh: 'ฝึกปฏิบัติจริง Hands-on ร่วมกับคณาจารย์ผู้ทรงคุณวุฒิ และสาธิตการใช้อุปกรณ์ผ่าตัดมาตรฐานสูง (จำกัดเพียง 25 ท่าน)',
    descriptionEn: 'Intensive hands-on dry and wet lab hysteroscopic training stations mentored by expert faculty panel.',
    speakers: [
      {
        nameTh: 'ศ.นพ.แสงชัย พฤทธิพันธุ์',
        nameEn: 'Prof. Saengchai Pruksapanyarat, MD',
        titleTh: 'อาจารย์ผู้ฝึกสอน / Past President of TSRM',
        titleEn: 'Faculty Mentor / Past President TSRM',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-700 to-indigo-800',
        avatarInitials: 'สพ'
      },
      {
        nameTh: 'นพ.วิบูลย์ กมลพรวจิตร',
        nameEn: 'Dr. Wibool Kamolpornwichit, MD',
        titleTh: 'อาจารย์ผู้ฝึกสอน',
        titleEn: 'Faculty Mentor',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-teal-600 to-emerald-700',
        avatarInitials: 'วก'
      },
      {
        nameTh: 'รศ.นพ.สมสิญจน์ เพ็ชรยิ้ม',
        nameEn: 'Assoc. Prof. Somsin Petyim, MD',
        titleTh: 'อาจารย์ผู้ฝึกสอน',
        titleEn: 'Faculty Mentor',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-purple-600 to-indigo-700',
        avatarInitials: 'สพ'
      },
      {
        nameTh: 'ผศ. นพ.ศรีเธียร เลิศวิกูล',
        nameEn: 'Asst. Prof. Sritheirn Lertvikool, MD',
        titleTh: 'อาจารย์ผู้ฝึกสอน',
        titleEn: 'Faculty Mentor',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-rose-600 to-pink-700',
        avatarInitials: 'ศล'
      },
      {
        nameTh: 'นพ.พัฒน์ศมา วิจินศาสตร์วิจัย',
        nameEn: 'Dr. Phatsama Wijinsartwijai, MD',
        titleTh: 'อาจารย์ผู้ฝึกสอน',
        titleEn: 'Faculty Mentor',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-amber-600 to-orange-700',
        avatarInitials: 'พว'
      },
      {
        nameTh: 'พญ.พิมพกา ชวนะเวสน์',
        nameEn: 'Dr. Pimpaka Chawanaves, MD',
        titleTh: 'อาจารย์ผู้ฝึกสอน',
        titleEn: 'Faculty Mentor',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-emerald-600 to-teal-700',
        avatarInitials: 'พช'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd1-ws3-lunch',
    day: 1,
    time: '12:00 - 13:00',
    roomTh: 'Dining Room ชั้น 12',
    roomEn: '12th Floor Dining Room',
    category: 'general',
    workshopTrack: 'ws3',
    titleTh: '🍽️ พักรับประทานอาหารกลางวัน & ปิดการประชุมเชิงปฏิบัติการ',
    titleEn: 'Luncheon & Workshop Concluded',
    descriptionTh: 'รับประทานอาหารกลางวัน และปิดการประชุม Program WS 3 Fertility-enhancing hysteroscopic surgery อย่างเป็นทางการ',
    descriptionEn: 'Lunch buffet and official conclusion of WS 3 Hysteroscopy.',
    speakers: [],
    hasCme: false
  },

  // ==========================================
  // DAY 2 (Oct 21, 2026: Main Program Day 1)
  // Room: 10th Floor Grand Hall Lumphini 2,3
  // ==========================================
  {
    id: 'd2-reg',
    day: 2,
    time: '07:30 - 08:20',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'general',
    titleTh: 'ลงทะเบียนผู้เข้าร่วมประชุม (Registration)',
    titleEn: 'Main Congress Registration',
    descriptionTh: 'ลงทะเบียนรับป้ายชื่อ เอกสารการประชุมวิชาการประจำปี และของที่ระลึก',
    descriptionEn: 'Attendee badge check-in, registration kit pickup, and morning reception.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd2-welcome',
    day: 2,
    time: '08:20 - 08:30',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'keynote',
    sponsor: 'TSRM',
    titleTh: 'Welcome Speech & พิธีเปิดการประชุมวิชาการประจำปี 2569',
    titleEn: 'Official Opening Ceremony & Presidential Welcome Speech',
    descriptionTh: 'กล่าวเปิดการประชุมวิชาการประจำปี ครั้งที่ 34 (34th TSRM 2026) โดย นพ.สวัสดิ์ ไตรตรงึษ์ทัศนา นายกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
    descriptionEn: 'Welcome address and official opening remarks by Dr. Sawat Traitrongtassana, President of TSRM.',
    speakers: [
      {
        nameTh: 'นพ.สวัสดิ์ ไตรตรงึษ์ทัศนา',
        nameEn: 'Dr. Sawat Traitrongtassana, MD',
        titleTh: 'President of TSRM',
        titleEn: 'President, Thai Society for Reproductive Medicine',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-700 to-indigo-900',
        avatarInitials: 'สต'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s1',
    day: 2,
    time: '08:30 - 09:10',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'keynote',
    sponsor: 'TSRM',
    titleTh: 'Safe Practice in ART: ข้อพึงระวังทางกฎหมายในการรักษาผู้มีบุตรยาก',
    titleEn: 'Safe Practice in ART: Legal Considerations and Cautions in Infertility Treatment',
    descriptionTh: 'บรรยายข้อพึงระวังทางกฎหมาย กฎระเบียบมาตรฐานการให้บริการด้านเทคโนโลยีช่วยการเจริญพันธุ์ และแนวทางปฏิบัติที่ปลอดภัย',
    descriptionEn: 'Legal frameworks, statutory regulations, and clinical risk mitigation under health service laws in Thailand.',
    speakers: [
      {
        nameTh: 'เภสัชกรหญิง ชยาวี กาญวัฒะกิจ',
        nameEn: 'Chayawee Kanwattanakit, RPh',
        titleTh: 'กรมสนับสนุนบริการสุขภาพ (สบส.) กระทรวงสาธารณสุข',
        titleEn: 'Department of Health Service Support (HSS)',
        institutionTh: 'กรมสนับสนุนบริการสุขภาพ (สบส.)',
        institutionEn: 'Ministry of Public Health, Thailand',
        avatarBg: 'from-cyan-600 to-blue-800',
        avatarInitials: 'ชก'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s2',
    day: 2,
    time: '09:10 - 09:50',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'keynote',
    sponsor: 'TSRM',
    titleTh: 'ความรับผิดของแพทย์และนักวิทยาศาสตร์กรณีการอุ้มบุญโดยไม่ชอบด้วยกฎหมาย',
    titleEn: 'Legal Liabilities of Physicians and Embryologists in Unlawful Surrogacy Cases',
    descriptionTh: 'เจาะลึกมุมมองทางกฎหมาย คดีความ ข้อวินิจฉัย และความรับผิดทางแพ่งและอาญาของแพทย์และนักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อน',
    descriptionEn: 'Judicial precedents, penal sanctions, and civil liabilities regarding non-compliant surrogacy practices.',
    speakers: [
      {
        nameTh: 'ดร.รณชัย ชูสุวรรณประทีป',
        nameEn: 'Dr. Ronnachai Choosuwanpratheep',
        titleTh: 'ผู้พิพากษาและเลขาฯ อุทธรณ์คดีชำนัญพิเศษ',
        titleEn: 'Judge & Secretary of the Court of Appeal for Specialized Cases',
        institutionTh: 'ศาลอุทธรณ์คดีชำนัญพิเศษ',
        institutionEn: 'Court of Appeal for Specialized Cases',
        avatarBg: 'from-purple-700 to-indigo-900',
        avatarInitials: 'รช'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s3-qa',
    day: 2,
    time: '09:50 - 10:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'general',
    titleTh: 'ช่วงถาม-ตอบ (Q & A): กฎหมายและมาตรฐานการรักษา ART',
    titleEn: 'Q & A Session: Legal and Practice Standards in ART',
    descriptionTh: 'เปิดรับข้อซักถามจากแพทย์และผู้เข้าร่วมประชุมเกี่ยวกับประเด็นทางกฎหมายในการรักษาผู้มีบุตรยาก',
    descriptionEn: 'Interactive audience Q&A with panel experts on legal liabilities and ethical clinical ART practice.',
    speakers: [],
    hasCme: true
  },
  {
    id: 'd2-s4',
    day: 2,
    time: '10:00 - 10:30',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'embryology',
    sponsor: 'TSRM',
    titleTh: 'Expanded carrier screening for ART',
    titleEn: 'Expanded carrier screening for ART',
    descriptionTh: 'การตรวจคัดกรองพาหะโรคทางพันธุกรรมแบบครอบคลุม (Expanded Carrier Screening) เพื่อความปลอดภัยของทารกในกระบวนการ ART',
    descriptionEn: 'Clinical utility, panel design, and reproductive counseling for pan-ethnic expanded genetic carrier screening.',
    speakers: [
      {
        nameTh: 'ศ. นพ. นเรศร สุขเจริญ',
        nameEn: 'Prof. Nares Sukcharoen, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์ คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
        titleEn: 'Professor of Reproductive Medicine, Chulalongkorn University',
        institutionTh: 'รพ.จุฬาลงกรณ์',
        institutionEn: 'Chulalongkorn Memorial Hospital',
        avatarBg: 'from-emerald-600 to-teal-800',
        avatarInitials: 'นส'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-break1',
    day: 2,
    time: '10:30 - 11:00',
    roomTh: 'Foyer ชั้น 10',
    roomEn: '10th Floor Foyer',
    category: 'general',
    titleTh: '☕ พักรับประทานอาหารว่าง (Coffee Break)',
    titleEn: 'Morning Coffee Break & Poster Viewing',
    descriptionTh: 'พักรับประทานของว่าง เครื่องดื่ม ชา และกาแฟ พร้อมชมนิทรรศการทางวิชาการ',
    descriptionEn: 'Coffee, tea, refreshments, and trade exhibition viewing.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd2-s5',
    day: 2,
    time: '11:00 - 11:30',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'surgery',
    sponsor: 'TSRM',
    titleTh: 'State-of-the-Art Management of Isthmocele in Women with Infertility',
    titleEn: 'State-of-the-Art Management of Isthmocele in Women with Infertility',
    descriptionTh: 'การจัดการและรักษาภาวะแผลผ่าคลอดที่มดลูก (Isthmocele/Cesarean Scar Defect) ในสตรีที่มีบุตรยากด้วยแนวทางทันสมัย',
    descriptionEn: 'Diagnostic modalities, surgical repair techniques, and fertility outcomes in symptomatic cesarean scar defects.',
    speakers: [
      {
        nameTh: 'รศ. นพ. ปวิตร สุจริตพงศ์',
        nameEn: 'Assoc. Prof. Pawit Suchartpong, MD',
        titleTh: 'ภาควิชาสูติศาสตร์-นรีเวชวิทยา คณะแพทยศาสตร์ศิริราชพยาบาล',
        titleEn: 'Department of OB-GYN, Siriraj Hospital',
        institutionTh: 'คณะแพทยศาสตร์ศิริราชพยาบาล',
        institutionEn: 'Siriraj Hospital, Mahidol University',
        avatarBg: 'from-blue-600 to-cyan-700',
        avatarInitials: 'ปส'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s6',
    day: 2,
    time: '11:30 - 12:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'symposium',
    sponsor: 'A.P.Tec',
    titleTh: 'Challenging the status quo : Redesigning IVF for the modern lab',
    titleEn: 'Challenging the status quo : Redesigning IVF for the modern lab',
    descriptionTh: 'การออกแบบกระบวนการทำงานและเทคโนโลยีห้องแล็บเพาะเลี้ยงตัวอ่อนยุคใหม่เพื่อเพิ่มประสิทธิภาพและลดความผันแปร',
    descriptionEn: 'Innovative methodologies in culture systems, lab automation, and ergonomic design in contemporary embryology.',
    speakers: [
      {
        nameTh: 'Kathryn Gebhardt',
        nameEn: 'Kathryn Gebhardt, PhD',
        titleTh: 'International Scientific Specialist, A.P.Tec',
        titleEn: 'International Scientific Specialist, A.P.Tec',
        institutionTh: 'A.P.Tec',
        institutionEn: 'A.P.Tec Biomedical Solutions',
        avatarBg: 'from-indigo-600 to-purple-800',
        avatarInitials: 'KG'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-lunch',
    day: 2,
    time: '12:00 - 13:00',
    roomTh: 'Grand Dining Hall ชั้น 10',
    roomEn: '10th Floor Dining Hall',
    category: 'general',
    titleTh: '🍽️ พักรับประทานอาหารกลางวัน (Lunch)',
    titleEn: 'Luncheon Break',
    descriptionTh: 'พักรับประทานอาหารกลางวัน',
    descriptionEn: 'Buffet luncheon at conference dining hall.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd2-s7',
    day: 2,
    time: '13:00 - 13:30',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'symposium',
    sponsor: 'Merck',
    titleTh: 'Mimicking Nature: Unlocking the Potential of LH for Personalized Reproductive Medicine',
    titleEn: 'Mimicking Nature: Unlocking the Potential of LH for Personalized Reproductive Medicine',
    descriptionTh: 'บทบาทของ Luteinizing Hormone (LH) ในการกระตุ้นไข่แบบเฉพาะบุคคลเพื่อเลียนแบบสรีรวิทยาตามธรรมชาติ',
    descriptionEn: 'Physiological roles of LH supplementation in follicular dynamics, oocyte competence, and individualized stimulation.',
    speakers: [
      {
        nameTh: 'นพ.พันธ์กวี ตันติวิริยพันธุ์',
        nameEn: 'Dr. Phankawi Tantiviriyaphan, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์ รพ.จุฬาลงกรณ์',
        titleEn: 'Reproductive Endocrinologist, Chulalongkorn Hospital',
        institutionTh: 'รพ.จุฬาลงกรณ์',
        institutionEn: 'Chulalongkorn Memorial Hospital',
        avatarBg: 'from-blue-600 to-teal-700',
        avatarInitials: 'พต'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s8-oral1',
    day: 2,
    time: '13:30 - 13:45',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'surgery',
    sponsor: 'TSRM',
    titleTh: 'Oral Presentation: The effect of pretreatment transdermal testosterone gel on IVF outcomes in patients with poor ovarian reserve: a randomized control trial (PRETTI-TRIAL)',
    titleEn: 'Oral Presentation: Pretreatment transdermal testosterone gel in poor ovarian reserve: randomized control trial (PRETTI-TRIAL)',
    descriptionTh: 'การศึกษาเปรียบเทียบแบบสุ่มและมีกลุ่มควบคุม ประสิทธิผลของการใช้ฮอร์โมนเทสโทสเตอโรนเจลทาก่อนกระตุ้นไข่ในผู้ป่วยตอบสนองต่อการกระตุ้นรังไข่ต่ำ',
    descriptionEn: 'Findings from the PRETTI-TRIAL on oocyte yield, embryo quality, and clinical pregnancy outcomes in POR patients.',
    speakers: [
      {
        nameTh: 'พญ.สิริกุล ฐานพงษ์',
        nameEn: 'Dr. Sirikun Thanaphong, MD',
        titleTh: 'คณะแพทยศาสตร์ศิริราชพยาบาล',
        titleEn: 'Faculty of Medicine Siriraj Hospital',
        institutionTh: 'คณะแพทยศาสตร์ศิริราชพยาบาล',
        institutionEn: 'Siriraj Hospital, Mahidol University',
        avatarBg: 'from-pink-600 to-rose-700',
        avatarInitials: 'สฐ'
      }
    ],
    hasCme: true
  },
  {
    id: 'd2-s9-oral2',
    day: 2,
    time: '13:45 - 14:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'embryology',
    sponsor: 'TSRM',
    titleTh: 'Oral Presentation: Differences in transcriptomic expression of apoptotic genes between euploid and aneuploid embryos using trophectoderm biopsy and spent culture media',
    titleEn: 'Oral Presentation: Differences in transcriptomic expression of apoptotic genes in euploid vs aneuploid embryos',
    descriptionTh: 'การวิเคราะห์ความแตกต่างของการแสดงออกทางทรานสคริปโตมิกส์ของยีนที่ควบคุมการตายของเซลล์ ระหว่างตัวอ่อนปกติและผิดปกติ โดยใช้เซลล์โทรโฟเอกโทเดิร์มและน้ำเลี้ยงตัวอ่อน',
    descriptionEn: 'Molecular apoptotic gene expression profiling in blastocyst biopsies and spent culture media DNA concordance.',
    speakers: [
      {
        nameTh: 'นพ. ภัทร แกน ลีละอมรวิเชษฐ์',
        nameEn: 'Dr. Pattara Gan Leela-amornvicheat, MD',
        titleTh: 'คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
        titleEn: 'Faculty of Medicine, Chulalongkorn University',
        institutionTh: 'จุฬาลงกรณ์มหาวิทยาลัย',
        institutionEn: 'Chulalongkorn University',
        avatarBg: 'from-teal-600 to-cyan-700',
        avatarInitials: 'ภล'
      }
    ],
    hasCme: true
  },
  {
    id: 'd2-break2',
    day: 2,
    time: '14:00 - 14:30',
    roomTh: 'Foyer ชั้น 10',
    roomEn: '10th Floor Foyer',
    category: 'general',
    titleTh: '☕ พักรับประทานอาหารว่าง (Coffee Break)',
    titleEn: 'Afternoon Refreshments & Coffee Break',
    descriptionTh: 'พักรับประทานของว่าง เครื่องดื่ม ชา และกาแฟ',
    descriptionEn: 'Coffee break and academic exchange.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd2-s10',
    day: 2,
    time: '14:30 - 15:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'surgery',
    sponsor: 'TSRM',
    titleTh: 'Endometrial Microbiome in IVF: current evidence and clinical perspectives',
    titleEn: 'Endometrial Microbiome in IVF: Current Evidence and Clinical Perspectives',
    descriptionTh: 'หลักฐานทางคลินิกล่าสุดและมุมมองการประยุกต์ใช้เรื่องจุลชีพในโพรงมดลูก (Microbiome) กับความสำเร็จในการรักษาเด็กหลอดแก้ว',
    descriptionEn: 'Microbiome composition, dysbiosis impact on endometrial receptivity, and clinical therapeutic interventions.',
    speakers: [
      {
        nameTh: 'รศ.พญ. ชลธิชา สถิระพจน์',
        nameEn: 'Assoc. Prof. Chonthicha Satirapod, MD',
        titleTh: 'คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี มหาวิทยาลัยมหิดล',
        titleEn: 'Faculty of Medicine Ramathibodi Hospital, Mahidol University',
        institutionTh: 'รพ.รามาธิบดี',
        institutionEn: 'Ramathibodi Hospital',
        avatarBg: 'from-indigo-600 to-purple-800',
        avatarInitials: 'ชส'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s11',
    day: 2,
    time: '15:00 - 15:30',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'surgery',
    sponsor: 'TSRM',
    titleTh: 'Endometrial Add-ons Before Embryo Transfer: Evidence for Intrauterine hCG and Other Interventions',
    titleEn: 'Endometrial Add-ons Before Embryo Transfer: Evidence for Intrauterine hCG and Other Interventions',
    descriptionTh: 'วิเคราะห์หลักฐานเชิงประจักษ์ของการใช้วิธีเสริม (Add-ons) เช่น การฉีด hCG เข้าโพรงมดลูก ก่อนการย้ายตัวอ่อน',
    descriptionEn: 'Critical evaluation of efficacy, safety, and Cochrane evidence for intrauterine hCG infusion, PRP, and endometrial scratch.',
    speakers: [
      {
        nameTh: 'รศ.พญ. อิสรินทร์ ธนบุณยวัฒน์',
        nameEn: 'Assoc. Prof. Issarin Thanaboonyawat, MD',
        titleTh: 'คณะแพทยศาสตร์ศิริราชพยาบาล มหาวิทยาลัยมหิดล',
        titleEn: 'Faculty of Medicine Siriraj Hospital, Mahidol University',
        institutionTh: 'คณะแพทยศาสตร์ศิริราชพยาบาล',
        institutionEn: 'Siriraj Hospital, Mahidol University',
        avatarBg: 'from-rose-600 to-pink-700',
        avatarInitials: 'อธ'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s12',
    day: 2,
    time: '15:30 - 16:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'embryology',
    sponsor: 'TSRM',
    titleTh: 'PGT in 2026: What\'s New from PGDIS?',
    titleEn: 'PGT in 2026: What\'s New from PGDIS?',
    descriptionTh: 'อัปเดตแนวทางและข้อแนะนำล่าสุดในการตรวจพันธุกรรมตัวอ่อนก่อนการฝังตัวจากสมาคม PGDIS ประจำปี 2026',
    descriptionEn: 'Latest consensus statements, mosaic embryo transfer guidelines, and technological breakthroughs from PGDIS 2026.',
    speakers: [
      {
        nameTh: 'นพ. พันธ์กวี ตันติวิริยพันธุ์',
        nameEn: 'Dr. Phankawi Tantiviriyaphan, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์ รพ.จุฬาลงกรณ์',
        titleEn: 'Reproductive Endocrinologist, Chulalongkorn Hospital',
        institutionTh: 'รพ.จุฬาลงกรณ์',
        institutionEn: 'Chulalongkorn Memorial Hospital',
        avatarBg: 'from-blue-600 to-cyan-700',
        avatarInitials: 'พต'
      }
    ],
    isHighlight: true,
    hasCme: true
  },

  // ==========================================
  // DAY 3 (Oct 22, 2026: Main Program Day 2)
  // Room: 10th Floor Grand Hall Lumphini 2,3
  // ==========================================
  {
    id: 'd3-reg',
    day: 3,
    time: '07:30 - 08:30',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'general',
    titleTh: 'ลงทะเบียนเข้าประชุมวันที่ 2 (Registration)',
    titleEn: 'Registration & Morning Welcome',
    descriptionTh: 'ลงทะเบียนผู้เข้าร่วมประชุมวันที่ 2',
    descriptionEn: 'Attendee morning sign-in and program handouts.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd3-s1',
    day: 3,
    time: '08:30 - 09:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'embryology',
    sponsor: 'TSRM',
    titleTh: 'Comprehensive NGS for PGT: From Basic Concepts to Clinical Application',
    titleEn: 'Comprehensive NGS for PGT: From Basic Concepts to Clinical Application',
    descriptionTh: 'เทคโนโลยี Next-Generation Sequencing (NGS) แบบครอบคลุมสำหรับการตรวจพันธุกรรมตัวอ่อน จากหลักการพื้นฐานสู่การใช้งานทางคลินิก',
    descriptionEn: 'High-resolution NGS pipelines, bioinformatic workflows, and clinical decision-making in PGT-A and PGT-SR.',
    speakers: [
      {
        nameTh: 'ผศ.พญ. อาทิตยา สิงห์วงษา',
        nameEn: 'Asst. Prof. Artitaya Singwongsa, MD',
        titleTh: 'คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี',
        titleEn: 'Ramathibodi Hospital, Mahidol University',
        institutionTh: 'รพ.รามาธิบดี',
        institutionEn: 'Ramathibodi Hospital',
        avatarBg: 'from-purple-600 to-indigo-700',
        avatarInitials: 'อส'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-s2',
    day: 3,
    time: '09:00 - 09:30',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'embryology',
    sponsor: 'TSRM',
    titleTh: 'Advances in PGT-M: Emerging Technologies and Clinical Challenges',
    titleEn: 'Advances in PGT-M: Emerging Technologies and Clinical Challenges',
    descriptionTh: 'ความก้าวหน้าของการตรวจคัดกรองโรคยีนเดี่ยวในตัวอ่อน (PGT-M) เทคโนโลยีใหม่และความท้าทายทางคลินิก',
    descriptionEn: 'Karyomapping, haplotyping, direct mutation detection, and complex monogenic disease resolution.',
    speakers: [
      {
        nameTh: 'ดร. เกษร เตียวศิริ',
        nameEn: 'Dr. Kessara Tiawsirisup, PhD',
        titleTh: 'ผู้เชี่ยวชาญด้านพันธุศาสตร์ Superior A.R.T.',
        titleEn: 'Chief Scientific Geneticist, Superior A.R.T.',
        institutionTh: 'Superior A.R.T.',
        institutionEn: 'Superior A.R.T. Center',
        avatarBg: 'from-emerald-600 to-teal-700',
        avatarInitials: 'กต'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-s3',
    day: 3,
    time: '09:30 - 10:10',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'keynote',
    sponsor: 'TSRM',
    titleTh: 'Breaking Bad News in IVF patients',
    titleEn: 'Breaking Bad News in IVF patients: Psychiatric & Communication Perspectives',
    descriptionTh: 'ศิลปะและทักษะการแจ้งข่าวร้ายและการดูแลสภาพจิตใจของผู้ป่วยที่ไม่ประสบความสำเร็จในการทำ IVF',
    descriptionEn: 'Psychological dynamics, trauma-informed communication strategies, and empathetic guidance in IVF failures.',
    speakers: [
      {
        nameTh: 'นพ.สมรักษ์ สันติเบ็ญจกุล',
        nameEn: 'Dr. Somrak Santibenchakul, MD',
        titleTh: 'จิตแพทย์ผู้เชี่ยวชาญ',
        titleEn: 'Consultant Psychiatrist',
        institutionTh: 'ผู้เชี่ยวชาญด้านสุขภาพจิตและจิตเวชศาสตร์',
        institutionEn: 'Psychiatric Specialist',
        avatarBg: 'from-amber-600 to-orange-700',
        avatarInitials: 'สส'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-break1',
    day: 3,
    time: '10:10 - 10:40',
    roomTh: 'Foyer ชั้น 10',
    roomEn: '10th Floor Foyer',
    category: 'general',
    titleTh: '☕ พักรับประทานอาหารว่าง (Coffee Break)',
    titleEn: 'Morning Refreshments & Coffee Break',
    descriptionTh: 'พักรับประทานของว่าง เครื่องดื่ม ชา และกาแฟ',
    descriptionEn: 'Coffee, tea, and morning refreshments.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd3-s4',
    day: 3,
    time: '10:40 - 11:10',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'symposium',
    sponsor: 'LG Chem',
    titleTh: 'Overcoming Endometriosis-Associated Infertility',
    titleEn: 'Overcoming Endometriosis-Associated Infertility',
    descriptionTh: 'กลยุทธ์การรักษาและการแก้ปัญหาภาวะมีบุตรยากที่เกิดจากโรคเยื่อบุโพรงมดลูกเจริญผิดที่อย่างตรงจุด',
    descriptionEn: 'Medical suppression, surgical timing, and optimized IVF stimulation strategies for endometriosis patients.',
    speakers: [
      {
        nameTh: 'นพ. ปวริศ หุมอาจ',
        nameEn: 'Dr. Pawaris Huma-at, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Medicine Specialist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-rose-600 to-pink-700',
        avatarInitials: 'ปห'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-s5',
    day: 3,
    time: '11:10 - 11:40',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'symposium',
    sponsor: 'Ferring',
    titleTh: 'Rethinking LH Supplementation in ART: From Steroidogenesis to Embryo Competence and Live Birth',
    titleEn: 'Rethinking LH Supplementation in ART: From Steroidogenesis to Embryo Competence and Live Birth',
    descriptionTh: 'การทบทวนหลักการเสริม LH ในกระบวนการ ART: จากการสร้างฮอร์โมนสเตียรอยด์สู่คุณภาพตัวอ่อนและอัตราการเกิดมีชีพ',
    descriptionEn: 'Translational biology of LH signaling in granulosa cells, luteal function, and reproductive outcomes.',
    speakers: [
      {
        nameTh: 'ผศ.พญ.ภัทราพร ชีระอารี',
        nameEn: 'Asst. Prof. Patraporn Chira-aree, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Endocrinologist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-600 to-indigo-800',
        avatarInitials: 'ภช'
      },
      {
        nameTh: 'พ.ท.นพ.กฤติเดช ภู่กิตติวรางกูร',
        nameEn: 'Lt. Col. Krittidet Phukittiwaran-kun, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Specialist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-teal-600 to-emerald-700',
        avatarInitials: 'กภ'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-s6',
    day: 3,
    time: '11:40 - 12:10',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'symposium',
    sponsor: 'DHA MAMA',
    titleTh: 'DHA in Reproductive Medicine: From Biological Mechanisms to Clinical Translation',
    titleEn: 'DHA in Reproductive Medicine: From Biological Mechanisms to Clinical Translation',
    descriptionTh: 'บทบาทของ DHA ในเวชศาสตร์การเจริญพันธุ์: จากกลไกทางชีววิทยาสู่การประยุกต์ใช้ในการดูแลคู่สมรสมีบุตรยาก',
    descriptionEn: 'Essential fatty acid metabolism, oocyte membrane fluidity, endometrial anti-inflammatory actions, and clinical trials.',
    speakers: [
      {
        nameTh: 'รศ.พญ. ชนกานต์ สืบถวิลกุล',
        nameEn: 'Assoc. Prof. Chonnakarn Suebthawinkul, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Specialist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-cyan-600 to-blue-700',
        avatarInitials: 'ชส'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-lunch',
    day: 3,
    time: '12:10 - 13:15',
    roomTh: 'Grand Dining Hall ชั้น 10',
    roomEn: '10th Floor Dining Hall',
    category: 'general',
    titleTh: '🍽️ พักรับประทานอาหารกลางวัน (Lunch)',
    titleEn: 'Luncheon Break',
    descriptionTh: 'พักรับประทานอาหารกลางวัน',
    descriptionEn: 'Buffet lunch for attendees.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd3-s7-agm',
    day: 3,
    time: '13:15 - 13:45',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'keynote',
    sponsor: 'TSRM',
    titleTh: 'การประชุมสามัญประจำปี สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (AGM 2026)',
    titleEn: 'TSRM Annual General Meeting (AGM 2026)',
    descriptionTh: 'การประชุมสามัญประจำปีของสมาชิกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย รายงานผลการดำเนินงานและแถลงงบดุล',
    descriptionEn: 'Annual General Meeting for TSRM society members: presidential reports, financial audit, and governance.',
    speakers: [
      {
        nameTh: 'คณะกรรมการบริหารสมาคมฯ (TSRM Committee)',
        nameEn: 'TSRM Executive Board',
        titleTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        titleEn: 'Thai Society for Reproductive Medicine',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-blue-700 to-indigo-900',
        avatarInitials: 'TS'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-s8-oral1',
    day: 3,
    time: '13:45 - 14:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'embryology',
    sponsor: 'TSRM',
    titleTh: 'Oral presentation: Microfluidic sperm selection versus density gradient centrifugation in ICSI cycles with abnormal semen parameters: a randomized sibling-oocyte study',
    titleEn: 'Oral presentation: Microfluidic sperm selection vs density gradient centrifugation in sibling oocyte ICSI cycles',
    descriptionTh: 'การเปรียบเทียบการคัดแยกอสุจิด้วยเทคโนโลยีไมโครฟลูอิดิกส์กับการปั่นแยกด้วยชั้นสารละลายเกรเดียนต์ในรอบ ICSI ที่มีน้ำอสุจิผิดปกติ: การศึกษาแบบสุ่มในไข่พี่น้อง',
    descriptionEn: 'Randomized sibling-oocyte comparison of fertilization, blastocyst conversion, and DNA integrity using microfluidics.',
    speakers: [
      {
        nameTh: 'พญ.ชัชศรัณย์ ธนพงษ์พิบูลย์',
        nameEn: 'Dr. Chatcharan Thanaphongphibun, MD',
        titleTh: 'คณะแพทยศาสตร์โรงพยาบาลรามาธิบดี',
        titleEn: 'Ramathibodi Hospital',
        institutionTh: 'รพ.รามาธิบดี',
        institutionEn: 'Ramathibodi Hospital',
        avatarBg: 'from-purple-600 to-pink-700',
        avatarInitials: 'ชธ'
      }
    ],
    hasCme: true
  },
  {
    id: 'd3-s9-oral2',
    day: 3,
    time: '14:00 - 14:15',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'surgery',
    sponsor: 'TSRM',
    titleTh: 'Oral presentation: Effects of curcuminoids on sperm DNA fragmentation: randomized, double-blind, placebo-controlled trial',
    titleEn: 'Oral presentation: Effects of curcuminoids on sperm DNA fragmentation: randomized, double-blind, placebo-controlled trial',
    descriptionTh: 'ผลของสารเคอร์คูมินอยด์ต่อการแตกหักของดีเอ็นเอในอสุจิ: การทดลองแบบสุ่ม มีกลุ่มควบคุมและปกปิดสองด้าน',
    descriptionEn: 'Double-blind RCT on antioxidant curcuminoid intervention in reducing oxidative stress and sperm DNA fragmentation index (DFI).',
    speakers: [
      {
        nameTh: 'พญ. อัญมณี วีระนรพานิช',
        nameEn: 'Dr. Anyamanee Weeranarophanit, MD',
        titleTh: 'คณะแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (มอ.)',
        titleEn: 'Prince of Songkla University (PSU)',
        institutionTh: 'รพ.สงขลานครินทร์ (มอ.)',
        institutionEn: 'Songklanagarind Hospital (PSU)',
        avatarBg: 'from-emerald-600 to-teal-700',
        avatarInitials: 'อว'
      }
    ],
    hasCme: true
  },
  {
    id: 'd3-break2',
    day: 3,
    time: '14:15 - 14:30',
    roomTh: 'Foyer ชั้น 10',
    roomEn: '10th Floor Foyer',
    category: 'general',
    titleTh: '☕ พักรับประทานอาหารว่าง (Coffee Break)',
    titleEn: 'Afternoon Refreshments',
    descriptionTh: 'พักรับประทานของว่าง เครื่องดื่ม ชา และกาแฟ',
    descriptionEn: 'Coffee, tea, and afternoon refreshments.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd3-s10',
    day: 3,
    time: '14:30 - 15:00',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'embryology',
    sponsor: 'TSRM',
    titleTh: 'Sperm DNA Fragmentation: Testing Methods and Clinical Utility',
    titleEn: 'Sperm DNA Fragmentation: Testing Methods and Clinical Utility',
    descriptionTh: 'การตรวจการแตกหักของดีเอ็นเออสุจิ วิธีการตรวจวิเคราะห์ที่เหมาะสม และประโยชน์ในการประเมินทางคลินิก',
    descriptionEn: 'Analytical methodologies (TUNEL, SCSA, Comet, SCD) and clinical indications for male factor infertility counseling.',
    speakers: [
      {
        nameTh: 'รศ. นพ. ชัยณรงค์ โชติสุชาติ',
        nameEn: 'Assoc. Prof. Chainarong Chotisuchart, MD',
        titleTh: 'คณะแพทยศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (มอ.)',
        titleEn: 'Prince of Songkla University (PSU)',
        institutionTh: 'รพ.สงขลานครินทร์ (มอ.)',
        institutionEn: 'Songklanagarind Hospital (PSU)',
        avatarBg: 'from-blue-600 to-indigo-800',
        avatarInitials: 'ชช'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-s11',
    day: 3,
    time: '15:00 - 15:45',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'surgery',
    sponsor: 'TSRM',
    titleTh: 'High-Intensity Focused Ultrasound (HIFU) for uterine fibroids: Pros and Cons',
    titleEn: 'High-Intensity Focused Ultrasound (HIFU) for uterine fibroids: Pros and Cons (Debate Session)',
    descriptionTh: 'การรักษาเนื้องอกกล้ามเนื้อมดลูกด้วยคลื่นเสียงความถี่สูงแบบเฉพาะจุด (HIFU): ข้อดี ข้อเสีย และข้อควรระวังในมุมมองวิชาการ',
    descriptionEn: 'Comprehensive scientific debate on HIFU ablation efficacy, fertility preservation safety, recurrence rates, and surgical alternatives.',
    speakers: [
      {
        nameTh: 'พญ. รัชดาพร ฤกษ์ยินดี (Pros)',
        nameEn: 'Dr. Ratchadaporn Roerkyindee, MD (Pros)',
        titleTh: 'โรงพยาบาลราชวิถี (ฝ่ายสนับสนุน / Pros)',
        titleEn: 'Rajavithi Hospital (Pros)',
        institutionTh: 'โรงพยาบาลราชวิถี',
        institutionEn: 'Rajavithi Hospital',
        avatarBg: 'from-emerald-600 to-teal-800',
        avatarInitials: 'รร'
      },
      {
        nameTh: 'พญ. พิมพกา ชวนะเวสน์ (Cons)',
        nameEn: 'Dr. Pimpaka Chawanaves, MD (Cons)',
        titleTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย (ฝ่ายข้อพิจารณา / Cons)',
        titleEn: 'Thai Society for Reproductive Medicine (Cons)',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'Thai Society for Reproductive Medicine',
        avatarBg: 'from-rose-600 to-pink-700',
        avatarInitials: 'พช'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd3-close',
    day: 3,
    time: '15:45',
    roomTh: 'Grand Hall Lumphini 2, 3 ชั้น 10',
    roomEn: '10th Floor Grand Hall Lumphini 2, 3',
    category: 'general',
    titleTh: 'พิธีปิดการประชุมวิชาการประจำปี ครั้งที่ 34 (Conference Closed)',
    titleEn: 'Closing Remarks & Official Conference Closed',
    descriptionTh: 'สรุปภาพรวมการประชุมวิชาการประจำปี ครั้งที่ 34 ประจำปี 2569 ขอบคุณวิทยากร ผู้สนับสนุน และผู้เข้าร่วมประชุมทุกท่าน',
    descriptionEn: 'Closing address by the organizing committee, CME credits confirmation, and conference adjournment.',
    speakers: [],
    hasCme: true
  }
];

export function AgendaView() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [day1ViewMode, setDay1ViewMode] = useState<'sheet' | 'cards'>('sheet');
  const [day1WorkshopFilter, setDay1WorkshopFilter] = useState<'all' | 'ws1' | 'ws3'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showPassModal, setShowPassModal] = useState<boolean>(false);
  const { data: session } = useSession();
  const [userData, setUserData] = useState<{
    name?: string;
    email?: string;
    picture?: string;
    googleId?: string;
  } | null>(null);
  const [imgError, setImgError] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  // Pass Token and Real QR Code State
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isQrGenerating, setIsQrGenerating] = useState<boolean>(false);
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  // Derive stable and unique pass token for attendee
  const userPassCode = React.useMemo(() => {
    if (userData && (userData as any).passCode) return (userData as any).passCode;
    if (userData?.email) {
      if (userData.email === 'thanadolpetch22@gmail.com') return 'TSRM-2026-8891';
      let hash = 0;
      for (let i = 0; i < userData.email.length; i++) {
        hash = (hash * 31 + userData.email.charCodeAt(i)) % 10000;
      }
      return `TSRM-2026-${String(Math.abs(hash)).padStart(4, '0')}`;
    }
    return 'TSRM-2026-8891';
  }, [userData]);

  // Generate Real High-Resolution QR Code (Data URL)
  useEffect(() => {
    let isMounted = true;
    const generateRealQR = async () => {
      setIsQrGenerating(true);
      try {
        const dataUrl = await QRCode.toDataURL(userPassCode, {
          width: 400,
          margin: 1.5,
          color: {
            dark: '#020617', // High-contrast deep slate for instant camera decoding
            light: '#ffffff',
          },
          errorCorrectionLevel: 'M',
        });
        if (isMounted) {
          setQrCodeUrl(dataUrl);
        }
      } catch (err) {
        console.error('Failed to generate real QR Code:', err);
      } finally {
        if (isMounted) {
          setIsQrGenerating(false);
        }
      }
    };

    generateRealQR();
    return () => {
      isMounted = false;
    };
  }, [userPassCode]);

  const handleCopyToken = async () => {
    try {
      await navigator.clipboard.writeText(userPassCode);
      setCopiedToken(true);
      triggerToast(lang === 'th' ? `คัดลอกรหัส Pass Token (${userPassCode}) แล้ว` : `Pass Token (${userPassCode}) copied!`);
      setTimeout(() => setCopiedToken(false), 2000);
    } catch (e) {
      console.error('Copy token failed', e);
    }
  };

  const handleDownloadPass = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `THAISRM-Pass-${userPassCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    triggerToast(t.agenda.passSavedToast);
    setShowPassModal(false);
  };

  // Load User Data & Saved Bookmarks on Mount and Session Changes
  useEffect(() => {
    setImgError(false);
    if (session?.user) {
      const authUser = {
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        picture: (session.user as any).picture || session.user.image || undefined,
        googleId: (session.user as any).googleId || undefined,
      };
      setUserData(authUser);
      try {
        localStorage.setItem('user_data', JSON.stringify(authUser));
      } catch (e) {
        console.error('Failed to sync session to localStorage', e);
      }
    } else {
      try {
        const storedUser = localStorage.getItem('user_data');
        if (storedUser) {
          setUserData(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to load user from localStorage', e);
      }
    }

    try {
      const storedBookmarks = localStorage.getItem('tsrm_agenda_bookmarks');
      if (storedBookmarks) {
        setBookmarks(JSON.parse(storedBookmarks));
      }
    } catch (e) {
      console.error('Failed to load bookmarks data', e);
    }
  }, [session]);

  // Optimized Scroll-to-Top tracking (only re-render when boolean threshold crossed)
  useEffect(() => {
    let prevShow = false;
    const handleScroll = () => {
      const shouldShow = window.scrollY > 350;
      if (shouldShow !== prevShow) {
        prevShow = shouldShow;
        setShowScrollTop(shouldShow);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Countdown logic to Oct 20, 2026 07:30:00 GMT+7 (34th TSRM 2026)
  useEffect(() => {
    const targetDate = new Date('2026-10-20T07:30:00+07:00').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const toggleBookmark = (sessionId: string) => {
    let updated: string[];
    if (bookmarks.includes(sessionId)) {
      updated = bookmarks.filter(id => id !== sessionId);
      triggerToast(lang === 'th' ? 'ยกเลิกการบันทึกวาระนี้แล้ว' : 'Removed from saved schedule');
    } else {
      updated = [...bookmarks, sessionId];
      triggerToast(lang === 'th' ? 'บันทึกวาระนี้เข้าตารางส่วนตัวแล้ว' : 'Added to personal schedule');
    }
    setBookmarks(updated);
    try {
      localStorage.setItem('tsrm_agenda_bookmarks', JSON.stringify(updated));
    } catch (e) {
      console.error('Could not save bookmarks', e);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
      document.cookie = 'thaisrm_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
      document.cookie = 'thaisrm_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 UTC;';
    } catch (e) {
      console.error('Logout error', e);
    }
    await signOut({ callbackUrl: '/login' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSessions = React.useMemo(() => {
    return AGENDA_DATA.filter((session) => {
      if (session.day !== selectedDay) return false;
      if (selectedDay === 1 && day1WorkshopFilter !== 'all' && session.workshopTrack !== day1WorkshopFilter) {
        return false;
      }
      if (filterCategory !== 'all' && session.category !== filterCategory) return false;
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchTh = session.titleTh.toLowerCase().includes(term) || session.descriptionTh.toLowerCase().includes(term);
        const matchEn = session.titleEn.toLowerCase().includes(term) || session.descriptionEn.toLowerCase().includes(term);
        const matchSpeaker = session.speakers.some(s => s.nameTh.toLowerCase().includes(term) || s.nameEn.toLowerCase().includes(term));
        const matchSponsor = session.sponsor?.toLowerCase().includes(term);
        return matchTh || matchEn || matchSpeaker || matchSponsor;
      }
      return true;
    });
  }, [selectedDay, filterCategory, searchTerm, day1WorkshopFilter]);

  const memberDisplayName = userData?.name || (lang === 'th' ? 'สมาชิกสมาคม TSRM' : 'TSRM Active Member');
  const memberEmail = userData?.email || 'member@thaisrm.or.th';

  return (
    <div className="flex-1 w-full bg-[#f8fafc] text-slate-800 font-sans pb-20 animate-fade-in overflow-x-hidden relative">
      {/* Scroll Progress Indicator Bar at Top */}
      <ScrollProgressBar />

      {/* Toast Notification */}
      {toastMessage && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-6 right-6 z-[10000] bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-slide-down backdrop-blur-md">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-[#4ade80] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>,
        document.body
      )}

      {/* Floating Scroll-to-Top and Quick Pass Floating Widget */}
      {showScrollTop && (
        <div className="fixed bottom-6 left-6 z-40 flex items-center gap-2 animate-slide-down">
          <button
            onClick={() => setShowPassModal(true)}
            className="flex items-center gap-2 bg-[#0026b3] hover:bg-blue-800 text-white font-black text-xs px-3.5 py-2.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-200 border border-blue-400/30 active:scale-95 cursor-pointer backdrop-blur-md"
            title={t.agenda.btnMyPass}
          >
            <QrCode className="w-4 h-4 text-[#4ade80] stroke-[2.5]" />
            <span className="hidden sm:inline">{t.agenda.btnMyPass}</span>
          </button>
          <button
            onClick={scrollToTop}
            className="w-10 h-10 rounded-2xl bg-white/95 hover:bg-white text-slate-800 flex items-center justify-center shadow-xl hover:shadow-2xl border border-slate-200 transition-all duration-200 active:scale-95 cursor-pointer"
            title="Scroll to Top / กลับสู่ด้านบน"
            aria-label="Scroll to Top"
          >
            <ChevronUp className="w-5 h-5 text-[#0026b3]" />
          </button>
        </div>
      )}

      {/* Hero Header Section with Animated WebGL Shader Background */}
      <Velaris
        bg="#000e38"
        colors={["#38bdf8", "#0052cc", "#0026b3", "#001460"]}
        speed={1.2}
        grain={0.15}
        height="auto"
        className="text-white pt-8 pb-14 px-4 sm:px-6 lg:px-8 shadow-2xl relative"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Top User Bar Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 sm:p-5 border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-4 shadow-xl hover:border-white/25 transition-all duration-300">
            <div className="flex items-center gap-3 min-w-0">
              {userData?.picture && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userData.picture}
                  alt={memberDisplayName}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setImgError(true)}
                  className="w-10 h-10 min-[360px]:w-12 min-[360px]:h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-[#4ade80] shadow-md object-cover shrink-0 hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-10 h-10 min-[360px]:w-12 min-[360px]:h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#4ade80] to-emerald-400 text-[#0026b3] flex items-center justify-center font-black text-base min-[360px]:text-lg sm:text-xl shrink-0 shadow-md hover:scale-105 transition-transform duration-200">
                  {memberDisplayName.charAt(0) || 'M'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 min-[360px]:gap-2 flex-wrap">
                  <span className="text-[9px] min-[360px]:text-[10px] sm:text-xs font-bold bg-[#4ade80] text-slate-900 px-1.5 min-[360px]:px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                    <UserCheck className="w-3 h-3 shrink-0" />
                    <span>{t.agenda.membershipStatus}</span>
                  </span>
                  <span className="text-[10px] min-[360px]:text-[11px] text-blue-200 font-mono opacity-80 truncate">
                    ID: {userPassCode}
                  </span>
                </div>
                <h2 className="text-sm min-[360px]:text-base sm:text-lg font-extrabold text-white truncate mt-0.5 tracking-tight">
                  {memberDisplayName}
                </h2>
                <p className="text-[11px] sm:text-xs text-blue-100/80 truncate font-mono">{memberEmail}</p>
              </div>
            </div>

            {/* Actions: E-Pass & Logout */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={() => setShowPassModal(true)}
                className="group relative flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#4ade80] to-emerald-400 hover:from-emerald-300 hover:to-[#4ade80] text-slate-950 font-black px-3 min-[360px]:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer overflow-hidden flex-1 sm:flex-initial justify-center"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/30 transform -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 pointer-events-none" />
                <QrCode className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-950 stroke-[2.5] group-hover:rotate-12 transition-transform duration-200 shrink-0" />
                <span>{t.agenda.btnMyPass}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-2.5 min-[360px]:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs transition-all duration-200 active:scale-95 cursor-pointer hover:border-rose-400/40"
                title={t.agenda.btnLogout}
              >
                <LogOut className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                <span className="hidden sm:inline">{t.agenda.btnLogout}</span>
              </button>
            </div>
          </div>

          {/* Main Congress Title & Theme */}
          <div className="space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 bg-blue-500/20 text-[#4ade80] border border-[#4ade80]/30 px-3.5 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-2xs hover:bg-blue-500/30 transition-colors">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              <span>{t.agenda.congressBadge}</span>
            </div>

            <h1 className="text-xl min-[400px]:text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight [text-wrap:balance]">
              {t.agenda.congressTitle}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-blue-100 font-medium [text-wrap:balance]">
              {t.agenda.congressSubtitle}
            </p>
            <p className="text-xs sm:text-sm text-[#4ade80] font-semibold italic bg-blue-950/50 inline-block px-3 py-1.5 rounded-lg border border-blue-500/30 shadow-xs [text-wrap:balance] max-w-full">
              {t.agenda.congressTheme}
            </p>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-3 text-xs sm:text-sm text-blue-100/90 font-medium">
              <div className="flex items-center gap-2 hover:text-white transition-colors">
                <Calendar className="w-4 h-4 text-[#4ade80] shrink-0" />
                <span>{t.agenda.eventDate}</span>
              </div>
              <div className="flex items-center gap-2 hover:text-white transition-colors">
                <MapPin className="w-4 h-4 text-[#4ade80] shrink-0" />
                <span>{t.agenda.eventLocation}</span>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="bg-slate-950/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-[#4ade80] flex items-center justify-center shrink-0 hidden sm:flex border border-blue-500/30">
                <Clock className="w-5 h-5 text-[#4ade80]" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
                  <span>{t.agenda.countdownTitle}</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ade80]" />
                  </span>
                </h3>
                <p className="text-[11px] text-blue-200">20-22 Oct 2026 | Grande Centre Point LUMPHINI, Bangkok</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center w-full sm:w-auto">
              {[
                { label: t.agenda.days, val: timeLeft.days },
                { label: t.agenda.hours, val: timeLeft.hours },
                { label: t.agenda.minutes, val: timeLeft.minutes },
                { label: t.agenda.seconds, val: timeLeft.seconds },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 hover:bg-white/15 transition-colors rounded-xl px-2.5 py-1.5 sm:px-4 sm:py-2 border border-white/10 min-w-[58px] sm:min-w-[68px] group"
                >
                  <span className="block text-base sm:text-xl font-black text-[#4ade80] font-mono leading-none group-hover:scale-105 transition-transform">
                    {String(item.val).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-blue-200 uppercase mt-0.5 block tracking-wider">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Velaris>

      {/* Congress Stats Overview Banner with Scroll Reveal */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[
            { title: t.agenda.statDays, subtitle: t.agenda.statDaysSub, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
            { title: t.agenda.statSpeakers, subtitle: t.agenda.statSpeakersSub, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { title: t.agenda.statCme, subtitle: t.agenda.statCmeSub, icon: Award, color: 'text-amber-600', bg: 'bg-amber-50' },
            { title: t.agenda.statSeats, subtitle: t.agenda.statSeatsSub, icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <RevealOnScroll key={idx} delay={idx * 70} direction="up">
                <div className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-md border border-slate-200/80 flex items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 leading-tight">{stat.title}</h4>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate">{stat.subtitle}</p>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      {/* Main Content Area: Agenda Tabs & Sessions */}
      <main id="agenda-section" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 space-y-8">
        {/* Section Header with Day Selector Tabs */}
        <RevealOnScroll direction="up" delay={50}>
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0026b3] uppercase tracking-wider mb-1">
                  <Calendar className="w-4 h-4" />
                  <span>THAISRM Schedule</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {t.agenda.tabsTitle}
                </h2>
              </div>

              {/* Search Bar */}
              <div className="flex items-center gap-2">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[#0026b3]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={lang === 'th' ? 'ค้นหาหัวข้อ / วิทยากร...' : 'Search session or speaker...'}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/30 transition-all duration-200 shadow-xs"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5 rounded-full hover:bg-slate-100 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Day Navigation Tabs */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-slate-200/70 p-1.5 rounded-2xl border border-slate-200">
              {[
                { day: 1, title: t.agenda.day1Tab, sub: t.agenda.day1Sub },
                { day: 2, title: t.agenda.day2Tab, sub: t.agenda.day2Sub },
                { day: 3, title: t.agenda.day3Tab, sub: t.agenda.day3Sub },
              ].map((d) => {
                const isActive = selectedDay === d.day;
                return (
                  <button
                    key={d.day}
                    onClick={() => setSelectedDay(d.day)}
                    className={`px-3 py-2.5 sm:py-3.5 rounded-xl text-center transition-all duration-200 cursor-pointer active:scale-98 ${isActive
                        ? 'bg-[#0026b3] text-white shadow-lg font-black ring-2 ring-[#0026b3]/30 scale-[1.01]'
                        : 'bg-white/80 hover:bg-white text-slate-700 hover:text-slate-900 font-semibold hover:shadow-xs'
                      }`}
                  >
                    <span className="block text-xs sm:text-sm font-extrabold leading-tight">
                      {d.title}
                    </span>
                    <span className={`text-[10px] sm:text-[11px] block mt-0.5 truncate transition-colors ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>
                      {d.sub}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
              <span className="text-slate-500 font-bold flex items-center gap-1 shrink-0 text-[11px]">
                <Filter className="w-3.5 h-3.5" />
                <span>Filter:</span>
              </span>
              {[
                { id: 'all', label: t.agenda.filterAll },
                { id: 'keynote', label: t.agenda.filterKeynote },
                { id: 'embryology', label: t.agenda.filterEmbryology },
                { id: 'surgery', label: t.agenda.filterSurgery },
                { id: 'symposium', label: t.agenda.filterSymposium },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap font-bold text-[11px] sm:text-xs transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${filterCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                      : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </RevealOnScroll>

        {/* Day 1 Special Banner & View Mode Switcher */}
        {selectedDay === 1 && (
          <RevealOnScroll direction="up">
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-indigo-50/90 p-4 rounded-3xl border border-blue-200/80 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0026b3] text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Sparkles className="w-5 h-5 text-cyan-300" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-[#0026b3] uppercase tracking-wider">
                      <span>Precongress Workshops</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                      <span>20 ต.ค. 2569</span>
                    </div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                      WS 1: ART Nurse • WS 3: Fertility-enhancing hysteroscopic surgery
                    </h3>
                  </div>
                </div>

                {/* Switch View Buttons */}
                <div className="inline-flex p-1 bg-white rounded-2xl border border-slate-200 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setDay1ViewMode('sheet')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      day1ViewMode === 'sheet'
                        ? 'bg-[#0026b3] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'ตารางสูจิบัตรทางการ' : 'Official Flyer Sheet'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDay1ViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      day1ViewMode === 'cards'
                        ? 'bg-[#0026b3] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'มุมมองการ์ดสรุป' : 'Interactive Cards'}</span>
                  </button>
                </div>
              </div>

              {/* Day 1 Workshop Track Switcher Pills (Cards view) */}
              {day1ViewMode === 'cards' && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-slate-500 font-bold text-[11px] shrink-0">
                    {lang === 'th' ? 'เลือกเวิร์กช็อป:' : 'Select Workshop:'}
                  </span>
                  {[
                    { id: 'all', label: lang === 'th' ? 'ทุกเวิร์กช็อป (All WS)' : 'All Workshops' },
                    { id: 'ws1', label: 'WS 1: ART Nurse (วนาลัย 1-2)' },
                    { id: 'ws3', label: 'WS 3: Hysteroscopy (พิมาน 2)' },
                  ].map((track) => (
                    <button
                      key={track.id}
                      onClick={() => setDay1WorkshopFilter(track.id as any)}
                      className={`px-3 py-1.5 rounded-full whitespace-nowrap font-bold text-[11px] transition-all duration-200 cursor-pointer shrink-0 ${
                        day1WorkshopFilter === track.id
                          ? 'bg-[#0026b3] text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {track.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </RevealOnScroll>
        )}

        {/* If Day 1 and Sheet View (without active search or filter) */}
        {selectedDay === 1 && day1ViewMode === 'sheet' && !searchTerm && filterCategory === 'all' ? (
          <RevealOnScroll direction="up">
            <OfficialWorkshopAgenda lang={lang} />
          </RevealOnScroll>
        ) : (
          /* Sessions List Cards */
          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-xs space-y-3 animate-fade-in">
                <Search className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-bold text-slate-700">
                  {lang === 'th' ? 'ไม่พบวาระการประชุมตามเงื่อนไขที่เลือก' : 'No sessions match your search or filter'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'th' ? 'ลองล้างคำค้นหาหรือเลือกหมวดหมู่อื่น' : 'Try clearing your search or selecting all categories'}
                </p>
                <button
                  onClick={() => { setSearchTerm(''); setFilterCategory('all'); setDay1WorkshopFilter('all'); }}
                  className="bg-[#0026b3] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer transition shadow-xs active:scale-95"
                >
                  {lang === 'th' ? 'แสดงทั้งหมด' : 'Show All'}
                </button>
              </div>
            ) : (
              filteredSessions.map((session, index) => {
                const isBookmarked = bookmarks.includes(session.id);
                const title = lang === 'th' ? session.titleTh : session.titleEn;
                const desc = lang === 'th' ? session.descriptionTh : session.descriptionEn;
                const room = lang === 'th' ? session.roomTh : session.roomEn;

                return (
                  <RevealOnScroll key={session.id} delay={Math.min(index * 60, 300)} direction="up">
                    <div
                      className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border card-hover-effect transition-all duration-300 group ${session.isHighlight
                          ? 'border-blue-200 ring-1 ring-blue-500/20 shadow-md bg-gradient-to-r from-blue-50/25 via-white to-white'
                          : 'border-slate-200/90 shadow-xs'
                        }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        {/* Time & Room Column */}
                        <div className="lg:w-56 shrink-0 space-y-2 border-b lg:border-b-0 lg:border-r border-slate-100 pb-3 lg:pb-0 lg:pr-4">
                          <div className="inline-flex items-center gap-2 bg-[#eff4ff] text-[#0026b3] px-3 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-extrabold border border-[#d6e4ff] group-hover:border-blue-400/60 transition-colors">
                            <Clock className="w-3.5 h-3.5 text-[#0026b3] shrink-0" />
                            <span>{session.time}</span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="font-bold text-slate-700">{room}</span>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {session.workshopTrack && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                                session.workshopTrack === 'ws1'
                                  ? 'bg-blue-100 text-blue-900 border-blue-200'
                                  : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                              }`}>
                                {session.workshopTrack === 'ws1' ? 'WS 1: ART Nurse' : 'WS 3: Hysteroscopy'}
                              </span>
                            )}
                            {session.sponsor && (
                              <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="text-slate-500 font-normal">Sponsor:</span>
                                <span className="font-extrabold text-[#0026b3]">{session.sponsor}</span>
                              </span>
                            )}
                            {session.hasCme && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>{t.agenda.cmeBadge}</span>
                              </span>
                            )}
                            {session.hasLiveStream && (
                              <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600" />
                                </span>
                                <span>{t.agenda.liveStreamBadge}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Session Content Column */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug group-hover:text-[#0026b3] transition-colors duration-200">
                              {title}
                            </h3>

                            {/* Bookmark Button */}
                            <button
                              onClick={() => toggleBookmark(session.id)}
                              className={`p-2 rounded-xl transition-all duration-200 cursor-pointer shrink-0 active:scale-90 ${isBookmarked
                                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 shadow-2xs'
                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200'
                                }`}
                              title={isBookmarked ? t.agenda.addedToSchedule : t.agenda.addToSchedule}
                            >
                              {isBookmarked ? (
                                <BookmarkCheck className="w-4 h-4 fill-amber-600 text-amber-600 animate-scale-up" />
                              ) : (
                                <Bookmark className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-normal">
                            {desc}
                          </p>

                          {/* Speakers Card */}
                          {session.speakers.length > 0 && (
                            <div className="pt-2">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                {t.agenda.speakerLabel} ({session.speakers.length})
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {session.speakers.map((speaker, sIdx) => {
                                  const sName = lang === 'th' ? speaker.nameTh : speaker.nameEn;
                                  const sTitle = lang === 'th' ? speaker.titleTh : speaker.titleEn;
                                  const sInst = lang === 'th' ? speaker.institutionTh : speaker.institutionEn;

                                  return (
                                    <div
                                      key={sIdx}
                                      className="flex items-center gap-2.5 bg-slate-50 hover:bg-blue-50/70 p-2.5 rounded-xl border border-slate-100 hover:border-blue-200 transition-all duration-200 group/speaker"
                                    >
                                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${speaker.avatarBg} text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs group-hover/speaker:scale-105 transition-transform`}>
                                        {speaker.avatarInitials}
                                      </div>
                                      <div className="min-w-0">
                                        <h5 className="text-xs font-bold text-slate-900 truncate group-hover/speaker:text-[#0026b3] transition-colors">{sName}</h5>
                                        <p className="text-[10px] text-slate-500 font-medium truncate">{sTitle}</p>
                                        <p className="text-[9px] text-[#0026b3] font-semibold truncate">{sInst}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </RevealOnScroll>
                );
              })
            )}
          </div>
        )}

        {/* PR Highlights & Conference Information Section */}
        <section id="pr-section" className="pt-8 space-y-6">
          <RevealOnScroll direction="up">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0026b3] uppercase tracking-wider mb-1">
                <Sparkles className="w-4 h-4 text-[#0026b3]" />
                <span>Congress PR & Privileges</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {t.agenda.prTitle}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {t.agenda.prSubtitle}
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* CME / CPD Accreditation Card */}
            <RevealOnScroll delay={50} direction="up">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-md card-hover-effect space-y-4 relative overflow-hidden group h-full">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:rotate-3 transition-all duration-200">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">{t.agenda.cmeTitle}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.agenda.cmeDesc}</p>
                </div>
                <div className="space-y-2 pt-1">
                  {[t.agenda.cmeP1, t.agenda.cmeP2, t.agenda.cmeP3].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-amber-50/60 px-3 py-2 rounded-xl border border-amber-100 hover:bg-amber-50 transition-colors">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </RevealOnScroll>

            {/* Venue & Transportation Card */}
            <RevealOnScroll delay={100} direction="up">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-md card-hover-effect space-y-4 group h-full">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:-rotate-3 transition-all duration-200">
                  <Building className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">{t.agenda.venueTitle}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.agenda.venueDesc}</p>
                </div>
                <div className="bg-rose-50/60 p-3 rounded-xl border border-rose-100 text-xs text-slate-700 font-medium space-y-2">
                  <p>{t.agenda.venueParking}</p>
                  <a
                    href="https://maps.google.com/?q=Grande+Centre+Point+Lumphini+Bangkok"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[#0026b3] font-bold hover:underline cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t.agenda.venueMapBtn}</span>
                  </a>
                </div>
              </div>
            </RevealOnScroll>

            {/* Registration Fees & Payment Card (Replacing old Gala Dinner) */}
            <RevealOnScroll delay={150} direction="up">
              <div className="bg-gradient-to-br from-slate-900 via-[#00176b] to-blue-950 text-white rounded-3xl p-5 sm:p-6 shadow-xl card-hover-effect space-y-4 relative overflow-hidden group h-full border border-blue-500/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#4ade80]/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-[#4ade80] flex items-center justify-center font-bold border border-white/15 group-hover:scale-110 transition-transform">
                  <Award className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-white">{t.agenda.dinnerTitle}</h3>
                  <p className="text-xs text-blue-100 leading-relaxed">{t.agenda.dinnerDesc}</p>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-white/10 p-3 rounded-xl border border-white/15 space-y-1.5 text-[11px]">
                    <div className="flex justify-between font-bold">
                      <span className="text-cyan-300">Onsite Main (21-22 Oct)</span>
                      <span>Member ฿ 4,000 / Non-member ฿ 5,000</span>
                    </div>
                    <div className="flex justify-between text-blue-200">
                      <span>Fellow Onsite</span>
                      <span>฿ 2,000 (Member / Non-member)</span>
                    </div>
                    <div className="flex justify-between text-emerald-300 font-semibold">
                      <span>Online Member</span>
                      <span>Participant ฿ 4,000 / Fellow ฟรีที่สถาบัน</span>
                    </div>
                  </div>

                  <div className="bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-500/30 text-[11px] text-[#4ade80] font-bold">
                    {t.agenda.dinnerDressCode}
                  </div>
                </div>
              </div>
            </RevealOnScroll>

            {/* Research & Poster Presentation Card */}
            <RevealOnScroll delay={200} direction="up">
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-md card-hover-effect space-y-4 group h-full">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold group-hover:scale-110 group-hover:rotate-3 transition-all duration-200">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">{t.agenda.researchTitle}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{t.agenda.researchDesc}</p>
                </div>
                <div className="bg-purple-50/60 p-3 rounded-xl border border-purple-100 text-xs text-purple-900 font-semibold">
                  🏆 การนำเสนอผลงานวิจัยดีเด่น 4 หัวข้อ (PRETTI-TRIAL, Apoptotic genes, Microfluidic sperm, Curcuminoids)
                </div>
              </div>
            </RevealOnScroll>
          </div>
        </section>

        {/* Downloads & Contact Secretariat */}
        <RevealOnScroll direction="up" delay={100}>
          <section id="contact-section" className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
              <div className="space-y-1">
                <h3 className="text-lg font-black text-white">{t.agenda.supportTitle}</h3>
                <p className="text-xs text-slate-400">THAISRM Annual Congress Organizing Committee</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => triggerToast(lang === 'th' ? 'กำลังเตรียมไฟล์สูจิบัตร TSRM Proceeding...' : 'Downloading TSRM Proceeding...')}
                  className="flex items-center gap-2 bg-[#0026b3] hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 cursor-pointer shadow-md hover:shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.agenda.btnDownloadAgenda}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/60 transition-colors">
                <Phone className="w-4 h-4 text-[#4ade80] shrink-0" />
                <span>{t.agenda.supportTel}</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/60 transition-colors">
                <Mail className="w-4 h-4 text-[#4ade80] shrink-0" />
                <span>{t.agenda.supportEmail}</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-800/80 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/60 transition-colors">
                <MessageCircle className="w-4 h-4 text-[#4ade80] shrink-0" />
                <span>{t.agenda.supportLine}</span>
              </div>
            </div>
          </section>
        </RevealOnScroll>
      </main>

      {/* Digital E-Pass Modal */}
      {showPassModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative animate-scale-up space-y-4 text-center mb-6">
            <button
              onClick={() => setShowPassModal(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Badge Header */}
            <div className="space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 bg-blue-50 text-[#0026b3] px-3 py-1 rounded-full text-[11px] font-extrabold uppercase">
                <ThaiSrmLogo className="w-3.5 h-3.5" />
                <span>THAISRM Congress Pass</span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                <span className="block">{lang === 'th' ? 'บัตรเข้าร่วมงานดิจิทัล' : 'Digital Event E-Pass'}</span>
                <span className="block text-sm sm:text-base font-extrabold text-[#0026b3] mt-0.5 tracking-wide">
                  (THAISRM E-Pass)
                </span>
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                {lang === 'th' ? (
                  <>
                    โปรดแสดง QR Code นี้แก่เจ้าหน้าที่ ณ จุดลงทะเบียน
                    <br className="hidden sm:inline" />
                    เพื่อรับสูจิบัตรและป้ายชื่อ
                  </>
                ) : (
                  t.agenda.passModalSubtitle
                )}
              </p>
            </div>

            {/* E-Pass Card Preview */}
            <div className="bg-gradient-to-b from-[#0026b3] via-[#001f94] to-[#00176b] text-white rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 border border-blue-400/30 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                <div className="text-left">
                  <span className="text-[10px] text-blue-200 font-mono block leading-tight">THAISRM 2026</span>
                  <span className="text-xs font-black text-white leading-tight">CONGRESS PASS</span>
                </div>
                <span className="bg-[#4ade80] text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase shadow-2xs">
                  VERIFIED
                </span>
              </div>

              {/* Real High-Resolution Scannable QR Code Container */}
              <div className="relative inline-block mx-auto">
                <div className="bg-white p-3 sm:p-3.5 rounded-2xl shadow-lg ring-4 ring-[#4ade80]/40 flex items-center justify-center">
                  {isQrGenerating || !qrCodeUrl ? (
                    <div className="w-36 h-36 sm:w-40 sm:h-40 bg-slate-100 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-500">
                      <div className="w-6 h-6 border-3 border-[#0026b3] border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-bold">Generating QR...</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrCodeUrl}
                      alt={`Pass QR Code ${userPassCode}`}
                      className="w-36 h-36 sm:w-40 sm:h-40 rounded-xl object-contain shadow-xs"
                    />
                  )}
                </div>
              </div>

              {/* Pass Token Display & 1-Click Copy Badge (Manual Backup) */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-2.5 border border-white/20 flex items-center justify-between gap-2 max-w-xs mx-auto w-full shadow-inner">
                <div className="text-left min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-blue-200 font-bold block uppercase tracking-wider">
                    {lang === 'th' ? 'รหัส Pass Token' : 'Pass Token Code'}
                  </span>
                  <span className="font-mono font-black text-sm sm:text-base text-[#4ade80] tracking-wider truncate block">
                    {userPassCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-[11px] font-extrabold transition flex items-center gap-1 shrink-0 active:scale-95 cursor-pointer border border-white/20 shadow-2xs hover:border-[#4ade80]/50"
                  title="Copy Pass Token Code"
                >
                  {copiedToken ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#4ade80] stroke-[2.5]" />
                      <span className="text-[#4ade80]">{lang === 'th' ? 'คัดลอกแล้ว' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-blue-200" />
                      <span>{lang === 'th' ? 'คัดลอก' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Backup Instructions for Manual Staff Check-in */}
              <div className="bg-blue-950/50 rounded-xl p-2.5 border border-blue-400/20 text-[10px] sm:text-[11px] text-blue-100/90 leading-relaxed text-left flex items-start gap-2 max-w-xs mx-auto">
                <ShieldCheck className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
                <span>
                  {lang === 'th'
                    ? 'หากกล้องสแกน QR Code ไม่ติด สามารถแจ้งรหัส Pass Token ด้านบนนี้แก่เจ้าหน้าที่เพื่อเช็คอินได้ทันที'
                    : 'If camera scanning fails, present this Pass Token code to staff for instant manual check-in.'}
                </span>
              </div>

              {/* Pass Holder Details */}
              <div className="space-y-1 text-center flex flex-col items-center pt-0.5">
                {userData?.picture && !imgError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={userData.picture}
                    alt={memberDisplayName}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-10 h-10 rounded-full border-2 border-[#4ade80] shadow-sm object-cover"
                  />
                ) : null}
                <div>
                  <p className="text-sm font-black text-white">{memberDisplayName}</p>
                  <p className="text-xs text-blue-200 font-mono">{memberEmail}</p>
                  <p className="text-[11px] text-[#4ade80] font-semibold pt-0.5">{t.agenda.passSeat}</p>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-xs mx-auto">
              {lang === 'th' ? (
                <>
                  QR Code นี้ผูกกับบัญชีสมาชิกของท่าน
                  <br className="hidden sm:inline" />
                  ใช้สแกนผ่านจุดเช็คอินของงานประชุม
                </>
              ) : (
                t.agenda.passSecurityNotice
              )}
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowPassModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 sm:py-3 rounded-xl transition cursor-pointer active:scale-95"
              >
                {t.agenda.passCloseBtn}
              </button>
              <button
                onClick={handleDownloadPass}
                className="flex-1 bg-[#0026b3] hover:bg-blue-800 text-white font-bold text-xs py-2.5 sm:py-3 rounded-xl transition cursor-pointer shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>{t.agenda.passSaveBtn}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


