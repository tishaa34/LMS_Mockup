'use client';
import { AlertTriangle, Building2, CalendarCheck, ClipboardList, LifeBuoy, Package, Users } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { departments, instituteById, type Institute } from '@/lib/data';
import { FLAGS, type FlagId } from '@/lib/flags';
import { bookingView, summarize, type InstituteSummary, type Light } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, addDays, fmtDay, pct } from '@/lib/util';
import { Card, Status, StatTile, Table, Td, Th } from './ui';

const SEG: Record<Light, { bar: string; label: string }> = {
  good: { bar: 'bg-ok', label: 'Done' },
  warn: { bar: 'bg-amber-500', label: 'In progress' },
  bad: { bar: 'bg-bad', label: 'Needs action' },
  none: { bar: 'bg-slate-300', label: 'Not started yet' },
};

/** One stacked bar per stage: how many institutes are done / in progress / need action. */
function StageBars({ rows, total }: { rows: { stage: string; counts: Record<Light, number>; flag?: FlagId }[]; total: number }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-600">
        {(Object.keys(SEG) as Light[]).map((l) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${SEG[l].bar}`} aria-hidden />
            {SEG[l].label}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.stage}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{r.stage}</span>
              <span className="tabular-nums text-slate-500">
                {r.counts.good} done
                {r.counts.bad > 0 && (
                  <>
                    {' · '}
                    {r.flag ? (
                      <Link href={`/institutes?flag=${r.flag}`} className="font-semibold text-bad hover:underline">
                        {r.counts.bad} need action
                      </Link>
                    ) : (
                      <span className="font-semibold text-bad">{r.counts.bad} need action</span>
                    )}
                  </>
                )}
              </span>
            </div>
            <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded">
              {(['good', 'warn', 'bad', 'none'] as Light[]).map((l) =>
                r.counts[l] ? (
                  <div
                    key={l}
                    className={`${SEG[l].bar} h-full first:rounded-l last:rounded-r`}
                    style={{ width: `${(r.counts[l] / total) * 100}%` }}
                    title={`${r.stage}: ${SEG[l].label}: ${r.counts[l]} institutes (${pct(r.counts[l], total)}%)`}
                  />
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function count(list: InstituteSummary[], key: (s: InstituteSummary) => Light) {
  const c: Record<Light, number> = { good: 0, warn: 0, bad: 0, none: 0 };
  for (const s of list) c[key(s)]++;
  return c;
}

export function Overview({ scope, title }: { scope: Institute[]; title: string }) {
  const { state, session } = useStore();
  const sums = useMemo(() => scope.map((i) => summarize(state, i.id)), [state, scope]);
  const total = sums.length;
  const ids = new Set(scope.map((i) => i.id));

  const completed = sums.filter((s) => s.training === 'Completed').length;
  const inProgress = sums.filter((s) => s.training === 'In progress').length;
  const notBooked = sums.filter((s) => s.training === 'Not scheduled' || s.training === 'Partially booked').length;
  const kitsPending = sums.filter((s) => s.kit !== 'Confirmed').length;
  const enrolled = sums.reduce((a, s) => a + s.enrolled, 0);
  const att = sums.filter((s) => s.attendancePct !== null);
  const avgAtt = att.length ? Math.round(att.reduce((a, s) => a + (s.attendancePct ?? 0), 0) / att.length) : 0;
  const openIssues = sums.reduce((a, s) => a + s.openIssues, 0);
  const overdue = sums.reduce((a, s) => a + s.overdueIssues, 0);
  const pending = state.bookings.filter((b) => b.status === 'PENDING' && ids.has(b.instituteId));
  const weekEnd = addDays(TODAY, 7);
  const thisWeek = state.bookings
    .filter((b) => ids.has(b.instituteId) && b.status === 'CONFIRMED' && b.date >= TODAY && b.date <= weekEnd)
    .sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));

  const stages = [
    { stage: 'Kit delivery', counts: count(sums, (s) => s.kitLight), flag: 'kit' as FlagId },
    { stage: 'Training', counts: count(sums, (s) => s.trainingLight), flag: 'unbooked' as FlagId },
    { stage: 'Attendance', counts: count(sums, (s) => s.attendanceLight), flag: 'attendance' as FlagId },
    { stage: 'Project setup', counts: count(sums, (s) => s.setupLight), flag: 'setup' as FlagId },
    { stage: 'Project checking', counts: count(sums, (s) => s.reviewLight), flag: 'review' as FlagId },
    { stage: 'Marks & assessment', counts: count(sums, (s) => s.marksLight), flag: 'marks' as FlagId },
  ];

  const attention: { flag: FlagId; items: InstituteSummary[] }[] = (['kit', 'attendance', 'setup', 'marks'] as FlagId[]).map((f) => ({
    flag: f,
    items: sums.filter(FLAGS[f].test).filter((s) => f !== 'kit' || s.kitLight === 'bad' || s.kit === 'Awaiting confirmation'),
  }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Institutes" value={total} sub={`${enrolled.toLocaleString('en-IN')} students enrolled`} icon={Building2} />
        <StatTile label="Training completed" value={completed} sub={`${inProgress} in progress`} icon={CalendarCheck} />
        <StatTile label="Not fully booked" value={notBooked} sub={notBooked ? 'Need training dates' : 'All booked'} light={notBooked ? 'warn' : 'good'} icon={ClipboardList} />
        <StatTile label="Kit deliveries pending" value={kitsPending} sub={`${pct(total - kitsPending, total)}% confirmed`} light={kitsPending ? 'warn' : 'good'} icon={Package} />
        <StatTile label="Avg. attendance" value={`${avgAtt}%`} sub={avgAtt >= 75 ? 'Above 75% target' : 'Below 75% target'} light={avgAtt >= 75 ? 'good' : 'warn'} icon={Users} />
        <StatTile label="Open issues" value={openIssues} sub={`${overdue} overdue`} light={overdue ? 'bad' : 'good'} icon={LifeBuoy} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[3fr_2fr]">
        <Card title={`Progress by stage · ${title}`} action={<Link href="/institutes" className="text-xs font-medium text-accent hover:underline">Open full list →</Link>}>
          <StageBars rows={stages} total={total} />
        </Card>
        <Card
          title="Booking requests & this week"
          action={<Link href="/scheduling" className="text-xs font-medium text-accent hover:underline">Manage bookings →</Link>}
        >
          {pending.length > 0 && (
            <div className="mb-3 flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm text-warn">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> {pending.length} booking request{pending.length > 1 ? 's' : ''} awaiting approval
              </span>
              <Link href="/scheduling?status=Pending%20approval" className="text-xs font-semibold underline">
                Review
              </Link>
            </div>
          )}
          <div className="text-xs font-medium text-slate-500">{thisWeek.length} sessions in the next 7 days</div>
          <ul className="mt-2 max-h-56 divide-y divide-slate-100 overflow-y-auto">
            {thisWeek.slice(0, 30).map((b) => {
              const inst = instituteById.get(b.instituteId)!;
              return (
                <li key={b.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <Link href={`/institute?id=${inst.id}`} className="min-w-0 truncate text-slate-700 hover:text-brand">
                    <span className="font-medium">{inst.code}</span> · {inst.name}
                  </Link>
                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {fmtDay(b.date)} · {b.slot} · S{b.sessionNo} <span className="sr-only">{bookingView(b)}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {attention.map(({ flag, items }) => (
          <Card
            key={flag}
            title={
              <span className="flex items-center gap-2">
                {FLAGS[flag].label} <span className="rounded-full bg-red-50 px-1.5 text-xs text-bad">{items.length}</span>
              </span>
            }
            action={
              <Link href={`/institutes?flag=${flag}`} className="text-xs font-medium text-accent hover:underline">
                All →
              </Link>
            }
          >
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing pending.</p>
            ) : (
              <ul className="space-y-1.5">
                {items.slice(0, 5).map((s) => (
                  <li key={s.inst.id} className="flex items-center justify-between gap-2 text-sm">
                    <Link href={`/institute?id=${s.inst.id}`} className="truncate text-slate-700 hover:text-brand">
                      <span className="font-medium">{s.inst.code}</span> {s.departmentName}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">
                      {flag === 'kit' && s.kit}
                      {flag === 'attendance' && `${s.missingAttendance} session(s)`}
                      {flag === 'setup' && `${s.setupDone}/8 teams`}
                      {flag === 'marks' && `${s.marksEntered}/${s.enrolled}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {session?.role === 'ADMIN' && <DepartmentTable sums={sums} />}
    </div>
  );
}

function DepartmentTable({ sums }: { sums: InstituteSummary[] }) {
  const rows = departments.map((d) => {
    const s = sums.filter((x) => x.inst.departmentId === d.id);
    const att = s.filter((x) => x.attendancePct !== null);
    return {
      d,
      total: s.length,
      completed: s.filter((x) => x.training === 'Completed').length,
      notBooked: s.filter((x) => x.training === 'Not scheduled' || x.training === 'Partially booked').length,
      kits: s.filter((x) => x.kit !== 'Confirmed').length,
      att: att.length ? Math.round(att.reduce((a, x) => a + (x.attendancePct ?? 0), 0) / att.length) : null,
      marks: s.filter((x) => x.marksLight === 'bad').length,
      issues: s.reduce((a, x) => a + x.openIssues, 0),
    };
  });
  return (
    <Card title="Department-wise summary">
      <Table>
        <thead>
          <tr>
            <Th>Department</Th>
            <Th>Coordinator</Th>
            <Th className="text-right">Institutes</Th>
            <Th className="text-right">Training done</Th>
            <Th>Not fully booked</Th>
            <Th>Kits pending</Th>
            <Th>Avg. attendance</Th>
            <Th>Marks pending</Th>
            <Th className="text-right">Open issues</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.d.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/institutes?dept=${r.d.id}`} className="font-medium text-brand hover:underline">
                  {r.d.code} · {r.d.name}
                </Link>
              </Td>
              <Td className="text-slate-600">{r.d.coordinator}</Td>
              <Td className="text-right tabular-nums">{r.total}</Td>
              <Td className="text-right tabular-nums">{r.completed}</Td>
              <Td>{r.notBooked ? <Status light="warn">{r.notBooked}</Status> : <Status light="good">0</Status>}</Td>
              <Td>{r.kits ? <Status light="warn">{r.kits}</Status> : <Status light="good">0</Status>}</Td>
              <Td>{r.att === null ? '—' : <Status light={r.att >= 75 ? 'good' : 'warn'}>{r.att}%</Status>}</Td>
              <Td>{r.marks ? <Status light="bad">{r.marks}</Status> : <Status light="good">0</Status>}</Td>
              <Td className="text-right tabular-nums">{r.issues}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
