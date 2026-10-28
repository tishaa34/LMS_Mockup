'use client';
import { Copy, KeyRound, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Badge, Button, Card, Input, Note, PageHeader, Table, Td, Th } from '@/components/ui';
import { PROGRAM_NAME, TOTAL_SESSIONS, deptById, institutes, type Student } from '@/lib/data';
import { activeBookings, getStudents, getTeam, studentProgress } from '@/lib/logic';
import { useStore, type DemoState } from '@/lib/store';
import { TODAY, addDays, fmtDate } from '@/lib/util';

export default function PartnerApiPage() {
  return (
    <AppShell roles={['ADMIN']}>
      <PartnerApi />
    </AppShell>
  );
}

function performance(state: DemoState, st: Student) {
  const inst = institutes.find((i) => i.id === st.instituteId)!;
  const p = studentProgress(state, st);
  const team = getTeam(state, st.instituteId, st.teamNo);
  const topics = [...new Set(activeBookings(state, st.instituteId).flatMap((b) => b.topics))];
  return {
    abcId: st.abcId,
    abcVerified: st.abcVerified,
    student: { name: st.name, rollNo: st.rollNo, enrolmentStatus: st.status },
    institute: { id: inst.code, name: inst.name, department: deptById.get(inst.departmentId)!.name, district: inst.district },
    program: { name: PROGRAM_NAME, totalSessions: TOTAL_SESSIONS },
    attendance: { sessionsHeld: p.held.length, sessionsAttended: p.present, percentage: p.attendance },
    training: { modulesCompleted: topics.length, modules: topics },
    project: { team: st.teamNo, title: team.title, setupStatus: team.setupStatus, reviewStatus: team.reviewStatus },
    assessment: { marks: p.marks.marks, outOf: 100, status: p.marks.status },
    completionStatus: p.completed ? 'COMPLETED' : 'IN_PROGRESS',
    lastUpdated: TODAY,
  };
}

function PartnerApi() {
  const { state, toast } = useStore();
  const all = useMemo(() => institutes.flatMap((i) => getStudents(state, i.id)), [state]);
  const samples = useMemo(() => {
    const done = institutes.filter((i) => i.phase === 'completed').slice(0, 3).flatMap((i) => getStudents(state, i.id).filter((s) => s.abcId && s.abcVerified).slice(0, 1));
    const inProg = getStudents(state, 'inst-3').filter((s) => s.abcId).slice(0, 2);
    return [...done, ...inProg];
  }, [state]);
  const [abc, setAbc] = useState(samples[0]?.abcId ?? '');
  const [resp, setResp] = useState<{ status: number; body: unknown } | null>(null);

  const run = () => {
    if (!/^\d{12}$/.test(abc)) return setResp({ status: 400, body: { error: 'INVALID_ABC_ID', message: 'ABC ID must be 12 digits' } });
    const st = all.find((s) => s.abcId === abc);
    if (!st) return setResp({ status: 404, body: { error: 'NOT_FOUND', message: 'No KCG student registered with this ABC ID' } });
    setResp({ status: 200, body: performance(state, st) });
  };

  const registered = all.filter((s) => s.abcId).length;
  const verified = all.filter((s) => s.abcVerified).length;

  return (
    <>
      <PageHeader title="ABC ID Partner API" sub="How an authorised partner system (e.g. RUSA / KCG portal) fetches a student's performance by ABC ID" />
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card><div className="text-xs text-slate-500">Students</div><div className="text-2xl font-bold">{all.length.toLocaleString('en-IN')}</div></Card>
        <Card><div className="text-xs text-slate-500">ABC ID registered</div><div className="text-2xl font-bold">{registered.toLocaleString('en-IN')}</div></Card>
        <Card><div className="text-xs text-slate-500">Verified by institute</div><div className="text-2xl font-bold">{verified.toLocaleString('en-IN')}</div></Card>
        <Card><div className="text-xs text-slate-500">ABC ID missing</div><div className="text-2xl font-bold text-bad">{(all.length - registered).toLocaleString('en-IN')}</div></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Try it · lookup by ABC ID">
          <div className="mb-2 rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100">
            <span className="text-green-400">GET</span> https://api.stembotix.com/partner/v1/kcg/students/<span className="text-accent-100">{abc || '{abcId}'}</span>/performance
            <div className="text-slate-400">x-api-key: kcg_live_••••••••••••3f9a</div>
          </div>
          <div className="flex gap-2">
            <Input inputMode="numeric" maxLength={12} placeholder="12-digit ABC ID" value={abc} onChange={(e) => setAbc(e.target.value.replace(/\D/g, ''))} />
            <Button onClick={run}><Play className="h-4 w-4" /> Send</Button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
            <span className="text-slate-500">Sample IDs:</span>
            {samples.map((s) => (
              <button key={s.id} onClick={() => { setAbc(s.abcId!); setResp(null); }} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono hover:bg-brand-100">
                {s.abcId}
              </button>
            ))}
          </div>
          {resp && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className={resp.status === 200 ? 'font-semibold text-ok' : 'font-semibold text-bad'}>HTTP {resp.status}</span>
                <button className="flex items-center gap-1 text-slate-500 hover:text-brand" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(resp.body, null, 2)); toast('Copied'); }}>
                  <Copy className="h-3 w-3" /> Copy
                </button>
              </div>
              <pre className="max-h-[420px] overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{JSON.stringify(resp.body, null, 2)}</pre>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title="How it works">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
              <li>Every student registers their 12-digit <b>ABC ID</b> (Academic Bank of Credits) in the LMS, or the Institute Coordinator enters it in the roster / bulk upload.</li>
              <li>The <b>Institute Coordinator verifies</b> each ABC ID. Duplicate IDs are rejected.</li>
              <li>The student gives <b>consent</b> to share program performance with authorised partners (DPDP Act 2023).</li>
              <li>The partner system calls the API with its own <b>API key</b>; it receives a read-only performance summary. Every call is logged.</li>
            </ol>
          </Card>
          <Card title="API keys" action={<Badge tone="brand">Mock</Badge>}>
            <Table>
              <thead><tr><Th>Partner</Th><Th>Key</Th><Th>Scope</Th><Th>Status</Th></tr></thead>
              <tbody>
                <tr><Td>RUSA KCG Portal</Td><Td className="font-mono text-xs">kcg_live_••••3f9a</Td><Td className="text-xs">performance:read</Td><Td><Badge tone="brand">Active</Badge></Td></tr>
                <tr><Td>KCG Analytics (test)</Td><Td className="font-mono text-xs">kcg_test_••••a71c</Td><Td className="text-xs">performance:read</Td><Td><Badge>Test</Badge></Td></tr>
              </tbody>
            </Table>
          </Card>
          <Card title="Recent API calls (audit log)">
            <Table>
              <thead><tr><Th>When</Th><Th>Partner</Th><Th>ABC ID</Th><Th>Result</Th></tr></thead>
              <tbody>
                {samples.slice(0, 4).map((s, i) => (
                  <tr key={s.id}><Td className="text-xs">{fmtDate(addDays(TODAY, -i))}</Td><Td className="text-xs">RUSA KCG Portal</Td><Td className="font-mono text-xs">{s.abcId}</Td><Td className="text-xs text-ok">200 OK</Td></tr>
                ))}
              </tbody>
            </Table>
          </Card>
          <Note>
            <KeyRound className="mr-1 inline h-3.5 w-3.5" />
            Open question for the client: should partners read data <b>from our LMS</b> (shown here), should we <b>fetch from ABC/DigiLocker</b>, or
            should we <b>push credits to ABC</b>? The last two need NAD/DigiLocker onboarding.
          </Note>
        </div>
      </div>
    </>
  );
}
