'use client';
import { BadgeCheck, Download, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { TARGET_BATCH, TOTAL_SESSIONS, type Student } from '@/lib/data';
import { activeBookings, can, getMarks, getStudents, isPresent, summarize } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, cx, downloadCSV, pct } from '@/lib/util';
import { Badge, Button, Card, Field, Input, Modal, Progress, Select, StatTile, Status, Table, Td, Th } from '../ui';

export const ABC_RE = /^\d{12}$/;

export function BatchTab({ id }: { id: string }) {
  const { state, update, session, toast } = useStore();
  const s = summarize(state, id);
  const role = session!.role;
  const all = getStudents(state, id);
  const held = activeBookings(state, id).filter((b) => b.status === 'CONFIRMED' && b.date <= TODAY && b.attendanceMarked);
  const [filter, setFilter] = useState('all');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', abcId: '', teamNo: '1' });
  const [err, setErr] = useState('');

  const rows = all.filter((st) => {
    if (filter === 'abc_missing') return !st.abcId;
    if (filter === 'abc_unverified') return !!st.abcId && !st.abcVerified;
    if (filter === 'low_att') {
      const p = held.filter((b) => isPresent(state, b, st)).length;
      return held.length > 0 && pct(p, held.length) < 75;
    }
    if (filter === 'dropped') return st.status === 'DROPPED';
    return true;
  });

  const patchStudent = (sid: string, p: Partial<Student>) =>
    update((x) => ({ ...x, students: { ...x.students, [sid]: { ...x.students[sid], ...p } } }));

  const add = () => {
    if (!form.name.trim()) return setErr('Name is required');
    if (form.abcId && !ABC_RE.test(form.abcId)) return setErr('ABC ID must be exactly 12 digits');
    if (form.abcId && all.some((x) => x.abcId === form.abcId)) return setErr('This ABC ID is already registered to another student');
    update((x) => {
      const n = x.extraStudents.filter((e) => e.instituteId === id).length + 1;
      const st: Student = {
        id: `${id}-x${n}`, instituteId: id, name: form.name.trim(), rollNo: `${s.inst.code}-N${n}`, teamNo: Number(form.teamNo),
        abcId: form.abcId || null, abcVerified: false, status: 'ENROLLED', propensity: 0.9, email: '',
      };
      return { ...x, extraStudents: [...x.extraStudents, st] };
    });
    toast('Student added to batch');
    setAdding(false);
    setForm({ name: '', abcId: '', teamNo: '1' });
    setErr('');
  };

  const exportRoster = () =>
    downloadCSV(`${s.inst.code}-batch-${TODAY}.csv`, [
      ['Roll no', 'Name', 'Team', 'ABC ID', 'ABC verified', 'Status', ...held.map((b) => `S${b.sessionNo}`), 'Attendance %', 'Marks', 'Marks status'],
      ...all.map((st) => {
        const p = held.filter((b) => isPresent(state, b, st)).length;
        const m = getMarks(state, st);
        return [st.rollNo, st.name, st.teamNo, st.abcId ?? '', st.abcVerified ? 'Yes' : 'No', st.status,
          ...held.map((b) => (isPresent(state, b, st) ? 'P' : 'A')), held.length ? pct(p, held.length) : '', m.marks ?? '', m.status];
      }),
    ]);

  const pendingActions = [
    s.enrolled < TARGET_BATCH && `${TARGET_BATCH - s.enrolled} seats unfilled`,
    s.abcMissing > 0 && `${s.abcMissing} ABC IDs missing`,
    s.abcUnverified > 0 && `${s.abcUnverified} ABC IDs to verify`,
    s.missingAttendance > 0 && `${s.missingAttendance} session(s) attendance not marked`,
    s.sessionsBooked < TOTAL_SESSIONS && `${TOTAL_SESSIONS - s.sessionsBooked} session(s) not booked`,
    s.marksLight === 'bad' && `${s.enrolled - s.marksEntered} marks not entered`,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <StatTile label="Total enrolled" value={s.enrolled} />
        <StatTile label="Target batch size" value={TARGET_BATCH} sub={`${pct(s.enrolled, TARGET_BATCH)}% filled`} />
        <StatTile label="Session attendance" value={s.attendancePct === null ? '—' : `${s.attendancePct}%`} sub={`${s.sessionsHeld} sessions held`} />
        <StatTile label="Training progress" value={`${s.topicsCovered * 10}%`} sub={`${s.topicsCovered}/10 modules`} />
        <StatTile label="Project setup" value={`${s.setupDone}/8`} sub="teams" />
        <StatTile label="Project checking" value={`${s.reviewed}/8`} sub="approved" />
        <StatTile label="Marks entered" value={`${s.marksEntered}/${s.enrolled}`} />
        <StatTile label="Students completed" value={s.completedStudents} />
      </div>

      {pendingActions.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-warn">Pending actions</div>
          <div className="flex flex-wrap gap-1.5">
            {pendingActions.map((a) => <Status key={a} light="warn">{a}</Status>)}
          </div>
        </div>
      )}

      <Card
        title={`Batch roster · ${s.inst.code}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="py-1.5 text-xs">
              <option value="all">All students ({all.length})</option>
              <option value="abc_missing">ABC ID missing</option>
              <option value="abc_unverified">ABC ID not verified</option>
              <option value="low_att">Attendance below 75%</option>
              <option value="dropped">Dropped</option>
            </Select>
            <Button size="sm" variant="outline" onClick={exportRoster}><Download className="h-3.5 w-3.5" /> Export</Button>
            {can(role, 'editRoster') && <Button size="sm" onClick={() => setAdding(true)}><UserPlus className="h-3.5 w-3.5" /> Add student</Button>}
          </div>
        }
      >
        <Table>
          <thead>
            <tr>
              <Th>Roll no</Th>
              <Th>Student</Th>
              <Th>Team</Th>
              <Th>ABC ID</Th>
              {held.map((b) => <Th key={b.id} className="text-center">S{b.sessionNo}</Th>)}
              <Th>Attendance</Th>
              <Th>Marks</Th>
              <Th>Status</Th>
              {(can(role, 'editRoster') || can(role, 'verifyAbc')) && <Th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((st) => {
              const present = held.filter((b) => isPresent(state, b, st)).length;
              const ap = held.length ? pct(present, held.length) : null;
              const m = getMarks(state, st);
              const dropped = st.status === 'DROPPED';
              return (
                <tr key={st.id} className={cx('hover:bg-slate-50', dropped && 'opacity-50')}>
                  <Td className="text-xs text-slate-500">{st.rollNo}</Td>
                  <Td className="font-medium">{st.name}</Td>
                  <Td>T{st.teamNo}</Td>
                  <Td>
                    {st.abcId ? (
                      <span className="flex items-center gap-1.5">
                        <code className="text-xs">{st.abcId}</code>
                        {st.abcVerified ? <BadgeCheck className="h-4 w-4 text-ok" aria-label="Verified" /> : <Badge tone="accent">Unverified</Badge>}
                      </span>
                    ) : (
                      <Status light="bad">Missing</Status>
                    )}
                  </Td>
                  {held.map((b) =>
                    isPresent(state, b, st) ? (
                      <Td key={b.id} className="text-center text-ok" ><span aria-label="present">✓</span></Td>
                    ) : (
                      <Td key={b.id} className="text-center font-bold text-bad"><span aria-label="absent">✗</span></Td>
                    ),
                  )}
                  <Td className="min-w-[110px]">
                    {ap === null ? '—' : (
                      <div>
                        <span className={cx('text-xs font-semibold tabular-nums', ap < 75 && 'text-bad')}>{ap}%</span>
                        <Progress value={ap} light={ap >= 75 ? 'good' : 'warn'} />
                      </div>
                    )}
                  </Td>
                  <Td className="tabular-nums">{m.marks ?? '—'}</Td>
                  <Td>{dropped ? <Status light="none">Dropped</Status> : <Status light="good">Enrolled</Status>}</Td>
                  {(can(role, 'editRoster') || can(role, 'verifyAbc')) && (
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        {can(role, 'verifyAbc') && st.abcId && !st.abcVerified && (
                          <Button size="sm" variant="outline" onClick={() => { patchStudent(st.id, { abcVerified: true }); toast(`ABC ID verified for ${st.name}`); }}>Verify ABC</Button>
                        )}
                        {can(role, 'editRoster') && (
                          <Button size="sm" variant="ghost" onClick={() => patchStudent(st.id, { status: dropped ? 'ENROLLED' : 'DROPPED' })}>
                            {dropped ? 'Re-enrol' : 'Mark dropped'}
                          </Button>
                        )}
                      </div>
                    </Td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Add student to batch"
        footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={add}>Add student</Button></>}
      >
        <Field label="Full name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="ABC ID (12 digits)" hint="Optional now; the student can also register it from their own login."><Input inputMode="numeric" maxLength={12} value={form.abcId} onChange={(e) => setForm({ ...form, abcId: e.target.value.replace(/\D/g, '') })} /></Field>
        <Field label="Team">
          <Select value={form.teamNo} onChange={(e) => setForm({ ...form, teamNo: e.target.value })} className="w-full">
            {Array.from({ length: 8 }, (_, i) => <option key={i} value={i + 1}>Team {i + 1}</option>)}
          </Select>
        </Field>
        {err && <p className="text-sm text-bad">{err}</p>}
      </Modal>
    </div>
  );
}
