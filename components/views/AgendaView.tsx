'use client';

import React, { useState, useEffect } from 'react';
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
  ChevronUp
} from 'lucide-react';
import { ThaiSrmLogo } from '@/components/ThaiSrmLogo';
import { useLanguage } from '@/context/LanguageContext';

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
  // DAY 1 (Oct 15, 2026)
  {
    id: 'd1-s1',
    day: 1,
    time: '08:30 - 09:00',
    roomTh: 'Foyer หน้าห้อง Grand Ballroom',
    roomEn: 'Grand Ballroom Foyer',
    category: 'general',
    titleTh: 'ลงทะเบียนผู้เข้าร่วมงาน & รับสูจิบัตรและของที่ระลึก',
    titleEn: 'Registration & Welcome Morning Refreshments',
    descriptionTh: 'รับป้ายชื่อดิจิทัล, เอกสารประกอบการประชุม และชุดสูจิบัตร TSRM Annual Congress 2026',
    descriptionEn: 'Badge collection, congress bags, and morning networking reception.',
    speakers: [],
    hasCme: false
  },
  {
    id: 'd1-s2',
    day: 1,
    time: '09:00 - 10:30',
    roomTh: 'Lab Studio 1 (ชั้น 22)',
    roomEn: 'Lab Studio 1 (22nd Fl.)',
    category: 'embryology',
    titleTh: 'Hands-on Workshop 1: Next-Gen ICSI & Laser-Assisted Hatching Techniques',
    titleEn: 'Hands-on Workshop 1: Next-Gen ICSI & Laser-Assisted Hatching Techniques',
    descriptionTh: 'เจาะลึกเทคนิคการทำ ICSI ขั้นสูง และการใช้เลเซอร์ช่วยฟักตัวอ่อนเพื่อเพิ่มอัตราการฝังตัว',
    descriptionEn: 'Advanced micromanipulation techniques, piezo-ICSI, and optimized laser-assisted hatching protocols.',
    speakers: [
      {
        nameTh: 'ศ.ดร.พญ. ศิริรัตน์ กฤษณาวารินทร์',
        nameEn: 'Prof. Sirirat Krisanawarin, MD, PhD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Endocrinologist',
        institutionTh: 'คณะแพทยศาสตร์ จุฬาลงกรณ์มหาวิทยาลัย',
        institutionEn: 'Chulalongkorn University',
        avatarBg: 'from-blue-600 to-indigo-700',
        avatarInitials: 'SK'
      },
      {
        nameTh: 'Prof. David Evans',
        nameEn: 'Prof. David Evans, PhD, HCLD',
        titleTh: 'Senior Clinical Embryologist',
        titleEn: 'Senior Clinical Embryologist',
        institutionTh: 'University College London (UCL), UK',
        institutionEn: 'University College London (UCL), UK',
        avatarBg: 'from-emerald-600 to-teal-700',
        avatarInitials: 'DE'
      }
    ],
    isHighlight: true,
    hasCme: true,
    hasLiveStream: true
  },
  {
    id: 'd1-s3',
    day: 1,
    time: '10:45 - 12:15',
    roomTh: 'Lotus Ballroom (ชั้น 22)',
    roomEn: 'Lotus Ballroom (22nd Fl.)',
    category: 'surgery',
    titleTh: 'Workshop 2: 3D/4D Hysteroscopic Surgery in Infertile Patients with Uterine Anomalies',
    titleEn: 'Workshop 2: 3D/4D Hysteroscopic Surgery in Infertile Patients with Uterine Anomalies',
    descriptionTh: 'การวินิจฉัยและผ่าตัดส่องกล้องโพรงมดลูกด้วยเทคโนโลยี 3D เพื่อแก้ไขภาวะมดลูกผิดปกติและเยื่อบุโพรงมดลูกเจริญผิดที่',
    descriptionEn: 'Advanced endoscopic and hysteroscopic correction for structural uterine pathologies causing implantation failure.',
    speakers: [
      {
        nameTh: 'รศ.นพ. ธนพร ชัยวัฒนานนท์',
        nameEn: 'Assoc. Prof. Thanaporn Chaiwattananon, MD',
        titleTh: 'หัวหน้าสาขาวิชาเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Head of Reproductive Medicine Division',
        institutionTh: 'โรงพยาบาลศิริราช',
        institutionEn: 'Siriraj Hospital, Mahidol University',
        avatarBg: 'from-violet-600 to-purple-800',
        avatarInitials: 'TC'
      }
    ],
    hasCme: true
  },
  {
    id: 'd1-s4',
    day: 1,
    time: '12:15 - 13:30',
    roomTh: 'Grand Ballroom B',
    roomEn: 'Grand Ballroom B',
    category: 'symposium',
    titleTh: 'Luncheon Symposium: Optimizing Ovarian Stimulation in Poor Ovarian Responders (POR)',
    titleEn: 'Luncheon Symposium: Optimizing Ovarian Stimulation in Poor Ovarian Responders (POR)',
    descriptionTh: 'แนวทางการกระตุ้นไข่แบบเฉพาะบุคคล และการใช้ฮอร์โมนเสริมในผู้ป่วยกลุ่มตอบสนองรังไข่ต่ำตามเกณฑ์ POSEIDON',
    descriptionEn: 'Personalized stimulation strategies and adjuvant therapies for POSEIDON criteria patients.',
    speakers: [
      {
        nameTh: 'ผศ.นพ. กฤษฎา ธีรพงศ์ไพศาล',
        nameEn: 'Asst. Prof. Kritsada Theerapongpaisan, MD',
        titleTh: 'แพทย์ผู้เชี่ยวชาญด้านภาวะมีบุตรยาก',
        titleEn: 'Subfertility Specialist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'THAISRM Committee',
        avatarBg: 'from-amber-600 to-orange-700',
        avatarInitials: 'KT'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd1-s5',
    day: 1,
    time: '13:30 - 15:30',
    roomTh: 'Lab Studio 2',
    roomEn: 'Lab Studio 2',
    category: 'embryology',
    titleTh: 'Workshop 3: AI-Powered Embryo Selection: Time-Lapse Morphokinetics in Action',
    titleEn: 'Workshop 3: AI-Powered Embryo Selection: Time-Lapse Morphokinetics in Action',
    descriptionTh: 'การนำปัญญาประดิษฐ์และระบบ Time-Lapse มาใช้วิเคราะห์การแบ่งตัวของตัวอ่อนเพื่อคัดเลือกตัวอ่อนที่มีศักยภาพสูงสุด',
    descriptionEn: 'Integrating AI scoring models with continuous time-lapse incubation for non-invasive viability prediction.',
    speakers: [
      {
        nameTh: 'Dr. Kenji Sato, PhD',
        nameEn: 'Dr. Kenji Sato, PhD',
        titleTh: 'AI Bio-Informatics Lead',
        titleEn: 'AI Bio-Informatics Lead',
        institutionTh: 'Tokyo Reproductive Genetics Institute, Japan',
        institutionEn: 'Tokyo Reproductive Genetics Institute, Japan',
        avatarBg: 'from-sky-600 to-blue-800',
        avatarInitials: 'KS'
      },
      {
        nameTh: 'ดร. ประไพพิศ สิทธิโชค',
        nameEn: 'Dr. Prapaipit Sitthichok, PhD',
        titleTh: 'นักวิทยาศาสตร์เพาะเลี้ยงตัวอ่อนอาวุโส',
        titleEn: 'Senior Embryologist',
        institutionTh: 'ศูนย์รักษาผู้มีบุตรยากมาตรฐานสากล',
        institutionEn: 'THAISRM Laboratory Board',
        avatarBg: 'from-rose-600 to-pink-700',
        avatarInitials: 'PS'
      }
    ],
    isHighlight: true,
    hasCme: true,
    hasLiveStream: true
  },

  // DAY 2 (Oct 16, 2026)
  {
    id: 'd2-s1',
    day: 2,
    time: '08:45 - 09:15',
    roomTh: 'Grand Ballroom A-B',
    roomEn: 'Grand Ballroom A-B',
    category: 'general',
    titleTh: 'พิธีเปิดการประชุมวิชาการประจำปี 2569 & สุนทรพจน์นายกสมาคมฯ',
    titleEn: 'Opening Ceremony & Presidential Address: Shaping the Future of ART in Thailand',
    descriptionTh: 'พิธีเปิดอย่างเป็นทางการ พร้อมมอบโล่เกียรติคุณแก่อาจารย์อาวุโสผู้ทรงคุณวุฒิ',
    descriptionEn: 'Official opening ceremony, honorary awards, and keynote speech by THAISRM President.',
    speakers: [
      {
        nameTh: 'ศ.เกียรติคุณ นพ. สุรชัย วัฒนาวิบูลย์',
        nameEn: 'Prof. Emeritus Surachai Wattanavibul, MD',
        titleTh: 'นายกสมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        titleEn: 'President, THAISRM',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'THAISRM Association',
        avatarBg: 'from-blue-700 to-slate-900',
        avatarInitials: 'SW'
      }
    ],
    isHighlight: true,
    hasCme: true,
    hasLiveStream: true
  },
  {
    id: 'd2-s2',
    day: 2,
    time: '09:15 - 10:15',
    roomTh: 'Grand Ballroom A-B',
    roomEn: 'Grand Ballroom A-B',
    category: 'keynote',
    titleTh: 'Keynote Plenary 1: Future Horizons in Reproductive Genetics: Non-Invasive PGT & Epigenetics',
    titleEn: 'Keynote Plenary 1: Future Horizons in Reproductive Genetics: Non-Invasive PGT & Epigenetics',
    descriptionTh: 'ทิศทางใหม่ของการตรวจพันธุกรรมตัวอ่อนแบบไม่เจาะเซลล์ (niPGT) และผลกระทบของการเปลี่ยนแปลงด้าน Epigenetics ต่อทารก',
    descriptionEn: 'Revolutionary insights into non-invasive spent medium DNA testing and epigenetic programming in ART.',
    speakers: [
      {
        nameTh: 'Prof. Michael Chen, MD, PhD, FRCOG',
        nameEn: 'Prof. Michael Chen, MD, PhD, FRCOG',
        titleTh: 'Professor of Genomic Medicine',
        titleEn: 'Professor of Genomic Medicine',
        institutionTh: 'Oxford Fertility & Genomics Institute, UK',
        institutionEn: 'Oxford Fertility & Genomics Institute, UK',
        avatarBg: 'from-blue-600 to-cyan-700',
        avatarInitials: 'MC'
      }
    ],
    isHighlight: true,
    hasCme: true,
    hasLiveStream: true
  },
  {
    id: 'd2-s3',
    day: 2,
    time: '10:30 - 12:00',
    roomTh: 'Grand Ballroom A-B',
    roomEn: 'Grand Ballroom A-B',
    category: 'surgery',
    titleTh: 'Plenary Symposium: Endometrial Receptivity, Microbiome & Immune Rejection: Solving RIF',
    titleEn: 'Plenary Symposium: Endometrial Receptivity, Microbiome & Immune Rejection: Solving RIF',
    descriptionTh: 'ไขความลับภาวะตัวอ่อนไม่ฝังตัวซ้ำซ้อน (RIF) ผ่านการตรวจความพร้อมเยื่อบุโพรงมดลูก จุลชีพในโพรงมดลูก และระบบภูมิคุ้มกัน',
    descriptionEn: 'Multidisciplinary discussion on recurrent implantation failure, uterine microbiome dysbiosis, and immunotherapy.',
    speakers: [
      {
        nameTh: 'พญ. วราภรณ์ สุวรรณประสิทธิ์',
        nameEn: 'Dr. Waraporn Suwannaprasit, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านเวชศาสตร์การเจริญพันธุ์',
        titleEn: 'Reproductive Immunologist',
        institutionTh: 'โรงพยาบาลรามาธิบดี',
        institutionEn: 'Ramathibodi Hospital',
        avatarBg: 'from-teal-600 to-emerald-800',
        avatarInitials: 'WS'
      },
      {
        nameTh: 'Dr. Alan Foster, PhD',
        nameEn: 'Dr. Alan Foster, PhD',
        titleTh: 'Microbiome Research Director',
        titleEn: 'Microbiome Research Director',
        institutionTh: 'Karolinska Institute, Sweden',
        institutionEn: 'Karolinska Institute, Sweden',
        avatarBg: 'from-indigo-600 to-blue-900',
        avatarInitials: 'AF'
      }
    ],
    hasCme: true
  },
  {
    id: 'd2-s4',
    day: 2,
    time: '13:30 - 15:00',
    roomTh: 'Grand Ballroom A',
    roomEn: 'Grand Ballroom A',
    category: 'keynote',
    titleTh: 'Great Debate: Freeze-All Strategy vs Fresh Embryo Transfer: Are We Doing Too Much?',
    titleEn: 'Great Debate: Freeze-All Strategy vs Fresh Embryo Transfer: Are We Doing Too Much?',
    descriptionTh: 'การโต้วาทีทางวิชาการ: การแช่แข็งตัวอ่อนทั้งหมดช่วยเพิ่มอัตราความสำเร็จจริงหรือเป็นการเพิ่มภาระและค่าใช้จ่ายโดยไม่จำเป็น',
    descriptionEn: 'Pros and cons of universal elective freeze-all versus customized fresh transfer protocols.',
    speakers: [
      {
        nameTh: 'ศ.นพ. ชัยณรงค์ เลิศวิมลวัฒน์',
        nameEn: 'Prof. Chainarong Lertwimonwat, MD',
        titleTh: 'Team Pro Freeze-All',
        titleEn: 'Team Pro Freeze-All',
        institutionTh: 'คณะแพทยศาสตร์ มหาวิทยาลัยเชียงใหม่',
        institutionEn: 'Chiang Mai University',
        avatarBg: 'from-blue-600 to-indigo-800',
        avatarInitials: 'CL'
      },
      {
        nameTh: 'รศ.พญ. นภาพร จิตติชัยกุล',
        nameEn: 'Assoc. Prof. Naphaporn Jittichaikul, MD',
        titleTh: 'Team Customized Fresh ET',
        titleEn: 'Team Customized Fresh ET',
        institutionTh: 'คณะแพทยศาสตร์ มหาวิทยาลัยขอนแก่น',
        institutionEn: 'Khon Kaen University',
        avatarBg: 'from-purple-600 to-pink-700',
        avatarInitials: 'NJ'
      }
    ],
    isHighlight: true,
    hasCme: true
  },
  {
    id: 'd2-s5',
    day: 2,
    time: '18:30 - 21:30',
    roomTh: 'Lotus Grand Ballroom',
    roomEn: 'Lotus Grand Ballroom',
    category: 'general',
    titleTh: 'TSRM Gala Dinner & Scientific Research Awards Night 2026',
    titleEn: 'TSRM Gala Dinner & Scientific Research Awards Night 2026',
    descriptionTh: 'งานเลี้ยงสังสรรค์สมาชิก TSRM พร้อมพิธีประกาศรางวัลผลงานวิจัยยอดเยี่ยม และการแสดงดนตรีพิเศษ',
    descriptionEn: 'Networking gala dinner, Best Research Presentation Award announcements, and live entertainment.',
    speakers: [],
    isHighlight: true
  },

  // DAY 3 (Oct 17, 2026)
  {
    id: 'd3-s1',
    day: 3,
    time: '09:00 - 10:30',
    roomTh: 'Grand Ballroom A',
    roomEn: 'Grand Ballroom A',
    category: 'surgery',
    titleTh: 'Symposium: Male Infertility Innovations: Micro-TESE & Spermatogonial Stem Cell Biology',
    titleEn: 'Symposium: Male Infertility Innovations: Micro-TESE & Spermatogonial Stem Cell Biology',
    descriptionTh: 'ความก้าวหน้าในการผ่าตัดค้นหาอสุจิด้วยกล้องจุลทรรศน์ (micro-TESE) ในผู้ป่วย NOA และการฟื้นฟูเซลล์ต้นกำเนิดสร้างอสุจิ',
    descriptionEn: 'Surgical sperm retrieval optimization and emerging cellular therapies for non-obstructive azoospermia (NOA).',
    speakers: [
      {
        nameTh: 'นพ. ปริญญา วงศ์สว่างศิริ',
        nameEn: 'Dr. Parinya Wongsawangsiri, MD',
        titleTh: 'ผู้เชี่ยวชาญด้านศัลยศาสตร์ระบบปัสสาวะและบุรุษเวช',
        titleEn: 'Urologist & Andrologist',
        institutionTh: 'สมาคมเวชศาสตร์การเจริญพันธุ์ไทย',
        institutionEn: 'THAISRM Andrology Group',
        avatarBg: 'from-cyan-600 to-blue-800',
        avatarInitials: 'PW'
      }
    ],
    hasCme: true
  },
  {
    id: 'd3-s2',
    day: 3,
    time: '10:45 - 12:00',
    roomTh: 'Grand Ballroom A-B',
    roomEn: 'Grand Ballroom A-B',
    category: 'keynote',
    titleTh: 'Keynote Plenary 2: In-Vitro Gametogenesis (IVG) & Artificial Wombs: Science Fiction to Reality?',
    titleEn: 'Keynote Plenary 2: In-Vitro Gametogenesis (IVG) & Artificial Wombs: Science Fiction to Reality?',
    descriptionTh: 'การสร้างเซลล์ไข่และอสุจิจากสเต็มเซลล์ (IVG) และระบบอุ้มบุญประดิษฐ์: ข้อพิจารณาทางวิทยาศาสตร์และจริยธรรมการแพทย์',
    descriptionEn: 'Cutting-edge stem-cell-derived gametes, artificial ectogenesis models, and biomedical ethics.',
    speakers: [
      {
        nameTh: 'Prof. Elena Rossi, MD, PhD',
        nameEn: 'Prof. Elena Rossi, MD, PhD',
        titleTh: 'Chair of Regenerative Embryology',
        titleEn: 'Chair of Regenerative Embryology',
        institutionTh: 'University of Milan, Italy',
        institutionEn: 'University of Milan, Italy',
        avatarBg: 'from-violet-600 to-indigo-900',
        avatarInitials: 'ER'
      }
    ],
    isHighlight: true,
    hasCme: true,
    hasLiveStream: true
  },
  {
    id: 'd3-s3',
    day: 3,
    time: '13:15 - 14:30',
    roomTh: 'Grand Ballroom A-B',
    roomEn: 'Grand Ballroom A-B',
    category: 'general',
    titleTh: 'Oral Presentation of Best Scientific Abstracts & Young Investigator Awards',
    titleEn: 'Oral Presentation of Best Scientific Abstracts & Young Investigator Awards',
    descriptionTh: 'การนำเสนอผลงานวิจัยดีเด่น 5 อันดับแรกโดยนักวิจัยรุ่นใหม่ และการตัดสินรางวัลเกียรติยศ',
    descriptionEn: 'Top 5 research abstract presentations, live Q&A jury assessment, and Young Investigator Award ceremony.',
    speakers: [],
    hasCme: true
  },
  {
    id: 'd3-s4',
    day: 3,
    time: '14:30 - 15:00',
    roomTh: 'Grand Ballroom A-B',
    roomEn: 'Grand Ballroom A-B',
    category: 'general',
    titleTh: 'พิธีปิดการประชุม & ส่งมอบธงเจ้าภาพ TSRM Annual Congress 2027',
    titleEn: 'Closing Ceremony, CME Certificate Issuance & Handover to TSRM 2027',
    descriptionTh: 'สรุปผลการประชุม มอบเกียรติบัตร และรับเอกสารยืนยันหน่วยกิต CME ออนไลน์',
    descriptionEn: 'Official closing remarks, CME e-certificate issuance, and preview of TSRM 2027.',
    speakers: [],
    hasCme: true
  }
];

export function AgendaView() {
  const router = useRouter();
  const { lang, t } = useLanguage();

  const [selectedDay, setSelectedDay] = useState<number>(1);
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
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [showScrollTop, setShowScrollTop] = useState<boolean>(false);

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0 });

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

  // Scroll Progress and Scroll-to-Top tracking
  useEffect(() => {
    const handleScroll = () => {
      const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScrollHeight > 0) {
        const currentProgress = (window.scrollY / totalScrollHeight) * 100;
        setScrollProgress(currentProgress);
      }
      setShowScrollTop(window.scrollY > 350);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Countdown logic to Oct 15, 2026 08:30:00 GMT+7
  useEffect(() => {
    const targetDate = new Date('2026-10-15T08:30:00+07:00').getTime();

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
    } catch (e) {
      console.error('Logout error', e);
    }
    await signOut({ callbackUrl: '/login' });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredSessions = AGENDA_DATA.filter((session) => {
    if (session.day !== selectedDay) return false;
    if (filterCategory !== 'all' && session.category !== filterCategory) return false;
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchTh = session.titleTh.toLowerCase().includes(term) || session.descriptionTh.toLowerCase().includes(term);
      const matchEn = session.titleEn.toLowerCase().includes(term) || session.descriptionEn.toLowerCase().includes(term);
      const matchSpeaker = session.speakers.some(s => s.nameTh.toLowerCase().includes(term) || s.nameEn.toLowerCase().includes(term));
      return matchTh || matchEn || matchSpeaker;
    }
    return true;
  });

  const memberDisplayName = userData?.name || (lang === 'th' ? 'สมาชิกสมาคม TSRM' : 'TSRM Active Member');
  const memberEmail = userData?.email || 'member@thaisrm.or.th';

  return (
    <div className="flex-1 w-full bg-[#f8fafc] text-slate-800 font-sans pb-20 animate-fade-in overflow-x-hidden relative">
      {/* Scroll Progress Indicator Bar at Top */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 bg-slate-900/10 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-[#0026b3] via-[#0055ff] to-[#4ade80] transition-all duration-150 ease-out shadow-[0_0_10px_rgba(74,222,128,0.8)]"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 animate-slide-down backdrop-blur-md">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-[#4ade80] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
        </div>
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

      {/* Hero Header Section */}
      <section className="bg-gradient-to-br from-[#0026b3] via-[#001d8c] to-[#001460] text-white pt-8 pb-14 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-2xl">
        {/* Animated Background Glow Accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-400/25 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-[#4ade80]/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-50" />

        <div className="max-w-6xl mx-auto relative z-10 space-y-6">
          {/* Top User Bar Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl hover:border-white/25 transition-all duration-300">
            <div className="flex items-center gap-3.5 min-w-0">
              {userData?.picture && !imgError ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={userData.picture}
                  alt={memberDisplayName}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={() => setImgError(true)}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-[#4ade80] shadow-md object-cover shrink-0 hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#4ade80] to-emerald-400 text-[#0026b3] flex items-center justify-center font-black text-lg sm:text-xl shrink-0 shadow-md hover:scale-105 transition-transform duration-200">
                  {memberDisplayName.charAt(0) || 'M'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] sm:text-xs font-bold bg-[#4ade80] text-slate-900 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                    <UserCheck className="w-3 h-3" />
                    <span>{t.agenda.membershipStatus}</span>
                  </span>
                  <span className="text-[11px] text-blue-200 hidden sm:inline font-mono opacity-80">
                    ID: TSRM-2026-8891
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-extrabold text-white truncate mt-0.5 tracking-tight">
                  {memberDisplayName}
                </h2>
                <p className="text-xs text-blue-100/80 truncate font-mono">{memberEmail}</p>
              </div>
            </div>

            {/* Actions: E-Pass & Logout */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <button
                onClick={() => setShowPassModal(true)}
                className="group relative flex items-center gap-2 bg-gradient-to-r from-[#4ade80] to-emerald-400 hover:from-emerald-300 hover:to-[#4ade80] text-slate-950 font-black px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-95 cursor-pointer overflow-hidden"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/30 transform -skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-700 pointer-events-none" />
                <QrCode className="w-4 h-4 text-slate-950 stroke-[2.5] group-hover:rotate-12 transition-transform duration-200" />
                <span>{t.agenda.btnMyPass}</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-semibold px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 active:scale-95 cursor-pointer hover:border-rose-400/40"
                title={t.agenda.btnLogout}
              >
                <LogOut className="w-3.5 h-3.5 text-blue-200" />
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
                <p className="text-[11px] text-blue-200">15-17 Oct 2026 | Bangkok, Thailand</p>
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
      </section>

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
                    className={`px-3 py-2.5 sm:py-3.5 rounded-xl text-center transition-all duration-200 cursor-pointer active:scale-98 ${
                      isActive
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
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap font-bold text-[11px] sm:text-xs transition-all duration-200 cursor-pointer shrink-0 active:scale-95 ${
                    filterCategory === cat.id
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

        {/* Sessions List */}
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
                onClick={() => { setSearchTerm(''); setFilterCategory('all'); }}
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
                    className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border card-hover-effect transition-all duration-300 group ${
                      session.isHighlight
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
                            className={`p-2 rounded-xl transition-all duration-200 cursor-pointer shrink-0 active:scale-90 ${
                              isBookmarked
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
                    href="https://maps.google.com/?q=Centara+Grand+at+CentralWorld"
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

            {/* Gala Dinner & Networking Card */}
            <RevealOnScroll delay={150} direction="up">
              <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl card-hover-effect space-y-4 relative overflow-hidden group h-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500" />
                <div className="w-12 h-12 rounded-2xl bg-white/10 text-amber-300 flex items-center justify-center font-bold border border-white/15 group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-white">{t.agenda.dinnerTitle}</h3>
                  <p className="text-xs text-blue-100 leading-relaxed">{t.agenda.dinnerDesc}</p>
                </div>
                <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/15 text-xs text-[#4ade80] font-bold">
                  {t.agenda.dinnerDressCode}
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
                  🏆 Young Scientist Award: 50,000 THB Prize + Honorary Shield
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
      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-start justify-center p-4 pt-6 sm:pt-10 overflow-y-auto animate-fade-in">
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
            <div className="bg-gradient-to-b from-[#0026b3] to-[#00176b] text-white rounded-2xl p-4 sm:p-5 shadow-xl space-y-3.5 border border-blue-400/30 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/20 pb-2.5">
                <div className="text-left">
                  <span className="text-[10px] text-blue-200 font-mono block leading-tight">THAISRM 2026</span>
                  <span className="text-xs font-black text-white leading-tight">CONGRESS PASS</span>
                </div>
                <span className="bg-[#4ade80] text-slate-900 text-[10px] font-black px-2 py-0.5 rounded uppercase shadow-2xs">
                  VERIFIED
                </span>
              </div>

              {/* QR Code Container (Static & Clean for Accurate Scanning) */}
              <div className="relative inline-block mx-auto">
                <div className="bg-white p-3.5 sm:p-4 rounded-xl shadow-md ring-4 ring-[#4ade80]/40">
                  {/* SVG QR Code */}
                  <div className="w-32 h-32 sm:w-36 sm:h-36 bg-slate-950 p-2 rounded-lg flex flex-col justify-between">
                    <div className="flex justify-between">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 border-4 border-white bg-slate-950 p-1 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white" />
                      </div>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 border-4 border-white bg-slate-950 p-1 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white" />
                      </div>
                    </div>
                    <div className="flex items-center justify-center">
                      <span className="text-[8px] text-emerald-400 font-mono font-bold tracking-widest">TSRM-2026</span>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 border-4 border-white bg-slate-950 p-1 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-1 w-7 h-7 sm:w-8 sm:h-8">
                        <div className="bg-white" />
                        <div className="bg-emerald-400" />
                        <div className="bg-emerald-400" />
                        <div className="bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pass Holder Details */}
              <div className="space-y-1 text-center flex flex-col items-center">
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
                onClick={() => {
                  triggerToast(t.agenda.passSavedToast);
                  setShowPassModal(false);
                }}
                className="flex-1 bg-[#0026b3] hover:bg-blue-800 text-white font-bold text-xs py-2.5 sm:py-3 rounded-xl transition cursor-pointer shadow-sm hover:shadow-md active:scale-95"
              >
                {t.agenda.passSaveBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


