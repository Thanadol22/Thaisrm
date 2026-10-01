'use client';

/**
 * ชุดส่วนประกอบมาตรฐานของหน้าผู้ดูแลระบบ
 * ลำดับหน้า: AdminPageHeader → ContextBar → StatGrid → Toolbar → Panel
 */

import React from 'react';
import { Search, X, ChevronDown, Inbox } from 'lucide-react';

type Tone = 'blue' | 'green' | 'amber' | 'rose' | 'violet' | 'slate';

const TONE_ICON: Record<Tone, string> = {
  blue: 'bg-blue-50 text-[#0026b3] border-blue-100',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
};

const TONE_VALUE: Record<Tone, string> = {
  blue: 'text-slate-900',
  green: 'text-emerald-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  violet: 'text-violet-700',
  slate: 'text-slate-900',
};

const TONE_ACTIVE: Record<Tone, string> = {
  blue: 'border-[#0026b3] ring-2 ring-[#0026b3]/15',
  green: 'border-emerald-500 ring-2 ring-emerald-500/15',
  amber: 'border-amber-400 ring-2 ring-amber-400/20',
  rose: 'border-rose-400 ring-2 ring-rose-400/20',
  violet: 'border-violet-400 ring-2 ring-violet-400/20',
  slate: 'border-slate-400 ring-2 ring-slate-400/15',
};

/* ─── ปุ่ม ──────────────────────────────────────────────────────────── */

type BtnVariant = 'primary' | 'secondary' | 'soft' | 'success' | 'warning' | 'danger' | 'ghost';

const BTN_VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-[#0026b3] hover:bg-[#001c8c] text-white shadow-sm shadow-[#0026b3]/20',
  secondary: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs',
  soft: 'bg-blue-50 hover:bg-blue-100 text-[#0026b3] border border-blue-200',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  warning: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200',
  danger: 'bg-white hover:bg-rose-50 text-rose-600 border border-rose-200',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
};

const BTN_SIZE = {
  sm: 'gap-1.5 px-3 py-1.5 text-xs rounded-lg',
  md: 'gap-2 px-4 py-2.5 text-xs sm:text-sm rounded-xl',
};

export type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant;
  size?: keyof typeof BTN_SIZE;
  icon?: React.ElementType;
  loading?: boolean;
};

export function Btn({ variant = 'secondary', size = 'md', icon: Icon, loading, className = '', children, disabled, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-bold whitespace-nowrap transition active:scale-[0.97] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${BTN_SIZE[size]} ${BTN_VARIANT[variant]} ${className}`}
      {...rest}
    >
      {loading ? (
        <span className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} rounded-full border-2 border-current border-t-transparent animate-spin`} />
      ) : (
        Icon && <Icon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
      )}
      {children}
    </button>
  );
}

/** ปุ่มไอคอนอย่างเดียว สำหรับแถวตาราง */
export function IconBtn({
  icon: Icon,
  label,
  tone = 'slate',
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: React.ElementType; label: string; tone?: Tone }) {
  const hover: Record<Tone, string> = {
    blue: 'hover:text-[#0026b3] hover:bg-blue-50 hover:border-blue-200',
    green: 'hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200',
    amber: 'hover:text-amber-700 hover:bg-amber-50 hover:border-amber-200',
    rose: 'hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200',
    violet: 'hover:text-violet-700 hover:bg-violet-50 hover:border-violet-200',
    slate: 'hover:text-slate-900 hover:bg-slate-100 hover:border-slate-300',
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-500 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${hover[tone]} ${className}`}
      {...rest}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

/* ─── กล่องเนื้อหา ─────────────────────────────────────────────────── */

export function Panel({
  title,
  description,
  icon: Icon,
  tone = 'blue',
  actions,
  footer,
  padded = true,
  className = '',
  children,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** false เมื่อเนื้อหาเป็นตารางเต็มกว้าง */
  padded?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const hasHead = title || actions;
  return (
    <section className={`bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden ${className}`}>
      {hasHead && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={`p-2 rounded-xl border shrink-0 ${TONE_ICON[tone]}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
            )}
            <div className="min-w-0">
              {title && <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">{title}</h2>}
              {description && <p className="text-xs text-slate-500 mt-0.5 text-pretty">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}
      {children !== undefined && children !== null && children !== false && (
        <div className={padded ? 'p-4 sm:p-5' : ''}>{children}</div>
      )}
      {footer && <div className="px-4 sm:px-5 py-3 border-t border-slate-100 bg-slate-50/60">{footer}</div>}
    </section>
  );
}

/** หัวข้อกลุ่มย่อยระหว่าง Panel */
export function SectionTitle({
  title,
  description,
  icon: Icon,
  tone = 'blue',
  count,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  count?: number;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={`p-2 rounded-xl border shrink-0 ${TONE_ICON[tone]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
            {title}
            {typeof count === 'number' && <span className="ml-1.5 text-slate-400 font-bold">({count})</span>}
          </h2>
          {description && <p className="text-xs text-slate-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

/* ─── การ์ดตัวเลขสรุป ───────────────────────────────────────────────── */

export function StatGrid({ cols = 4, children }: { cols?: 3 | 4 | 5; children: React.ReactNode }) {
  const c = cols === 5 ? 'lg:grid-cols-5' : cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
  return <div className={`grid grid-cols-2 ${c} gap-3 sm:gap-4`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'blue',
  active,
  onClick,
  children,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  unit?: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ElementType;
  tone?: Tone;
  /** ใช้กับการ์ดที่กดเพื่อกรองได้ */
  active?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  const clickable = !!onClick;
  const Tag = clickable ? 'button' : 'div';
  return (
    <Tag
      type={clickable ? 'button' : undefined}
      onClick={onClick}
      className={`text-left w-full min-w-0 flex flex-col p-4 sm:p-5 rounded-2xl bg-white border shadow-xs transition ${
        active ? TONE_ACTIVE[tone] : 'border-slate-200/90'
      } ${clickable ? 'cursor-pointer hover:shadow-md hover:border-slate-300' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold text-slate-500 leading-snug">{label}</span>
        {Icon && (
          <span className={`p-2 rounded-xl border shrink-0 ${TONE_ICON[tone]}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5 mt-2 min-w-0">
        <span className={`text-xl sm:text-2xl font-black tracking-tight tabular-nums truncate ${TONE_VALUE[tone]}`}>{value}</span>
        {unit && <span className="text-xs font-semibold text-slate-500 shrink-0">{unit}</span>}
      </div>
      {hint && <div className="text-[11px] sm:text-xs text-slate-500 font-medium mt-1 truncate">{hint}</div>}
      {children}
    </Tag>
  );
}

/* ─── แถบค้นหาและตัวกรอง ─────────────────────────────────────────────── */

/** กล่องแถบเครื่องมือ: ช่องค้นหาซ้าย ตัวกรองขวา แถวล่างใส่ chips ได้ */
export function Toolbar({ children, bottom }: { children: React.ReactNode; bottom?: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-3 sm:p-4 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">{children}</div>
      {bottom && <div className="pt-3 border-t border-slate-100">{bottom}</div>}
    </div>
  );
}

/** ใส่ตัวกรองชิดขวาใน Toolbar */
export function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 lg:ml-auto">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'ค้นหา...',
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative flex-1 min-w-0 lg:max-w-md ${className}`}>
      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-9 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] transition"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="ล้างคำค้นหา"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

/** dropdown ตัวกรองในแถบเครื่องมือ */
export function FilterSelect({
  value,
  onChange,
  options,
  icon: Icon,
  label,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ElementType;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {Icon && <Icon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        title={label}
        className={`w-full appearance-none bg-white border border-slate-200 rounded-xl ${Icon ? 'pl-9' : 'pl-3.5'} pr-9 h-10 text-xs sm:text-sm font-bold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] cursor-pointer transition`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  );
}

/** ปุ่มกลุ่มสลับตัวเลือก (สถานะ, มุมมอง) */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { id: T; label: React.ReactNode; count?: number; icon?: React.ElementType }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex items-center gap-1 p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto max-w-full ${className}`}>
      {options.map((opt) => {
        const active = opt.id === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-[13px] font-bold whitespace-nowrap transition cursor-pointer ${
              active ? 'bg-white text-[#0026b3] shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{opt.label}</span>
            {typeof opt.count === 'number' && (
              <span
                className={`min-w-5 px-1.5 py-px rounded-md text-[10px] font-black tabular-nums ${
                  active ? 'bg-[#0026b3] text-white' : 'bg-slate-200 text-slate-600'
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

/** แถบเลือกรอบการประชุมที่ใช้ร่วมหลายหน้า */
export function ContextBar({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ElementType;
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2.5 rounded-xl bg-blue-50 text-[#0026b3] border border-blue-100 shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-extrabold text-slate-800 flex items-center gap-2 flex-wrap">{label}</div>
          {description && <div className="text-xs text-slate-500 mt-0.5 truncate">{description}</div>}
        </div>
      </div>
      <div className="w-full md:w-auto md:min-w-[320px] shrink-0">{children}</div>
    </div>
  );
}

/* ─── สถานะว่าง ─────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6 gap-2">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-1">
        <Icon className="w-6 h-6" />
      </div>
      <div className="text-sm sm:text-base font-bold text-slate-800">{title}</div>
      {description && <p className="text-xs text-slate-500 max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/* ─── ฟอร์ม ─────────────────────────────────────────────────────────── */

export const inputCls =
  'w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0026b3]/20 focus:border-[#0026b3] disabled:bg-slate-50 disabled:text-slate-500 transition';

export function Field({
  label,
  hint,
  required,
  children,
  className = '',
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="block text-xs font-bold text-slate-700">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500 leading-relaxed">{hint}</span>}
    </label>
  );
}

/** แถบปุ่มบันทึกท้ายฟอร์ม ติดขอบล่างจอเมื่อเลื่อน */
export function FormActionBar({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-xs text-slate-500 min-w-0">{note}</div>
      <div className="flex flex-wrap items-center gap-2 justify-end">{children}</div>
    </div>
  );
}
