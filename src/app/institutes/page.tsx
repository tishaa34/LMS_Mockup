'use client';
import { Download, Search } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Input, PageHeader, Select, Status, Table, Td, Th } from '@/components/ui';
import { TARGET_BATCH, TOTAL_SESSIONS, departments, instructors } from '@/lib/data';
import { FLAGS, FLAG_IDS, type FlagId } from '@/lib/flags';
import { exportInstitutes } from '@/lib/exports';
import { can, scopedInstitutes, summarize } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, cx } from '@/lib/util';

export default function InstitutesPage() {
  return (
    <AppShell roles={['ADMIN', 'DEPARTMENT', 'INSTRUCTOR']}>
      <Suspense>
        <InstitutesList />
      </Suspense>
    </AppShell>
  );
}

const PAGE = 50;

function InstitutesList() {
  const { state, session, toast } = useStore();
  const params = useSearchParams();
  const scope = useMemo(() => scopedInstitutes(session!), [session]);
  const sums = useMemo(() => scope.map((i) => summarize(state, i.id)), [state, scope]);

  const [q, setQ] = useState('');
  const [dept, setDept] = useState(params.get('dept') ?? '');
  const [instructor, setInstructor] = useState('');
  const [training, setTraining] = useState('');
  const [kit, setKit] = useState('');
  const [project, setProject] = useState('');
  const [assessment, setAssessment] = useState('');
  const [flags, setFlags] = useState<FlagId[]>(() => {
    const f = params.get('flag') as FlagId | null;
    return f && f in FLAGS ? [f] : [];
  });
  const [page, setPage] = useState(0);

  const isAdmin = session!.role === 'ADMIN';
  const scopeInstructors = instructors.filter((i) => scope.some((s) => s.instructorId === i.id));

  const rows = sums.filter((s) => {
    if (q && !`${s.inst.code} ${s.inst.name} ${s.inst.district} ${s.inst.coordinator}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (dept && s.inst.departmentId !== dept) return false;
    if (instructor && s.inst.instructorId !== instructor) return false;
    if (training && s.training !== training) return false;
    if (kit && s.kit !== kit) return false;
    if (project === 'setup_pending' && s.setupDone === 8) return false;
    if (project === 'review_pending' && s.reviewed === 8) return false;
    if (project === 'corrections' && s.corrections === 0) return false;
    if (project === 'all_approved' && s.reviewed !== 8) return false;
    if (assessment === 'not_entered' && s.marksLight !== 'bad') return false;
    if (assessment === 'complete' && s.marksLight !== 'good') return false;
    if (assessment === 'not_due' && s.marksLight !== 'none') return false;
    return flags.every((f) => FLAGS[f].test(s));
  });
  const pageRows = rows.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.ceil(rows.length / PAGE);

  const toggleFlag = (f: FlagId) => {
    setPage(0);
    setFlags((cur) => (cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]));
  };
  const clear = () => {
    setQ(''); setDept(''); setInstructor(''); setTraining(''); setKit(''); setProject(''); setAssessment(''); setFlags([]); setPage(0);
  };

  return (
    <>
      <PageHeader
        title={isAdmin ? 'All Institutes' : session!.role === 'DEPARTMENT' ? 'Department Institutes' : 'My Institutes'}
        sub={`${rows.length} of ${sums.length} institutes shown`}
        actions={
          can(session!.role, 'export') && (
            <Button
              variant="outline"
              onClick={() => {
                exportInstitutes(rows, `kcg-institutes-${TODAY}.csv`);
                toast(`Exported ${rows.length} institutes`);
              }}
            >
              <Download className="h-4 w-4" /> Export filtered list
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <Input placeholder="Search institute, ID, district, coordinator…" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="pl-8" />
          </div>
          {isAdmin && (
            <Select value={dept} onChange={(e) => { setDept(e.target.value); setPage(0); }}>
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.code} · {d.name}</option>
              ))}
            </Select>
          )}
          {session!.role !== 'INSTRUCTOR' && (
            <Select value={instructor} onChange={(e) => { setInstructor(e.target.value); setPage(0); }}>
              <option value="">All instructors</option>
              {scopeInstructors.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </Select>
          )}
          <Select value={training} onChange={(e) => { setTraining(e.target.value); setPage(0); }}>
            <option value="">Training: any</option>
            {['Not scheduled', 'Partially booked', 'Scheduled', 'In progress', 'Completed'].map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Select value={kit} onChange={(e) => { setKit(e.target.value); setPage(0); }}>
            <option value="">Kit: any</option>
            {['Not dispatched', 'In transit', 'Awaiting confirmation', 'Confirmed', 'Issue reported'].map((t) => <option key={t}>{t}</option>)}
          </Select>
          <Select value={project} onChange={(e) => { setProject(e.target.value); setPage(0); }}>
            <option value="">Project: any</option>
            <option value="setup_pending">Setup pending</option>
            <option value="review_pending">Checking pending</option>
            <option value="corrections">Corrections required</option>
            <option value="all_approved">All approved</option>
          </Select>
          <Select value={assessment} onChange={(e) => { setAssessment(e.target.value); setPage(0); }}>
            <option value="">Assessment: any</option>
            <option value="not_entered">Marks not entered</option>
            <option value="complete">Marks complete</option>
            <option value="not_due">Not due yet</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-slate-500">Highlight pending:</span>
          {FLAG_IDS.map((f) => {
            const n = sums.filter(FLAGS[f].test).length;
            return (
              <button
                key={f}
                onClick={() => toggleFlag(f)}
                className={cx(
                  'rounded-full border px-2.5 py-1 text-xs font-medium',
                  flags.includes(f) ? 'border-bad bg-red-50 text-bad' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
                )}
              >
                {FLAGS[f].label} <span className="tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
          <button onClick={clear} className="ml-auto text-xs font-medium text-accent hover:underline">
            Clear filters
          </button>
        </div>
      </Card>

      <Card className="mt-4">
        <Table>
          <thead>
            <tr>
              <Th>Institute</Th>
              <Th>Department</Th>
              <Th>Instructor</Th>
              <Th>Training</Th>
              <Th>Enrolled</Th>
              <Th>Attendance</Th>
              <Th>Kit</Th>
              <Th>Project setup</Th>
              <Th>Project checking</Th>
              <Th>Marks</Th>
              <Th>Issues</Th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((s) => (
              <tr key={s.inst.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/institute?id=${s.inst.id}`} className="block max-w-[280px]">
                    <span className="block truncate font-medium text-brand hover:underline">{s.inst.name}</span>
                    <span className="text-xs text-slate-500">{s.inst.code}</span>
                  </Link>
                </Td>
                <Td className="text-slate-600">{s.departmentName}</Td>
                <Td className="text-slate-600">{s.instructorName}</Td>
                <Td>
                  <Status light={s.trainingLight}>{s.training}</Status>
                  <div className="mt-0.5 text-[11px] text-slate-500">
                    {s.sessionsHeld}/{TOTAL_SESSIONS} held{s.pendingRequests ? ` · ${s.pendingRequests} pending` : ''}
                  </div>
                </Td>
                <Td className="tabular-nums">
                  <Status light={s.enrolled >= TARGET_BATCH ? 'good' : 'warn'}>{s.enrolled}/{TARGET_BATCH}</Status>
                </Td>
                <Td>
                  {s.missingAttendance > 0 ? (
                    <Status light="bad">{s.missingAttendance} not marked</Status>
                  ) : s.attendancePct === null ? (
                    <Status light="none">No sessions</Status>
                  ) : (
                    <Status light={s.attendanceLight}>{s.attendancePct}%</Status>
                  )}
                </Td>
                <Td><Status light={s.kitLight}>{s.kit}</Status></Td>
                <Td><Status light={s.setupLight}>{s.setupDone}/8 teams</Status></Td>
                <Td>
                  <Status light={s.reviewLight}>{s.reviewed}/8 approved</Status>
                  {s.corrections > 0 && <div className="mt-0.5 text-[11px] text-bad">{s.corrections} need corrections</div>}
                </Td>
                <Td>
                  {s.marksLight === 'none' ? <Status light="none">Not due</Status> : <Status light={s.marksLight}>{s.marksEntered}/{s.enrolled}</Status>}
                </Td>
                <Td>
                  {s.openIssues ? <Status light={s.overdueIssues ? 'bad' : 'warn'}>{s.openIssues} open</Status> : <span className="text-xs text-slate-400">—</span>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No institutes match these filters.</p>}
        {pages > 1 && (
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Page {page + 1} of {pages}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
