'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { VIEW_LIGHT } from '@/components/institute/TrainingTab';
import { Card, PageHeader, Select, Status, Table, Td, Th } from '@/components/ui';
import { SLOT_LABEL, instituteById } from '@/lib/data';
import { bookingView } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, fmtDay } from '@/lib/util';

export default function SessionsPage() {
  return (
    <AppShell roles={['INSTRUCTOR']}>
      <Sessions />
    </AppShell>
  );
}

function Sessions() {
  const { state, session } = useStore();
  const [filter, setFilter] = useState('upcoming');
  const rows = state.bookings
    .filter((b) => b.instructorId === session!.refId && b.status !== 'CANCELLED')
    .filter((b) => {
      if (filter === 'upcoming') return b.date >= TODAY;
      if (filter === 'missing') return b.status === 'CONFIRMED' && b.date <= TODAY && !b.attendanceMarked;
      if (filter === 'past') return b.date < TODAY;
      return true;
    })
    .sort((a, b) => (filter === 'past' ? -1 : 1) * (a.date + a.slot).localeCompare(b.date + b.slot));

  return (
    <>
      <PageHeader title="My Sessions" sub="Take roll call, record topics covered" />
      <Card
        action={
          <Select value={filter} onChange={(e) => setFilter(e.target.value)} className="py-1.5 text-xs">
            <option value="upcoming">Today & upcoming</option>
            <option value="missing">Attendance not marked</option>
            <option value="past">Past</option>
            <option value="all">All</option>
          </Select>
        }
        title={`${rows.length} sessions`}
      >
        <Table>
          <thead>
            <tr>
              <Th>Date</Th>
              <Th>Institute</Th>
              <Th>Session</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const inst = instituteById.get(b.instituteId)!;
              const v = bookingView(b);
              return (
                <tr key={b.id} className={b.date === TODAY ? 'bg-accent-50/50' : ''}>
                  <Td className="whitespace-nowrap">{fmtDay(b.date)}{b.date === TODAY && <span className="ml-1.5 text-xs font-bold text-accent">TODAY</span>}<div className="text-xs text-slate-500">{SLOT_LABEL[b.slot]}</div></Td>
                  <Td><Link href={`/institute?id=${inst.id}&tab=training`} className="font-medium text-brand hover:underline">{inst.code}</Link><div className="max-w-[260px] truncate text-xs text-slate-500">{inst.name}</div></Td>
                  <Td>S{b.sessionNo}</Td>
                  <Td><Status light={VIEW_LIGHT[v]}>{v}</Status></Td>
                  <Td>
                    {b.status === 'CONFIRMED' && b.date <= TODAY && (
                      <Link href={`/roll-call?booking=${b.id}`} className="text-xs font-semibold text-accent hover:underline">
                        {b.attendanceMarked ? 'Edit attendance' : 'Take roll call'}
                      </Link>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
