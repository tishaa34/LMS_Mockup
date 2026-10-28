'use client';
import { CalendarCheck, CheckCircle2, ClipboardCheck, Package, Users } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { AppShell } from '@/components/AppShell';
import { Overview } from '@/components/Overview';
import { StudentProgressView } from '@/components/StudentProgress';
import { Badge, Button, Card, Empty, PageHeader, Progress, StatTile, Status } from '@/components/ui';
import { SLOT_LABEL, TARGET_BATCH, TOTAL_SESSIONS, deptById, instituteById, instructorById } from '@/lib/data';
import { bookingView, findStudent, scopedInstitutes, summarize, type InstituteSummary } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, fmtDate, fmtDay, pct } from '@/lib/util';

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const { session } = useStore();
  const scope = useMemo(() => scopedInstitutes(session!), [session]);
  switch (session!.role) {
    case 'ADMIN':
      return (
        <>
          <PageHeader title="KCG Program Dashboard" sub="Live status of all 500 institutes across 25 departments" />
          <Overview scope={scope} title="all institutes" />
        </>
      );
    case 'DEPARTMENT': {
      const d = deptById.get(session!.refId)!;
      return (
        <>
          <PageHeader title={`${d.code} · ${d.name} Department`} sub={`${scope.length} institutes · Department Coordinator view`} />
          <Overview scope={scope} title={d.name} />
        </>
      );
    }
    case 'INSTRUCTOR':
      return <InstructorDashboard />;
    case 'INSTITUTE':
      return <InstituteDashboard />;
    case 'STUDENT':
      return <StudentDashboard />;
  }
}

function InstructorDashboard() {
  const { state, session } = useStore();
  const me = instructorById.get(session!.refId)!;
  const mine = state.bookings
    .filter((b) => b.instructorId === me.id && b.status !== 'CANCELLED')
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  const today = mine.filter((b) => b.date === TODAY && b.status === 'CONFIRMED');
  const upcoming = mine.filter((b) => b.date > TODAY).slice(0, 8);
  const missing = mine.filter((b) => b.date < TODAY && b.status === 'CONFIRMED' && !b.attendanceMarked);
  const sums = scopedInstitutes(session!).map((i) => summarize(state, i.id));
  const reviewsPending = sums.reduce((a, s) => a + (s.training !== 'Not scheduled' ? 8 - s.reviewed - s.corrections : 0), 0);
  const marksPending = sums.filter((s) => s.marksLight === 'bad');

  return (
    <>
      <PageHeader title={`Welcome, ${me.name.split(' ')[0]}`} sub={`Instructor · ${deptById.get(me.departmentId)!.name} Department · ${sums.length} institutes assigned`} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sessions today" value={today.length} icon={CalendarCheck} />
        <StatTile label="Attendance not marked" value={missing.length} sub={missing.length ? 'Past sessions' : 'All up to date'} light={missing.length ? 'bad' : 'good'} icon={ClipboardCheck} />
        <StatTile label="Projects to check" value={reviewsPending} icon={CheckCircle2} />
        <StatTile label="Institutes with marks pending" value={marksPending.length} light={marksPending.length ? 'bad' : 'good'} sub={marksPending.length ? 'Training done, marks missing' : 'None'} icon={Users} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card title="Today's sessions">
          {today.length === 0 ? (
            <Empty>No sessions today.</Empty>
          ) : (
            <ul className="space-y-3">
              {today.map((b) => {
                const inst = instituteById.get(b.instituteId)!;
                return (
                  <li key={b.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-slate-800">{inst.name}</div>
                        <div className="text-xs text-slate-500">
                          {inst.code} · Session {b.sessionNo} of {TOTAL_SESSIONS} · {SLOT_LABEL[b.slot]}
                        </div>
                      </div>
                      {b.attendanceMarked ? (
                        <Status light="good">Attendance marked</Status>
                      ) : (
                        <Link href={`/roll-call?booking=${b.id}`}>
                          <Button variant="accent" size="sm">
                            Take roll call
                          </Button>
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {missing.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-bad">Attendance missing for past sessions</div>
              <ul className="space-y-1">
                {missing.map((b) => (
                  <li key={b.id} className="flex items-center justify-between text-sm">
                    <span>
                      {instituteById.get(b.instituteId)!.code} · S{b.sessionNo} · {fmtDay(b.date)}
                    </span>
                    <Link href={`/roll-call?booking=${b.id}`} className="text-xs font-semibold text-accent hover:underline">
                      Mark now
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
        <Card title="Upcoming sessions" action={<Link href="/sessions" className="text-xs font-medium text-accent hover:underline">All sessions →</Link>}>
          {upcoming.length === 0 ? (
            <Empty>No upcoming sessions.</Empty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {upcoming.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{instituteById.get(b.instituteId)!.code}</span> · {instituteById.get(b.instituteId)!.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    {fmtDay(b.date)} · {b.slot}
                    {b.status === 'PENDING' && <Badge tone="accent">Pending</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Checklist({ s }: { s: InstituteSummary }) {
  const items = [
    { label: 'Training dates booked', done: s.sessionsBooked >= TOTAL_SESSIONS, detail: `${s.sessionsBooked}/${TOTAL_SESSIONS} sessions`, href: '/scheduling' },
    { label: 'Kit received & confirmed', done: s.kit === 'Confirmed', detail: s.kit, href: `/institute?id=${s.inst.id}&tab=kit` },
    { label: `Batch roster (target ${TARGET_BATCH})`, done: s.enrolled >= TARGET_BATCH, detail: `${s.enrolled}/${TARGET_BATCH} enrolled`, href: `/institute?id=${s.inst.id}&tab=batch` },
    { label: 'Student ABC IDs registered', done: s.abcMissing === 0, detail: s.abcMissing ? `${s.abcMissing} missing` : 'All registered', href: `/institute?id=${s.inst.id}&tab=batch` },
    { label: 'Training sessions held', done: s.sessionsHeld >= TOTAL_SESSIONS, detail: `${s.sessionsHeld}/${TOTAL_SESSIONS} held`, href: `/institute?id=${s.inst.id}&tab=training` },
    { label: 'Project setup', done: s.setupDone === 8, detail: `${s.setupDone}/8 teams`, href: `/institute?id=${s.inst.id}&tab=projects` },
    { label: 'Project checking', done: s.reviewed === 8, detail: `${s.reviewed}/8 approved`, href: `/institute?id=${s.inst.id}&tab=projects` },
    { label: 'Marks entered', done: s.enrolled > 0 && s.marksEntered === s.enrolled, detail: `${s.marksEntered}/${s.enrolled}`, href: `/institute?id=${s.inst.id}&tab=marks` },
  ];
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={it.label}>
          <Link href={it.href} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${it.done ? 'bg-green-100 text-ok' : 'bg-slate-100 text-slate-500'}`}>
              {it.done ? '✓' : i + 1}
            </span>
            <span className="flex-1 text-sm text-slate-700">{it.label}</span>
            <span className={`text-xs ${it.done ? 'text-ok' : 'text-slate-500'}`}>{it.detail}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function InstituteDashboard() {
  const { state, session } = useStore();
  const s = summarize(state, session!.refId);
  const inst = s.inst;
  const kitsToConfirm = state.kits.filter((k) => k.instituteId === inst.id && k.status === 'DELIVERED');
  return (
    <>
      <PageHeader
        title={inst.name}
        sub={`${inst.code} · ${s.departmentName} Department · Instructor: ${s.instructorName}`}
        actions={
          <>
            <Link href="/scheduling">
              <Button variant="accent">Book training dates</Button>
            </Link>
            <Link href={`/institute?id=${inst.id}&tab=batch`}>
              <Button variant="outline">Open batch</Button>
            </Link>
          </>
        }
      />
      {kitsToConfirm.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-warn">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" /> {kitsToConfirm.length} kit shipment(s) marked delivered. Please confirm receipt or report an issue.
          </span>
          <Link href={`/institute?id=${inst.id}&tab=kit`}>
            <Button size="sm" variant="outline">
              Confirm kit
            </Button>
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Training" value={`${s.sessionsHeld}/${TOTAL_SESSIONS}`} sub={s.training} light={s.trainingLight} />
        <StatTile label="Enrolled" value={`${s.enrolled}/${TARGET_BATCH}`} sub={`${pct(s.enrolled, TARGET_BATCH)}% of target`} light={s.enrolled >= TARGET_BATCH ? 'good' : 'warn'} />
        <StatTile label="Attendance" value={s.attendancePct === null ? '—' : `${s.attendancePct}%`} sub={s.missingAttendance ? `${s.missingAttendance} session(s) not marked` : 'Up to date'} light={s.attendanceLight === 'none' ? undefined : s.attendanceLight} />
        <StatTile label="Kit delivery" value={s.kit} light={s.kitLight} sub={s.kit === 'Confirmed' ? 'All kits received' : 'Pending'} />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card title="Program checklist">
          <Checklist s={s} />
        </Card>
        <Card title="Next session">
          {s.nextSession ? (
            <div className="space-y-1 text-sm">
              <div className="text-lg font-semibold text-brand">{fmtDate(s.nextSession.date)}</div>
              <div className="text-slate-600">{SLOT_LABEL[s.nextSession.slot]}</div>
              <div className="text-slate-600">
                Session {s.nextSession.sessionNo} · Instructor {instructorById.get(s.nextSession.instructorId)!.name}
              </div>
              <Status light="good">{bookingView(s.nextSession)}</Status>
            </div>
          ) : (
            <Empty>
              No upcoming session. <Link href="/scheduling" className="font-semibold text-accent">Book training dates</Link>
            </Empty>
          )}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Topics covered</span>
              <span>{s.topicsCovered}/10</span>
            </div>
            <Progress value={s.topicsCovered * 10} />
          </div>
        </Card>
      </div>
    </>
  );
}

function StudentDashboard() {
  const { state, session } = useStore();
  const st = findStudent(state, session!.refId)!;
  return (
    <>
      <PageHeader title={`Hi, ${st.name.split(' ')[0]}`} sub={`${instituteById.get(st.instituteId)!.name} · Roll no. ${st.rollNo}`} />
      <StudentProgressView student={st} />
    </>
  );
}
