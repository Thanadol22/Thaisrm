"use client";

import * as React from "react";
import Image from "next/image";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";

interface SmoothScrollHeroProps {
  /** ระยะเลื่อน (px) ที่ภาพค้างอยู่และซูมเข้า ก่อนเนื้อหาถัดไปเลื่อนขึ้นมา */
  scrollHeight?: number;
  imageSrc: string;
  imageAlt: string;
  /** สเกลสุดท้ายของภาพเมื่อเลื่อนจนสุดช่วง (1 = ไม่ซูม) */
  maxZoom?: number;
  /** จุดโฟกัสของภาพ (object-position) เพื่อให้จุดเด่นอยู่กลางจอบนมือถือ */
  objectPosition?: string;
  /** เนื้อหาที่ลอยอยู่บนภาพ (หัวข้อ ปุ่ม ฯลฯ) จัดชิดด้านล่าง */
  children?: React.ReactNode;
}

/**
 * Hero ภาพเต็มจอแบบ sticky: เริ่มเป็นภาพเต็มไม่มีขอบ แล้วซูมเข้าตามการเลื่อน
 * พร้อมเงาไล่จากด้านล่างให้ข้อความอ่านง่าย
 */
const SmoothScrollHero: React.FC<SmoothScrollHeroProps> = ({
  scrollHeight = 700,
  imageSrc,
  imageAlt,
  maxZoom = 1.35,
  objectPosition = "50% 40%",
  children,
}) => {
  const sectionRef = React.useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const travel = reduceMotion ? 0 : scrollHeight;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const scale = useTransform(scrollYProgress, [0, 1], [1, reduceMotion ? 1 : maxZoom]);
  const dim = useTransform(scrollYProgress, [0, 1], [0, 0.45]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.55, 0.85], [1, 1, 0]);

  return (
    <section
      ref={sectionRef}
      style={{ height: `calc(${travel}px + 100svh)` }}
      className="relative w-full bg-slate-950"
    >
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0 will-change-transform"
          style={{ scale }}
        >
          <Image
            src={imageSrc}
            alt={imageAlt}
            fill
            preload
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition }}
          />
        </motion.div>

        {/* มืดลงทีละน้อยเมื่อเลื่อน */}
        <motion.div
          aria-hidden="true"
          className="absolute inset-0 bg-slate-950 pointer-events-none"
          style={{ opacity: dim }}
        />
        {/* เงาด้านบนบาง ๆ และเงาไล่จากด้านล่าง */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-950/50 to-transparent pointer-events-none"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-[75%] bg-gradient-to-t from-slate-950 via-slate-950/65 to-transparent pointer-events-none"
        />

        <motion.div
          className="relative z-10 h-full"
          style={{ y: contentY, opacity: contentOpacity }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
};

export default SmoothScrollHero;
