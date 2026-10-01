'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { navGroups, type AdminTab } from '@/components/AdminNavbar';

/** หาชื่อกลุ่มเมนู ชื่อเมนู และไอคอนจากเมนูด้านข้าง เพื่อให้ส่วนหัวตรงกับเมนูเสมอ */
function findNavMeta(tab: AdminTab) {
  for (const group of navGroups) {
    const item = group.items.find((i) => i.id === tab);
    if (item) return { group: group.title, title: item.labelTh, icon: item.icon };
  }
  return null;
}

export interface AdminPageHeaderProps {
  /** เมนูที่หน้านี้สังกัด ใช้ดึงชื่อกลุ่ม ชื่อหน้า และไอคอนอัตโนมัติ */
  tab: AdminTab;
  /** ใช้แทนชื่อเมนู ถ้าต้องการชื่อหน้าที่ต่างจากเมนู */
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType;
  /** ปุ่มคำสั่งด้านขวา ใช้ HeaderButton */
  actions?: React.ReactNode;
  /** แถบด้านล่างของส่วนหัว เช่น ตัวเลขสรุป (HeaderStat) หรือแท็บกรอง (HeaderTabs) */
  children?: React.ReactNode;
}

/** ส่วนหัวมาตรฐานของทุกหน้าในระบบผู้ดูแล */
export function AdminPageHeader({ tab, title, description, icon, actions, children }: AdminPageHeaderProps) {
  const meta = findNavMeta(tab);
  const Icon = icon || meta?.icon;

  return (
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0026b3] via-[#0022a1] to-[#001c8c] text-white shadow-xl shadow-[#0026b3]/10">
      <div className="absolute -top-16 -right-16 w-56 h-56 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/4 w-56 h-56 bg-[#4ade80]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4 min-w-0">
          {Icon && (
            <div className="hidden sm:flex w-14 h-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 border border-white/25 backdrop-blur-sm">
              <Icon className="w-7 h-7 text-[#4ade80]" />
            </div>
          )}
          <div className="min-w-0 space-y-1.5">
            {meta && (
              <nav aria-label="ตำแหน่งหน้า" className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-blue-200/80 flex-wrap">
                <span>ผู้ดูแลระบบ</span>
                <ChevronRight className="w-3 h-3 text-blue-300/60" />
                <span>{meta.group}</span>
                <ChevronRight className="w-3 h-3 text-blue-300/60" />
                <span aria-current="page" className="text-[#4ade80]">
                  {meta.title}
                </span>
              </nav>
            )}
            <h1 className="text-2xl sm:text-[28px] font-black tracking-tight leading-tight text-white text-balance">
              {title || meta?.title}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed font-medium max-w-3xl text-pretty">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
      </div>

      {children && (
        <div className="relative z-10 border-t border-white/15 bg-black/10 px-5 sm:px-7 py-4">{children}</div>
      )}
    </header>
  );
}

type HeaderButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ElementType;
  variant?: 'primary' | 'secondary';
};

/** ปุ่มบนส่วนหัว: primary = สีเขียวเน้น, secondary = ปุ่มโปร่งแสง */
export function HeaderButton({ icon: Icon, variant = 'secondary', className = '', children, ...rest }: HeaderButtonProps) {
  const base =
    'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';
  const style =
    variant === 'primary'
      ? 'bg-[#4ade80] hover:bg-[#3ecb72] text-slate-950 font-black shadow-lg shadow-[#4ade80]/20'
      : 'bg-white/15 hover:bg-white/25 text-white border border-white/25 backdrop-blur-md';
  return (
    <button type="button" className={`${base} ${style} ${className}`} {...rest}>
      {Icon && <Icon className={`w-4 h-4 ${variant === 'primary' ? 'text-slate-950' : 'text-[#4ade80]'}`} />}
      {children}
    </button>
  );
}

/** ตัวเลขสรุปในแถบล่างของส่วนหัว */
export function HeaderStat({ label, value, hint }: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] sm:text-xs font-bold text-blue-200 truncate">{label}</div>
      <div className="flex items-baseline gap-1.5 mt-0.5">
        <span className="text-lg sm:text-xl font-black text-white tabular-nums">{value}</span>
        {hint && <span className="text-[11px] sm:text-xs font-semibold text-blue-200/80 truncate">{hint}</span>}
      </div>
    </div>
  );
}

/** แถวตัวเลขสรุป จัดเป็นกริดตามจำนวน */
export function HeaderStats({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">{children}</div>;
}

/** แท็บกรองบนส่วนหัว */
export function HeaderTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: React.ReactNode; count?: number; icon?: React.ElementType }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              active
                ? 'bg-white text-[#0026b3] shadow-md'
                : 'bg-white/10 text-blue-50 border border-white/15 hover:bg-white/20'
            }`}
          >
            {Icon && <Icon className={`w-4 h-4 ${active ? 'text-[#0026b3]' : 'text-[#4ade80]'}`} />}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`ml-0.5 min-w-5 px-1.5 py-0.5 rounded-md text-[10px] font-black tabular-nums ${
                  active ? 'bg-[#0026b3] text-white' : 'bg-white/15 text-white'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
