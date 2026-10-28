'use client';
import { useState } from 'react';
import type { Marks } from '@/lib/data';
import { can, getMarks, getStudents, studentProgress, summarize } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { Button, Card, Input, Note, Status, Table, Td, Th } from '../ui';

export function MarksTab({ id }: { id: string }) {
  const { state, update, session, toast } = useStore();
  const role = session!.role;
  const s = summarize(state, id);
  const students = getStudents(state, id).filter((x) => x.status === 'ENROLLED');
  const editable = can(role, 'enterMarks');
  const [draft, setDraft] = useState<Record<string, { marks: string; remarks: string }>>({});

  const dirty = Object.keys(draft).length;
  const saveAll = () => {
    const bad = Object.values(draft).some((d) => d.marks !== '' && (isNaN(Number(d.marks)) || Number(d.marks) < 0 || Number(d.marks) > 100));
    if (bad) return toast('Marks must be between 0 and 100', 'error');
    update((x) => {
      const marks = { ...x.marks };
      for (const [sid, d] of Object.entries(draft)) {
        const st = students.find((y) => y.id === sid)!;
        const prev = getMarks(x, st);
        marks[sid] = {
          marks: d.marks === '' ? null : Number(d.marks),
          status: d.marks === '' ? 'NOT_ENTERED' : 'ENTERED',
          evaluator: session!.name,
          remarks: d.remarks || prev.remarks,
        };
      }
      return { ...x, marks };
    });
    toast(`Saved marks for ${dirty} student(s)`);
    setDraft({});
  };
  const verifyAll = () => {
    update((x) => {
      const marks = { ...x.marks };
      for (const st of students) {
        const m = getMarks(x, st);
        if (m.status === 'ENTERED') marks[st.id] = { ...m, status: 'VERIFIED' } as Marks;
      }
      return { ...x, marks };
    });
    toast('All entered marks verified');
  };

  return (
    <Card
      title={`Marks & assessment · ${s.marksEntered}/${s.enrolled} entered`}
      action={
        <div className="flex gap-2">
          {can(role, 'verifyMarks') && <Button size="sm" variant="outline" onClick={verifyAll}>Verify all entered</Button>}
          {editable && <Button size="sm" disabled={!dirty} onClick={saveAll}>Save {dirty ? `(${dirty})` : ''}</Button>}
        </div>
      }
    >
      {editable && <div className="mb-3"><Note>Enter assessment marks out of 100. A student completes the program with all 5 sessions held, at least 75% attendance and 40 marks or more.</Note></div>}
      <Table>
        <thead>
          <tr>
            <Th>Roll no</Th>
            <Th>Student</Th>
            <Th>Attendance</Th>
            <Th>Marks (/100)</Th>
            <Th>Assessment status</Th>
            <Th>Evaluator</Th>
            <Th>Remarks</Th>
            <Th>Completion</Th>
          </tr>
        </thead>
        <tbody>
          {students.map((st) => {
            const m = getMarks(state, st);
            const p = studentProgress(state, st);
            const d = draft[st.id];
            return (
              <tr key={st.id}>
                <Td className="text-xs text-slate-500">{st.rollNo}</Td>
                <Td className="font-medium">{st.name}</Td>
                <Td className="tabular-nums">{p.attendance === null ? '—' : `${p.attendance}%`}</Td>
                <Td>
                  {editable ? (
                    <Input
                      className="w-20 py-1"
                      inputMode="numeric"
                      value={d ? d.marks : m.marks ?? ''}
                      onChange={(e) => setDraft({ ...draft, [st.id]: { marks: e.target.value.replace(/[^\d]/g, ''), remarks: d?.remarks ?? m.remarks } })}
                    />
                  ) : (
                    <span className="tabular-nums">{m.marks ?? '—'}</span>
                  )}
                </Td>
                <Td>
                  <Status light={m.status === 'NOT_ENTERED' ? (s.training === 'Completed' ? 'bad' : 'none') : m.status === 'VERIFIED' ? 'good' : 'warn'}>
                    {m.status === 'NOT_ENTERED' ? 'Not entered' : m.status === 'VERIFIED' ? 'Verified' : 'Entered'}
                  </Status>
                </Td>
                <Td className="text-slate-600">{m.evaluator ?? '—'}</Td>
                <Td>
                  {editable ? (
                    <Input
                      className="w-48 py-1"
                      value={d ? d.remarks : m.remarks}
                      onChange={(e) => setDraft({ ...draft, [st.id]: { marks: d?.marks ?? (m.marks === null ? '' : String(m.marks)), remarks: e.target.value } })}
                    />
                  ) : (
                    <span className="text-xs text-slate-600">{m.remarks || '—'}</span>
                  )}
                </Td>
                <Td>{p.completed ? <Status light="good">Completed</Status> : <Status light="none">Not yet</Status>}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}
