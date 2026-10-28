'use client';
import { AppShell } from '@/components/AppShell';
import { Button, Card, PageHeader, Table, Td, Th } from '@/components/ui';
import { BOOKING_CUTOFF_DAYS, TARGET_BATCH, TEAMS_PER_BATCH, TOTAL_SESSIONS } from '@/lib/data';
import { ROLE_LABEL } from '@/lib/logic';
import { useStore } from '@/lib/store';

export default function SettingsPage() {
  return (
    <AppShell roles={['ADMIN']}>
      <Settings />
    </AppShell>
  );
}

const ROLE_ROWS: [keyof typeof ROLE_LABEL, string][] = [
  ['ADMIN', 'Overall configuration, access, scheduling, instructor availability, kit dispatch, consolidated reports, partner API'],
  ['DEPARTMENT', 'Department-wise institute schedules, booking approval/reschedule/cancel, follow-up, progress monitoring, reports'],
  ['INSTRUCTOR', 'Own availability, sessions, roll call, topics covered, project setup & checking, marks entry'],
  ['INSTITUTE', 'Institute profile, batch roster, ABC ID verification, booking requests, kit receipt, institute-level status'],
  ['STUDENT', 'Own progress, ABC ID registration'],
];

function Settings() {
  const { state, update, reset, toast } = useStore();
  const approval = state.settings.requireApproval;
  return (
    <>
      <PageHeader title="Program Settings" sub="KCG · STEAM-Based Professional Training Program" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Booking rules">
          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-sm font-medium text-slate-800">Booking requests need Department Coordinator approval</span>
              <span className="text-xs text-slate-500">Off: an institute&apos;s booking is confirmed instantly. On: it stays “Pending approval” (and holds the slot) until approved.</span>
            </span>
            <button
              role="switch"
              aria-checked={approval}
              onClick={() => { update((s) => ({ ...s, settings: { ...s.settings, requireApproval: !approval } })); toast(`Approval ${!approval ? 'required' : 'not required'}`); }}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${approval ? 'bg-brand' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${approval ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
          <dl className="mt-4 space-y-1.5 text-sm">
            {[
              ['Sessions per institute', TOTAL_SESSIONS],
              ['Slots per day', 'Forenoon 9:30–12:30 · Afternoon 1:30–4:30'],
              ['Booking cut-off', `${BOOKING_CUTOFF_DAYS} days before the session`],
              ['Slot blocking', 'One institute per department per slot; one session per instructor per slot'],
              ['Target batch size', TARGET_BATCH],
              ['Project teams per batch', TEAMS_PER_BATCH],
              ['Completion rule', 'All sessions held · attendance ≥ 75% · marks ≥ 40/100'],
            ].map(([k, v]) => (
              <div key={String(k)} className="grid grid-cols-[180px_1fr] gap-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Roles & access">
          <Table>
            <thead><tr><Th>Role</Th><Th>Can do</Th></tr></thead>
            <tbody>
              {ROLE_ROWS.map(([r, d]) => (
                <tr key={r}><Td className="whitespace-nowrap font-medium">{ROLE_LABEL[r]}</Td><Td className="whitespace-normal text-xs text-slate-600">{d}</Td></tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title="Demo data">
          <p className="mb-3 text-sm text-slate-600">Everything you change in this mockup is saved in this browser only. Reset to start the demo from scratch.</p>
          <Button variant="outline" onClick={() => { if (confirm('Reset all demo data?')) { reset(); toast('Demo data reset'); } }}>Reset demo data</Button>
        </Card>
      </div>
    </>
  );
}
