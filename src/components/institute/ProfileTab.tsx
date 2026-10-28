'use client';
import { useState } from 'react';
import { deptById } from '@/lib/data';
import { can, getInstitute, summarize } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { Button, Card, Field, Input } from '../ui';

export function ProfileTab({ id }: { id: string }) {
  const { state, update, session, toast } = useStore();
  const inst = getInstitute(state, id);
  const s = summarize(state, id);
  const editable = can(session!.role, 'editProfile');
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    coordinator: inst.coordinator,
    coordinatorPhone: inst.coordinatorPhone,
    coordinatorEmail: inst.coordinatorEmail,
    address: inst.address,
  });

  const save = () => {
    update((st) => ({ ...st, institutes: { ...st.institutes, [id]: { ...st.institutes[id], ...form } } }));
    setEdit(false);
    toast('Institute profile updated');
  };

  const row = (label: string, value: string) => (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card
        title="Institute profile"
        action={editable && !edit && <Button size="sm" variant="outline" onClick={() => setEdit(true)}>Edit</Button>}
      >
        {edit ? (
          <div className="space-y-3">
            <Field label="Coordinator name"><Input value={form.coordinator} onChange={(e) => setForm({ ...form, coordinator: e.target.value })} /></Field>
            <Field label="Coordinator phone"><Input value={form.coordinatorPhone} onChange={(e) => setForm({ ...form, coordinatorPhone: e.target.value })} /></Field>
            <Field label="Coordinator email"><Input value={form.coordinatorEmail} onChange={(e) => setForm({ ...form, coordinatorEmail: e.target.value })} /></Field>
            <Field label="Address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="ghost" onClick={() => setEdit(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <dl className="divide-y divide-slate-100">
            {row('Institute ID', inst.code)}
            {row('Institute name', inst.name)}
            {row('Department', `${deptById.get(inst.departmentId)!.code} · ${deptById.get(inst.departmentId)!.name}`)}
            {row('Location', `${inst.address}`)}
            {row('Coordinator', inst.coordinator)}
            {row('Phone', inst.coordinatorPhone)}
            {row('Email', inst.coordinatorEmail)}
            {row('Assigned instructor', s.instructorName)}
          </dl>
        )}
      </Card>
      <Card title="Overall status">
        <dl className="divide-y divide-slate-100">
          {row('Training', `${s.training} · ${s.sessionsHeld}/5 sessions held`)}
          {row('Batch', `${s.enrolled}/40 enrolled · ${s.completedStudents} completed`)}
          {row('Attendance', s.attendancePct === null ? 'No sessions yet' : `${s.attendancePct}% average${s.missingAttendance ? ` · ${s.missingAttendance} session(s) not marked` : ''}`)}
          {row('Kit delivery', s.kit)}
          {row('Project setup', `${s.setupDone}/8 teams completed`)}
          {row('Project checking', `${s.reviewed}/8 approved${s.corrections ? ` · ${s.corrections} need corrections` : ''}`)}
          {row('Marks', `${s.marksEntered}/${s.enrolled} entered`)}
          {row('ABC IDs', `${s.enrolled - s.abcMissing}/${s.enrolled} registered · ${s.abcUnverified} awaiting verification`)}
          {row('Open issues', `${s.openIssues}${s.overdueIssues ? ` (${s.overdueIssues} overdue)` : ''}`)}
        </dl>
      </Card>
    </div>
  );
}
