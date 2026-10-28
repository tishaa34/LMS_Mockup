'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { instituteById, type Institute, type Slot } from '@/lib/data';
import { slotInfo, type SlotInfo } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, cx, fromISO, monthLabel, toISO } from '@/lib/util';

const SLOTS: Slot[] = ['FN', 'AN'];

const STYLE: Record<SlotInfo['state'], string> = {
  available: 'border-ok/40 bg-green-50 text-ok hover:bg-green-100 cursor-pointer',
  mine: 'border-brand bg-brand text-white cursor-pointer',
  mine_pending: 'border-amber-400 bg-amber-50 text-warn cursor-pointer',
  booked: 'border-slate-200 bg-slate-100 text-slate-500 [background-image:repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(100,116,139,.12)_4px,rgba(100,116,139,.12)_8px)]',
  no_instructor: 'border-slate-200 bg-white text-slate-400 line-through',
  closed: 'hidden',
  past: 'border-transparent bg-transparent text-slate-300',
  cutoff: 'border-transparent bg-transparent text-slate-300',
};

function label(info: SlotInfo, showWho: boolean) {
  switch (info.state) {
    case 'available': return 'Open';
    case 'mine': return `Booked · S${info.booking!.sessionNo}`;
    case 'mine_pending': return `Pending · S${info.booking!.sessionNo}`;
    case 'booked': return showWho ? instituteById.get(info.booking!.instituteId)!.code : 'Booked';
    case 'no_instructor': return 'No instructor';
    case 'cutoff': return 'Closed';
    default: return '—';
  }
}

export function SlotLegend() {
  const items: [string, string][] = [
    ['Open', STYLE.available],
    ['Booked by you', STYLE.mine],
    ['Your request · pending', STYLE.mine_pending],
    ['Booked by another institute', STYLE.booked],
    ['Instructor not available', STYLE.no_instructor],
  ];
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {items.map(([l, c]) => (
        <span key={l} className={cx('rounded border px-2 py-0.5', c.replace('cursor-pointer', ''))}>{l}</span>
      ))}
    </div>
  );
}

export function SlotCalendar({ inst, onPick, showWho = false }: { inst: Institute; onPick: (date: string, slot: Slot, info: SlotInfo) => void; showWho?: boolean }) {
  const { state } = useStore();
  const t = fromISO(TODAY);
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const first = new Date(ym.y, ym.m, 1);
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // Monday-first grid
  const days = Array.from({ length: daysIn }, (_, i) => toISO(new Date(ym.y, ym.m, i + 1)));
  const shift = (d: number) => setYm(({ y, m }) => {
    const n = new Date(y, m + d, 1);
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const minMonth = ym.y === t.getFullYear() && ym.m === t.getMonth();

  const slotBtn = (date: string, slot: Slot) => {
    const info = slotInfo(state, inst, date, slot);
    if (info.state === 'closed') return null;
    const clickable = info.state === 'available' || info.state === 'mine' || info.state === 'mine_pending' || (showWho && info.state === 'booked');
    return (
      <button
        key={slot}
        disabled={!clickable}
        onClick={() => onPick(date, slot, info)}
        title={`${slot === 'FN' ? 'Forenoon 9:30–12:30' : 'Afternoon 1:30–4:30'}: ${label(info, true)}`}
        className={cx('flex w-full items-center justify-between gap-1 rounded border px-1.5 py-1 text-left text-[11px] font-medium leading-none', STYLE[info.state], !clickable && 'cursor-default')}
      >
        <span className="opacity-70">{slot}</span>
        <span className="truncate">{label(info, showWho)}</span>
      </button>
    );
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} disabled={minMonth} className="rounded-lg p-1.5 text-brand hover:bg-slate-100 disabled:opacity-30" aria-label="Previous month">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="font-semibold text-brand">{monthLabel(ym.y, ym.m)}</div>
        <button onClick={() => shift(1)} className="rounded-lg p-1.5 text-brand hover:bg-slate-100" aria-label="Next month">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Month grid on tablet/desktop */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: lead }, (_, i) => <div key={`l${i}`} />)}
          {days.map((d) => {
            const sunday = fromISO(d).getDay() === 0;
            return (
              <div key={d} className={cx('min-h-[86px] rounded-lg border p-1.5', d === TODAY ? 'border-accent' : 'border-slate-200', sunday ? 'bg-slate-50' : 'bg-white')}>
                <div className={cx('mb-1 text-xs font-semibold', d < TODAY ? 'text-slate-300' : 'text-slate-700')}>{fromISO(d).getDate()}</div>
                {sunday ? <div className="text-[11px] text-slate-400">Holiday</div> : <div className="space-y-1">{SLOTS.map((s) => slotBtn(d, s))}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda list on phones */}
      <div className="space-y-1.5 md:hidden">
        {days.filter((d) => d >= TODAY && fromISO(d).getDay() !== 0).map((d) => (
          <div key={d} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-2">
            <div className="w-16 shrink-0 text-xs font-semibold text-slate-700">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][fromISO(d).getDay()]} {fromISO(d).getDate()}
            </div>
            <div className="grid flex-1 grid-cols-2 gap-1.5">{SLOTS.map((s) => slotBtn(d, s))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
