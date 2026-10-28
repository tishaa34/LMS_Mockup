'use client';
import { useState } from 'react';
import type { Kit } from '@/lib/data';
import { can, getInstitute } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, addDays, fmtDate } from '@/lib/util';
import { Button, Card, Field, Modal, Note, Status, Table, Td, Textarea, Th } from '../ui';
import type { Light } from '@/lib/logic';

const KIT_STATUS: Record<Kit['status'], { label: string; light: Light }> = {
  NOT_DISPATCHED: { label: 'Not dispatched', light: 'bad' },
  DISPATCHED: { label: 'In transit', light: 'warn' },
  DELIVERED: { label: 'Delivered · awaiting confirmation', light: 'warn' },
  CONFIRMED: { label: 'Received & confirmed', light: 'good' },
  ISSUE: { label: 'Issue reported', light: 'bad' },
};

export function KitTab({ id }: { id: string }) {
  const { state, update, session, toast } = useStore();
  const inst = getInstitute(state, id);
  const kits = state.kits.filter((k) => k.instituteId === id);
  const [issueFor, setIssueFor] = useState<Kit | null>(null);
  const [issueText, setIssueText] = useState('');
  const role = session!.role;

  const patch = (kid: string, p: Partial<Kit>) => update((s) => ({ ...s, kits: s.kits.map((k) => (k.id === kid ? { ...k, ...p } : k)) }));

  const reportIssue = () => {
    if (!issueFor || !issueText.trim()) return;
    update((s) => ({
      ...s,
      seq: s.seq + 1,
      kits: s.kits.map((k) => (k.id === issueFor.id ? { ...k, status: 'ISSUE', issue: issueText } : k)),
      issues: [
        ...s.issues,
        {
          id: `iss-new-${s.seq}`, instituteId: id, category: 'Kit', title: `${issueFor.type}: ${issueText}`, owner: 'Logistics team',
          targetDate: addDays(TODAY, 5), status: 'OPEN', createdOn: TODAY, closedOn: null, remarks: `Reported by ${session!.name}`,
        },
      ],
    }));
    toast('Issue reported. A follow-up item was created for the logistics team.');
    setIssueFor(null);
    setIssueText('');
  };

  return (
    <Card title="Kit delivery">
      {role === 'INSTITUTE' && <div className="mb-3"><Note>When a kit arrives, check the contents and confirm receipt, or report a problem. Problems automatically create a follow-up issue.</Note></div>}
      <Table>
        <thead>
          <tr>
            <Th>Kit type</Th>
            <Th className="text-right">Qty</Th>
            <Th>Dispatched</Th>
            <Th>Delivered</Th>
            <Th>Status</Th>
            <Th>Confirmed by / issue</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {kits.map((k) => (
            <tr key={k.id}>
              <Td className="font-medium">{k.type}</Td>
              <Td className="text-right tabular-nums">{k.qty}</Td>
              <Td>{fmtDate(k.dispatchDate)}</Td>
              <Td>{fmtDate(k.deliveryDate)}</Td>
              <Td><Status light={KIT_STATUS[k.status].light}>{KIT_STATUS[k.status].label}</Status></Td>
              <Td className="max-w-[260px] text-xs text-slate-600">{k.status === 'ISSUE' ? <span className="text-bad">{k.issue}</span> : k.confirmedBy ?? '—'}</Td>
              <Td>
                <div className="flex flex-wrap justify-end gap-1.5">
                  {can(role, 'manageKit') && k.status === 'NOT_DISPATCHED' && (
                    <Button size="sm" variant="outline" onClick={() => { patch(k.id, { status: 'DISPATCHED', dispatchDate: TODAY }); toast('Marked as dispatched'); }}>Mark dispatched</Button>
                  )}
                  {can(role, 'manageKit') && k.status === 'DISPATCHED' && (
                    <Button size="sm" variant="outline" onClick={() => { patch(k.id, { status: 'DELIVERED', deliveryDate: TODAY }); toast('Marked as delivered'); }}>Mark delivered</Button>
                  )}
                  {can(role, 'confirmKit') && k.status === 'DELIVERED' && (
                    <>
                      <Button size="sm" onClick={() => { patch(k.id, { status: 'CONFIRMED', confirmedBy: `${session!.name} · ${fmtDate(TODAY)}` }); toast('Kit receipt confirmed'); }}>Confirm receipt</Button>
                      <Button size="sm" variant="outline" onClick={() => setIssueFor(k)}>Report issue</Button>
                    </>
                  )}
                  {can(role, 'manageKit') && k.status === 'ISSUE' && (
                    <Button size="sm" variant="outline" onClick={() => { patch(k.id, { status: 'CONFIRMED', confirmedBy: `Replacement received · ${fmtDate(TODAY)}`, issue: null }); toast('Issue resolved'); }}>Mark resolved</Button>
                  )}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-xs text-slate-500">Delivery address: {inst.address}</p>
      <Modal
        open={!!issueFor}
        onClose={() => setIssueFor(null)}
        title={`Report issue · ${issueFor?.type ?? ''}`}
        footer={<><Button variant="ghost" onClick={() => setIssueFor(null)}>Cancel</Button><Button variant="danger" onClick={reportIssue}>Report issue</Button></>}
      >
        <Field label="What is wrong?">
          <Textarea rows={3} value={issueText} onChange={(e) => setIssueText(e.target.value)} placeholder="e.g. 2 ultrasonic sensors missing, 1 motor driver damaged" />
        </Field>
      </Modal>
    </Card>
  );
}
