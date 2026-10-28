'use client';
import { useState } from 'react';
import type { TeamProject } from '@/lib/data';
import { can, getStudents, getTeams, summarize } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, fmtDate } from '@/lib/util';
import { Button, Card, Field, Input, Modal, Select, Status, Textarea } from '../ui';

const SETUP_LIGHT = { NOT_STARTED: 'none', IN_PROGRESS: 'warn', COMPLETED: 'good' } as const;
const REVIEW_LIGHT = { PENDING: 'none', CORRECTIONS: 'bad', APPROVED: 'good' } as const;
const REVIEW_LABEL = { PENDING: 'Not checked', CORRECTIONS: 'Corrections required', APPROVED: 'Approved' } as const;

export function ProjectsTab({ id }: { id: string }) {
  const { state, update, session, toast } = useStore();
  const teams = getTeams(state, id);
  const students = getStudents(state, id).filter((x) => x.status === 'ENROLLED');
  const s = summarize(state, id);
  const role = session!.role;
  const [editing, setEditing] = useState<{ team: TeamProject; mode: 'setup' | 'review' } | null>(null);
  const [form, setForm] = useState<Partial<TeamProject>>({});

  const open = (team: TeamProject, mode: 'setup' | 'review') => {
    setEditing({ team, mode });
    setForm(team);
  };
  const save = () => {
    if (!editing) return;
    const key = `${id}|${editing.team.teamNo}`;
    const patch: Partial<TeamProject> =
      editing.mode === 'setup'
        ? { title: form.title, setupStatus: form.setupStatus, setupNotes: form.setupNotes, setupDate: form.setupStatus === 'COMPLETED' ? form.setupDate ?? TODAY : null }
        : { reviewStatus: form.reviewStatus, feedback: form.feedback, corrections: form.reviewStatus === 'CORRECTIONS' ? form.corrections : '', reviewer: session!.name };
    update((x) => ({ ...x, teams: { ...x.teams, [key]: { ...x.teams[key], ...patch } } }));
    toast(editing.mode === 'setup' ? 'Project setup updated' : 'Project review saved');
    setEditing(null);
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <Status light={s.setupLight}>Setup: {s.setupDone}/8 teams complete</Status>
        <Status light={s.reviewLight}>Checking: {s.reviewed}/8 approved</Status>
        {s.corrections > 0 && <Status light="bad">{s.corrections} teams need corrections</Status>}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {teams.map((t) => {
          const members = students.filter((x) => x.teamNo === t.teamNo);
          return (
            <Card key={t.teamNo} title={`Team ${t.teamNo}`} className="flex flex-col">
              <div className="text-sm font-semibold text-brand">{t.title}</div>
              <div className="mt-1 text-xs text-slate-500">{members.map((m) => m.name.split(' ')[0]).join(', ')}</div>
              <div className="mt-3 space-y-2 text-xs">
                <div>
                  <div className="mb-0.5 font-medium text-slate-500">Project setup</div>
                  <Status light={SETUP_LIGHT[t.setupStatus]}>{t.setupStatus.replace('_', ' ').toLowerCase()}</Status>
                  {t.setupDate && <span className="ml-1.5 text-slate-500">{fmtDate(t.setupDate)}</span>}
                  {t.setupNotes && <p className="mt-1 text-slate-600">{t.setupNotes}</p>}
                </div>
                <div>
                  <div className="mb-0.5 font-medium text-slate-500">Project checking</div>
                  <Status light={REVIEW_LIGHT[t.reviewStatus]}>{REVIEW_LABEL[t.reviewStatus]}</Status>
                  {t.reviewer && <span className="ml-1.5 text-slate-500">by {t.reviewer}</span>}
                  {t.feedback && <p className="mt-1 text-slate-600">“{t.feedback}”</p>}
                  {t.corrections && <p className="mt-1 text-bad">Corrections: {t.corrections}</p>}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {can(role, 'updateSetup') && <Button size="sm" variant="outline" onClick={() => open(t, 'setup')}>Update setup</Button>}
                {can(role, 'reviewProjects') && t.setupStatus === 'COMPLETED' && <Button size="sm" onClick={() => open(t, 'review')}>Check project</Button>}
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Team ${editing.team.teamNo} · ${editing.mode === 'setup' ? 'Project setup' : 'Project checking'}` : ''}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save}>Save</Button></>}
      >
        {editing?.mode === 'setup' ? (
          <>
            <Field label="Project title"><Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Setup status">
              <Select className="w-full" value={form.setupStatus} onChange={(e) => setForm({ ...form, setupStatus: e.target.value as TeamProject['setupStatus'] })}>
                <option value="NOT_STARTED">Not started</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
              </Select>
            </Field>
            {form.setupStatus === 'COMPLETED' && <Field label="Setup date"><Input type="date" value={form.setupDate ?? TODAY} onChange={(e) => setForm({ ...form, setupDate: e.target.value })} /></Field>}
            <Field label="Notes"><Textarea rows={2} value={form.setupNotes ?? ''} onChange={(e) => setForm({ ...form, setupNotes: e.target.value })} /></Field>
          </>
        ) : (
          <>
            <Field label="Review status">
              <Select className="w-full" value={form.reviewStatus} onChange={(e) => setForm({ ...form, reviewStatus: e.target.value as TeamProject['reviewStatus'] })}>
                <option value="PENDING">Not checked</option>
                <option value="CORRECTIONS">Corrections required</option>
                <option value="APPROVED">Approved</option>
              </Select>
            </Field>
            <Field label="Feedback"><Textarea rows={2} value={form.feedback ?? ''} onChange={(e) => setForm({ ...form, feedback: e.target.value })} /></Field>
            {form.reviewStatus === 'CORRECTIONS' && <Field label="Corrections required"><Textarea rows={2} value={form.corrections ?? ''} onChange={(e) => setForm({ ...form, corrections: e.target.value })} /></Field>}
            <p className="text-xs text-slate-500">Reviewer: {session!.name}</p>
          </>
        )}
      </Modal>
    </>
  );
}
