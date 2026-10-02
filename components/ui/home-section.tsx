"use client";

import React, { useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { Card, CardContent } from "@/components/ui/card";

export interface CardItem {
  src?: string;
  alt?: string;
}

interface HomeSectionProps {
  cards: CardItem[];
  /** การ์ดที่อยู่ตรงกลาง (ด้านหน้าสุด) */
  activeIndex: number;
  /** กดการ์ด: การ์ดด้านข้างจะเลื่อนมาตรงกลาง, การ์ดกลางใช้เปิดดูภาพเต็ม */
  onCardClick?: (index: number) => void;
  /** ป้ายสำหรับโปรแกรมอ่านหน้าจอของการ์ดแต่ละใบ */
  getCardLabel?: (index: number) => string;
}

// ระยะห่างระหว่างการ์ด (% ของความกว้างการ์ด) และการย่อขนาดต่อระดับ
const SPREAD_PERCENT = 46;
const SCALE_STEP = 0.12;

/**
 * แถวการ์ดซ้อนแบบพัด (ดัดแปลงจาก home-section ของ 21st.dev ใช้เฉพาะส่วนแสดงภาพ)
 * เปิดครั้งแรก: การ์ดกลางเด้งขึ้นก่อน แล้วการ์ดซ้าย-ขวากางออกทีละคู่
 */
export default function HomeSection({ cards, activeIndex, onCardClick, getCardLabel }: HomeSectionProps) {
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const introTimeline = useRef<gsap.core.Timeline | null>(null);
  const shownIndex = useRef(activeIndex);

  const layoutFor = (idx: number, center: number) => {
    const offset = idx - center;
    const distance = Math.abs(offset);
    return {
      xPercent: -50 + offset * SPREAD_PERCENT,
      scale: Math.max(0.6, 1 - distance * SCALE_STEP),
      opacity: distance > 2 ? 0 : 1,
      zIndex: cards.length - distance,
    };
  };

  // อนิเมชันเปิด: กลางก่อน แล้วซ้าย-ขวาทีละคู่
  useLayoutEffect(() => {
    const els = cardRefs.current.slice(0, cards.length);
    if (els.length === 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (reduceMotion) {
        els.forEach((el, idx) => gsap.set(el, layoutFor(idx, activeIndex)));
        return;
      }

      gsap.set(els, { xPercent: -50, scale: 0.5, opacity: 0, transformOrigin: "center bottom" });
      els.forEach((el, idx) => gsap.set(el, { zIndex: layoutFor(idx, activeIndex).zIndex }));

      const tl = gsap.timeline({ defaults: { duration: 0.6, ease: "power3.out" } });
      introTimeline.current = tl;
      tl.to(els[activeIndex], { scale: 1, opacity: 1 });

      const maxOffset = Math.max(activeIndex, cards.length - 1 - activeIndex);
      for (let offset = 1; offset <= maxOffset; offset++) {
        const pair = [els[activeIndex - offset], els[activeIndex + offset]].filter(Boolean);
        tl.to(
          pair,
          {
            xPercent: (_i: number, target: HTMLDivElement) => layoutFor(els.indexOf(target), activeIndex).xPercent,
            scale: (_i: number, target: HTMLDivElement) => layoutFor(els.indexOf(target), activeIndex).scale,
            opacity: (_i: number, target: HTMLDivElement) => layoutFor(els.indexOf(target), activeIndex).opacity,
          },
          "+=0.1",
        );
      }
    });
    return () => ctx.revert();
    // เล่นครั้งเดียวตอนเปิด การเปลี่ยนการ์ดภายหลังจัดการใน effect ด้านล่าง
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  // เปลี่ยนการ์ดกลาง: หยุดอนิเมชันเปิด (ถ้ายังเล่นอยู่) แล้วเลื่อนทุกใบไปตำแหน่งใหม่
  useEffect(() => {
    if (shownIndex.current === activeIndex) return;
    shownIndex.current = activeIndex;
    introTimeline.current?.kill();
    const els = cardRefs.current.slice(0, cards.length);
    els.forEach((el, idx) => {
      const { zIndex, ...pos } = layoutFor(idx, activeIndex);
      gsap.set(el, { zIndex });
      gsap.to(el, { ...pos, duration: 0.5, ease: "power3.out", overwrite: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex]);

  return (
    <div className="relative w-full h-[min(92vw,460px)] sm:h-[420px] overflow-hidden">
      {cards.map((card, idx) => (
        <div
          key={card.src ?? idx}
          ref={(el) => {
            if (el) cardRefs.current[idx] = el;
          }}
          className="absolute left-1/2 bottom-2 will-change-transform"
          style={{ opacity: 0 }}
        >
          <button
            type="button"
            onClick={() => onCardClick?.(idx)}
            aria-label={getCardLabel?.(idx) ?? card.alt}
            aria-current={idx === activeIndex ? "true" : undefined}
            className="block cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4ade80]"
          >
            <Card
              className={`relative w-[min(60vw,300px)] sm:w-[280px] aspect-[1240/1754] bg-white overflow-hidden rounded-2xl border-4 shadow-2xl transition-colors ${
                idx === activeIndex ? "border-[#4ade80]" : "border-white"
              }`}
            >
              <CardContent className="p-0 h-full">
                {card.src && (
                  <Image
                    src={card.src}
                    alt={card.alt || `Card ${idx + 1}`}
                    fill
                    sizes="(max-width: 640px) 60vw, 280px"
                    className="object-cover object-top"
                  />
                )}
              </CardContent>
            </Card>
          </button>
        </div>
      ))}
    </div>
  );
}
