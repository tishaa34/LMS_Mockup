'use client';
import { Check, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Empty, Note, PageHeader } from '@/components/ui';
import { MODULES, SLOT_LABEL, TOTAL_SESSIONS, instituteById, sessionModules } from '@/lib/data';
import { bookingEvent, getStudents, isPresent, patchBooking } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, cx, fmtDay } from '@/lib/util';

export default function RollCallPage() {
  return (
    <AppShell roles={['INSTRUCTOR', 'ADMIN']}>
      <Suspense>
        <RollCall />
      </Suspense>
    </AppShell>
  );
}

function RollCall() {
  const { state, update, session, toast } = useStore();
  const router = useRouter();
  const b = state.bookings.find((x) => x.id === useSearchParams().get('booking'));
  const students = b ? getStudents(state, b.instituteId).filter((x) => x.status === 'ENROLLED') : [];
  // New roll calls start with everyone present: the instructor only taps absentees.
  const [absent, setAbsent] = useState<Set<string>>(() =>
    new Set(b && b.attendanceMarked ? students.filter((st) => !isPresent(state, b, st)).map((st) => st.id) : []),
  );
  const [topics, setTopics] = useState<Set<string>>(() => new Set(b ? (b.topics.length ? b.topics : sessionModules(b.sessionNo)) : []));

  if (!b || (session!.role === 'INSTRUCTOR' && b.instructorId !== session!.refId)) return <Empty>Session not found.</Empty>;
  if (b.date > TODAY) return <Empty>This session is on {fmtDay(b.date)}. Roll call opens on the day.</Empty>;
  const inst = instituteById.get(b.instituteId)!;

  const toggle = (id: string) => setAbsent((cur) => {
    const n = new Set(cur);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const save = () => {
    update((s) => {
      const attendance = { ...s.attendance };
      for (const st of students) attendance[`${b.id}|${st.id}`] = !absent.has(st.id);
      return patchBooking({ ...s, attendance }, b.id, { attendanceMarked: true, topics: MODULES.filter((m) => topics.has(m)) },
        bookingEvent(session!.name, 'ATTENDANCE', `${students.length - absent.size}/${students.length} present`));
    });
    toast(`Attendance saved: ${students.length - absent.size} present, ${absent.size} absent`);
    router.push(session!.role === 'INSTRUCTOR' ? '/dashboard/' : `/institute/?id=${inst.id}&tab=training`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/sessions" className="mb-2 inline-block text-xs font-medium text-accent hover:underline">← My sessions</Link>
      <PageHeader title="Roll call" sub={`${inst.code} · ${inst.name} · Session ${b.sessionNo}/${TOTAL_SESSIONS} · ${fmtDay(b.date)} · ${SLOT_LABEL[b.slot]}`} />
      <div className="mb-4"><Note>Everyone starts as present. Tap a student to mark them absent.</Note></div>

      <div className="sticky top-14 z-10 -mx-4 mb-3 flex items-center justify-between gap-2 border-b border-slate-200 bg-[#F8F9FD]/95 px-4 py-2 backdrop-blur">
        <div className="text-sm">
          <b className="text-ok">{students.length - absent.size}</b> present · <b className="text-bad">{absent.size}</b> absent · {students.length} enrolled
        </div>
        <Button variant="accent" onClick={save}>Save attendance</Button>
      </div>

      <Card>
        <ul className="grid gap-2 sm:grid-cols-2">
          {students.map((st) => {
            const isAbs = absent.has(st.id);
            return (
              <li key={st.id}>
                <button
                  onClick={() => toggle(st.id)}
                  className={cx('flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition', isAbs ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50')}
                >
                  <span className={cx('flex h-7 w-7 shrink-0 items-center justify-center rounded-full', isAbs ? 'bg-bad text-white' : 'bg-green-100 text-ok')}>
                    {isAbs ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{st.name}</span>
                    <span className="text-xs text-slate-500">{st.rollNo} · Team {st.teamNo}</span>
                  </span>
                  <span className={cx('text-xs font-semibold', isAbs ? 'text-bad' : 'text-ok')}>{isAbs ? 'Absent' : 'Present'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card title="Topics covered in this session" className="mt-4">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {MODULES.map((m) => (
            <label key={m} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#2C2872]"
                checked={topics.has(m)}
                onChange={() => setTopics((cur) => { const n = new Set(cur); if (n.has(m)) n.delete(m); else n.add(m); return n; })}
              />
              {m}
              {sessionModules(b.sessionNo).includes(m) && <span className="text-[10px] font-semibold uppercase text-accent">planned</span>}
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
