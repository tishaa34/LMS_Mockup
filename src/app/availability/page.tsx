'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Card, Field, Note, PageHeader, Select } from '@/components/ui';
import { departments, instituteById, instructors, type Slot } from '@/lib/data';
import { can } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, cx, fromISO, monthLabel, toISO } from '@/lib/util';

export default function AvailabilityPage() {
  return (
    <AppShell roles={['ADMIN', 'DEPARTMENT', 'INSTRUCTOR']}>
      <Availability />
    </AppShell>
  );
}

function Availability() {
  const { state, update, session, toast } = useStore();
  const role = session!.role;
  const list = useMemo(
    () => (role === 'ADMIN' ? instructors : role === 'DEPARTMENT' ? instructors.filter((i) => i.departmentId === session!.refId) : instructors.filter((i) => i.id === session!.refId)),
    [role, session],
  );
  const [insId, setInsId] = useState(list[0].id);
  const ins = instructors.find((i) => i.id === insId)!;
  const editable = can(role, 'manageAvailability') || (can(role, 'editOwnAvailability') && insId === session!.refId);

  const t = fromISO(TODAY);
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const daysIn = new Date(ym.y, ym.m + 1, 0).getDate();
  const lead = (new Date(ym.y, ym.m, 1).getDay() + 6) % 7;
  const days = Array.from({ length: daysIn }, (_, i) => toISO(new Date(ym.y, ym.m, i + 1)));
  const shift = (d: number) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });

  const bookingAt = (date: string, slot: Slot) => state.bookings.find((b) => b.instructorId === insId && b.date === date && b.slot === slot && b.status !== 'CANCELLED');
  const off = (date: string, slot: Slot) => !!state.leave[`${insId}|${date}|${slot}`];
  const toggle = (date: string, slot: Slot) => {
    const key = `${insId}|${date}|${slot}`;
    update((s) => ({ ...s, leave: { ...s.leave, [key]: !s.leave[key] } }));
  };
  const toggleDay = (date: string) => {
    const allOff = off(date, 'FN') && off(date, 'AN');
    if (bookingAt(date, 'FN') || bookingAt(date, 'AN')) return toast('This day has a booked session. Reschedule it first from Training Bookings.', 'error');
    update((s) => ({ ...s, leave: { ...s.leave, [`${insId}|${date}|FN`]: !allOff, [`${insId}|${date}|AN`]: !allOff } }));
  };

  const monthDays = days.filter((d) => d >= TODAY && fromISO(d).getDay() !== 0);
  const slotsTotal = monthDays.length * 2;
  const slotsBooked = monthDays.reduce((a, d) => a + (bookingAt(d, 'FN') ? 1 : 0) + (bookingAt(d, 'AN') ? 1 : 0), 0);
  const slotsOff = monthDays.reduce((a, d) => a + (off(d, 'FN') && !bookingAt(d, 'FN') ? 1 : 0) + (off(d, 'AN') && !bookingAt(d, 'AN') ? 1 : 0), 0);

  return (
    <>
      <PageHeader title={role === 'INSTRUCTOR' ? 'My Availability' : 'Instructor Availability'} sub="Institutes can only book slots where their instructor is available" />
      <Card>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          {list.length > 1 ? (
            <Field label="Instructor">
              <Select value={insId} onChange={(e) => setInsId(e.target.value)} className="min-w-[280px]">
                {departments.filter((d) => list.some((i) => i.departmentId === d.id)).map((d) => (
                  <optgroup key={d.id} label={`${d.code} · ${d.name}`}>
                    {list.filter((i) => i.departmentId === d.id).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </optgroup>
                ))}
              </Select>
            </Field>
          ) : (
            <div className="text-sm font-semibold text-slate-800">{ins.name}</div>
          )}
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span><b className="text-ok">{slotsTotal - slotsBooked - slotsOff}</b> open slots</span>
            <span><b className="text-brand">{slotsBooked}</b> booked</span>
            <span><b className="text-slate-500">{slotsOff}</b> unavailable</span>
            <span className="text-slate-400">(rest of {monthLabel(ym.y, ym.m)})</span>
          </div>
        </div>
        <div className="mb-3">
          <Note>
            {editable
              ? 'Click a slot to mark yourself available or unavailable. Click the date number to toggle the whole day. Booked slots are locked; reschedule them first.'
              : 'View only. Instructors and the Super Admin manage availability.'}
          </Note>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <button onClick={() => shift(-1)} className="rounded-lg p-1.5 text-brand hover:bg-slate-100" aria-label="Previous month"><ChevronLeft className="h-5 w-5" /></button>
          <div className="font-semibold text-brand">{monthLabel(ym.y, ym.m)}</div>
          <button onClick={() => shift(1)} className="rounded-lg p-1.5 text-brand hover:bg-slate-100" aria-label="Next month"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-500">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: lead }, (_, i) => <div key={i} />)}
              {days.map((d) => {
                const sunday = fromISO(d).getDay() === 0;
                const past = d < TODAY;
                return (
                  <div key={d} className={cx('min-h-[80px] rounded-lg border p-1.5', d === TODAY ? 'border-accent' : 'border-slate-200', sunday || past ? 'bg-slate-50' : 'bg-white')}>
                    <button
                      disabled={!editable || sunday || past}
                      onClick={() => toggleDay(d)}
                      className={cx('mb-1 text-xs font-semibold', past ? 'text-slate-300' : 'text-slate-700', editable && !sunday && !past && 'hover:text-accent')}
                    >
                      {fromISO(d).getDate()}
                    </button>
                    {sunday ? (
                      <div className="text-[11px] text-slate-400">Holiday</div>
                    ) : (
                      <div className="space-y-1">
                        {(['FN', 'AN'] as Slot[]).map((slot) => {
                          const b = bookingAt(d, slot);
                          const isOff = off(d, slot);
                          return (
                            <button
                              key={slot}
                              disabled={!editable || past || !!b}
                              onClick={() => toggle(d, slot)}
                              className={cx(
                                'flex w-full items-center justify-between rounded border px-1.5 py-1 text-[11px] font-medium leading-none',
                                b ? 'border-brand bg-brand text-white' : isOff ? 'border-slate-200 bg-slate-100 text-slate-400 line-through' : 'border-ok/40 bg-green-50 text-ok',
                                past && 'opacity-50',
                              )}
                            >
                              <span className="opacity-70">{slot}</span>
                              <span className="truncate">{b ? instituteById.get(b.instituteId)!.code : isOff ? 'Unavailable' : 'Available'}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
