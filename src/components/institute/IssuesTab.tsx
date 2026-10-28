'use client';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { instituteById, type Issue } from '@/lib/data';
import { can, scopedInstitutes } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, addDays, fmtDate } from '@/lib/util';
import { Button, Card, Field, Input, Modal, Select, Status, Table, Td, Textarea, Th } from '../ui';

const CATEGORIES: Issue['category'][] = ['Kit', 'Training', 'Attendance', 'Project', 'Marks', 'Other'];

export function IssuesTab({ instituteId }: { instituteId?: string }) {
  const { state, update, session, toast } = useStore();
  const role = session!.role;
  const scopeIds = useMemo(() => new Set(scopedInstitutes(session!).map((i) => i.id)), [session]);
  const [status, setStatus] = useState('OPEN');
  const [category, setCategory] = useState('');
  const [adding, setAdding] = useState(false);
  const [closing, setClosing] = useState<Issue | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [form, setForm] = useState({ instituteId: instituteId ?? '', category: 'Other' as Issue['category'], title: '', owner: '', targetDate: addDays(TODAY, 7) });

  const list = state.issues
    .filter((i) => (instituteId ? i.instituteId === instituteId : scopeIds.has(i.instituteId)))
    .filter((i) => (status === 'OVERDUE' ? i.status === 'OPEN' && i.targetDate < TODAY : !status || i.status === status))
    .filter((i) => !category || i.category === category)
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));

  const add = () => {
    if (!form.title.trim() || !form.instituteId) return toast('Institute and description are required', 'error');
    update((s) => ({
      ...s,
      seq: s.seq + 1,
      issues: [...s.issues, {
        id: `iss-new-${s.seq}`, instituteId: form.instituteId, category: form.category, title: form.title.trim(),
        owner: form.owner || session!.name, targetDate: form.targetDate, status: 'OPEN', createdOn: TODAY, closedOn: null, remarks: `Raised by ${session!.name}`,
      }],
    }));
    toast('Follow-up item created');
    setAdding(false);
    setForm({ ...form, title: '', owner: '' });
  };
  const close = () => {
    if (!closing) return;
    update((s) => ({ ...s, issues: s.issues.map((i) => (i.id === closing.id ? { ...i, status: 'CLOSED', closedOn: TODAY, remarks: closeNote || 'Closed' } : i)) }));
    toast('Issue closed');
    setClosing(null);
    setCloseNote('');
  };

  return (
    <Card
      title={`Issues & follow-up (${list.length})`}
      action={
        <div className="flex flex-wrap gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="py-1.5 text-xs">
            <option value="OPEN">Open</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CLOSED">Closed</option>
            <option value="">All</option>
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="py-1.5 text-xs">
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          {can(role, 'manageIssues') && <Button size="sm" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" /> New issue</Button>}
        </div>
      }
    >
      <Table>
        <thead>
          <tr>
            {!instituteId && <Th>Institute</Th>}
            <Th>Category</Th>
            <Th>Pending action</Th>
            <Th>Responsible</Th>
            <Th>Target date</Th>
            <Th>Status</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {list.slice(0, 200).map((i) => {
            const overdue = i.status === 'OPEN' && i.targetDate < TODAY;
            const inst = instituteById.get(i.instituteId)!;
            return (
              <tr key={i.id} className="hover:bg-slate-50">
                {!instituteId && (
                  <Td><Link href={`/institute?id=${inst.id}&tab=issues`} className="font-medium text-brand hover:underline">{inst.code}</Link></Td>
                )}
                <Td>{i.category}</Td>
                <Td className="max-w-[360px]">{i.title}<div className="text-xs text-slate-400">{i.remarks}</div></Td>
                <Td className="text-slate-600">{i.owner}</Td>
                <Td className={overdue ? 'font-semibold text-bad' : ''}>{fmtDate(i.targetDate)}</Td>
                <Td>
                  {i.status === 'CLOSED' ? <Status light="good">Closed {fmtDate(i.closedOn)}</Status> : overdue ? <Status light="bad">Overdue</Status> : <Status light="warn">Open</Status>}
                </Td>
                <Td>{i.status === 'OPEN' && can(role, 'manageIssues') && <Button size="sm" variant="outline" onClick={() => setClosing(i)}>Close</Button>}</Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      {list.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No issues.</p>}

      <Modal open={adding} onClose={() => setAdding(false)} title="New follow-up item" footer={<><Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button><Button onClick={add}>Create</Button></>}>
        {!instituteId && (
          <Field label="Institute">
            <Select className="w-full" value={form.instituteId} onChange={(e) => setForm({ ...form, instituteId: e.target.value })}>
              <option value="">Choose…</option>
              {scopedInstitutes(session!).map((x) => <option key={x.id} value={x.id}>{x.code} · {x.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Category">
          <Select className="w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Issue['category'] })}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Pending action"><Textarea rows={2} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <Field label="Responsible person"><Input value={form.owner} placeholder={session!.name} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></Field>
        <Field label="Target date"><Input type="date" value={form.targetDate} onChange={(e) => setForm({ ...form, targetDate: e.target.value })} /></Field>
      </Modal>
      <Modal open={!!closing} onClose={() => setClosing(null)} title="Close issue" footer={<><Button variant="ghost" onClick={() => setClosing(null)}>Cancel</Button><Button onClick={close}>Close issue</Button></>}>
        <p className="text-sm text-slate-600">{closing?.title}</p>
        <Field label="Closure remarks"><Textarea rows={2} value={closeNote} onChange={(e) => setCloseNote(e.target.value)} /></Field>
      </Modal>
    </Card>
  );
}
