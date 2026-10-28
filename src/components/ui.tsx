'use client';
import { AlertTriangle, CheckCircle2, Circle, X, XCircle, type LucideIcon } from 'lucide-react';
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react';
import type { Light } from '@/lib/logic';
import { cx } from '@/lib/util';

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

type BtnVariant = 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
export function Button({ variant = 'primary', size = 'md', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-brand text-white hover:bg-brand-600',
    accent: 'bg-accent text-white hover:bg-accent-700',
    outline: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
    danger: 'bg-bad text-white hover:bg-red-800',
  };
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        v[variant],
        className,
      )}
    />
  );
}

export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx('w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-100', p.className)} />;
}
export function Select({ children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...p} className={cx('rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand', p.className)}>
      {children}
    </select>
  );
}
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx('w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand', p.className)} />;
}
export function Field({ label, children, hint, dark }: { label: string; children: ReactNode; hint?: string; dark?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className={cx('text-xs font-medium', dark ? 'text-brand-200' : 'text-slate-600')}>{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

const LIGHT: Record<Light, { cls: string; Icon: LucideIcon }> = {
  good: { cls: 'bg-green-50 text-ok ring-green-200', Icon: CheckCircle2 },
  warn: { cls: 'bg-amber-50 text-warn ring-amber-200', Icon: AlertTriangle },
  bad: { cls: 'bg-red-50 text-bad ring-red-200', Icon: XCircle },
  none: { cls: 'bg-slate-50 text-slate-500 ring-slate-200', Icon: Circle },
};
/** Status is always icon + label, never colour alone. */
export function Status({ light, children, title }: { light: Light; children: ReactNode; title?: string }) {
  const { cls, Icon } = LIGHT[light];
  return (
    <span title={title} className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1', cls)}>
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'brand' | 'accent' }) {
  const t = { slate: 'bg-slate-100 text-slate-700', brand: 'bg-brand-100 text-brand', accent: 'bg-accent-50 text-accent-700' }[tone];
  return <span className={cx('inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium', t)}>{children}</span>;
}

export function StatTile({ label, value, sub, light, icon: Icon }: { label: string; value: ReactNode; sub?: ReactNode; light?: Light; icon?: LucideIcon }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-slate-400" aria-hidden />}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{light ? <Status light={light}>{sub}</Status> : sub}</div>}
    </div>
  );
}

export function Progress({ value, light = 'good' }: { value: number; light?: Light }) {
  const c = { good: 'bg-ok', warn: 'bg-amber-500', bad: 'bg-bad', none: 'bg-slate-300' }[light];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx('h-full rounded-full', c)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-brand">{title}</h1>
        {sub && <p className="mt-0.5 text-sm text-slate-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; count?: number }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cx(
            '-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
            value === t.id ? 'border-accent text-brand' : 'border-transparent text-slate-500 hover:text-slate-800',
          )}
        >
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-semibold text-brand">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cx('border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-4', className)}>{children}</th>
);
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cx('border-b border-slate-100 px-3 py-2 align-middle first:pl-4', className)}>{children}</td>
);

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">{children}</div>;
}

export function Note({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand">{children}</div>;
}
