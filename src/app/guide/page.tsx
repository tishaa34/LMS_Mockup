'use client';
import { ArrowRight, LogIn } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BASE } from '@/components/AppShell';
import { FEATURED } from '@/lib/accounts';
import { institutes } from '@/lib/data';
import { useStore } from '@/lib/store';

interface Step {
  as?: number; // index into FEATURED
  go: string;
  text: string;
}
interface Scenario {
  req: string;
  title: string;
  steps: Step[];
}

const A = FEATURED[3], B = FEATURED[4], C = FEATURED[5];
const COMPLETED = institutes.find((i) => i.phase === 'completed')!;

const SCENARIOS: Scenario[] = [
  {
    req: 'Requirement 1',
    title: 'Training scheduling by department & instructor availability',
    steps: [
      { as: 3, go: '/scheduling', text: `As ${A.title}: green slots are open. Grey struck-out slots are days the instructor is unavailable. Book a slot.` },
      { as: 4, go: '/scheduling', text: `As ${B.title} (same department): the slot KCG-0001 just booked now shows “Booked” and can’t be selected.` },
      { as: 2, go: '/availability', text: 'As the Instructor: mark a day unavailable. Log back in as an institute and that day is no longer bookable.' },
      { as: 0, go: '/scheduling', text: 'As Super Admin: filter, approve, reschedule (with clash check) or cancel bookings; or book on an institute’s behalf from the Calendar tab.' },
      { as: 0, go: '/settings', text: 'Optional: turn on “Booking requests need approval”. New requests then wait for the Department Coordinator.' },
    ],
  },
  {
    req: 'Requirement 3',
    title: 'Centralised tracking of all 500 institutes',
    steps: [
      { as: 0, go: '/dashboard', text: 'Program dashboard: KPI tiles, progress by stage, items needing attention, and a department-wise summary.' },
      { as: 0, go: '/institutes', text: 'All 500 institutes with filters (department, instructor, training, kit, project, assessment) and “Highlight pending” chips.' },
      { as: 0, go: '/institute?id=inst-3', text: 'Institute detail: profile, kit delivery, training & sessions, batch, projects, marks and issues in one place.' },
      { as: 0, go: '/reports', text: 'Export institute-wise, department-wise, bookings, issues and student-wise reports (opens in Excel).' },
      { as: 1, go: '/dashboard', text: 'As a Department Coordinator: the same views limited to one department.' },
    ],
  },
  {
    req: 'Requirement 4',
    title: 'Batch-wise progress (40 students)',
    steps: [
      { as: 5, go: '/institute?tab=batch', text: `As ${C.title}: batch indicators (enrolled vs 40, attendance, progress, projects, marks, completed, pending actions) and the roster.` },
      { as: 2, go: '/dashboard', text: 'As the Instructor: open today’s session → Take roll call. Everyone starts present; tap absentees and tick topics covered.' },
      { as: 2, go: '/institute?id=inst-3&tab=projects', text: 'Instructor: update project setup and check projects (approve / corrections required).' },
      { as: 0, go: `/institute?id=${COMPLETED.id}&tab=marks`, text: `Marks & assessment for a completed institute (${COMPLETED.code}): enter or verify marks; see who completed the program.` },
    ],
  },
  {
    req: 'Kit delivery',
    title: 'Kit dispatch & confirmation',
    steps: [
      { as: 3, go: '/institute?tab=kit', text: `As ${A.title}: kits are marked delivered. Confirm receipt, or report an issue. An issue automatically creates a follow-up item.` },
      { as: 0, go: '/issues', text: 'As Super Admin: see and close follow-up items with remarks, filter by overdue.' },
    ],
  },
  {
    req: 'ABC ID',
    title: 'Student ABC ID & partner lookup',
    steps: [
      { as: 6, go: '/profile', text: 'As the Student: register a 12-digit ABC ID with consent (duplicates are rejected).' },
      { as: 5, go: '/institute?tab=batch', text: 'As the Institute Coordinator: filter “ABC ID not verified” and verify it.' },
      { as: 0, go: '/partner-api', text: 'As Super Admin: simulate the partner API: enter an ABC ID and see the JSON performance summary.' },
    ],
  },
];

export default function GuidePage() {
  const { login, session } = useStore();
  const router = useRouter();
  const run = (s: Step) => {
    if (s.as !== undefined) {
      const a = FEATURED[s.as];
      login({ role: a.role, refId: a.refId, name: a.name });
    }
    router.push(s.go);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD]">
      <header className="bg-brand px-4 py-5 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/logo.png`} alt="" className="h-8 w-auto" />
            <div>
              <div className="font-bold">Demo guide</div>
              <div className="text-xs text-brand-200">Walk through each KCG requirement</div>
            </div>
          </div>
          <Link href={session ? '/dashboard' : '/login'} className="text-xs font-semibold text-accent-100 hover:underline">
            {session ? 'Back to app' : 'Go to login'} →
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-5 px-4 py-6">
        <p className="text-sm text-slate-600">
          Each step signs you in as the right user and opens the right page. Changes are saved in your browser, so later steps see what earlier steps did.
          Use <b>Reset demo data</b> in the sidebar to start again.
        </p>
        {SCENARIOS.map((sc) => (
          <section key={sc.title} className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="border-b border-slate-100 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-accent">{sc.req}</div>
              <h2 className="font-semibold text-brand">{sc.title}</h2>
            </header>
            <ol className="divide-y divide-slate-100">
              {sc.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand">{i + 1}</span>
                  <p className="flex-1 text-sm text-slate-700">{s.text}</p>
                  <button onClick={() => run(s)} className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-brand hover:bg-brand-50">
                    {s.as !== undefined ? <LogIn className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">{s.as !== undefined ? FEATURED[s.as].title.split(' · ')[0] : 'Open'}</span>
                    <span className="sm:hidden">Go</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
          <b className="text-brand">Not in this mockup:</b> Interview panel setup (Requirement 2) was removed from scope. The “Interview Panel Coordinator”
          role in the requirements is therefore not shown. Please confirm whether it is needed in a later phase.
        </section>
      </main>
    </div>
  );
}
