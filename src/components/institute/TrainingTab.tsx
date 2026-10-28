'use client';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { SLOT_LABEL, TOTAL_SESSIONS, instructorById, sessionModules } from '@/lib/data';
import { bookingView, bookingsOf, can, getStudents, isPresent, summarize, type BookingView, type Light } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, fmtDate, fmtDay } from '@/lib/util';
import { Button, Card, Empty, Progress, Status, Table, Td, Th } from '../ui';

export const VIEW_LIGHT: Record<BookingView, Light> = {
  'Pending approval': 'warn',
  Confirmed: 'good',
  Rescheduled: 'warn',
  Completed: 'good',
  'Attendance missing': 'bad',
  Cancelled: 'none',
};

export function TrainingTab({ id }: { id: string }) {
  const { state, session } = useStore();
  const s = summarize(state, id);
  const bookings = bookingsOf(state, id);
  const students = getStudents(state, id).filter((x) => x.status === 'ENROLLED');
  const [open, setOpen] = useState<string | null>(null);
  const role = session!.role;
  const canRollCall = can(role, 'markAttendance') && (role === 'ADMIN' || s.inst.instructorId === session!.refId);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Training overview" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div><div className="text-xs text-slate-500">Planned dates</div><div className="font-semibold">{bookings.filter((b) => b.status !== 'CANCELLED').length}/{TOTAL_SESSIONS} booked</div></div>
            <div><div className="text-xs text-slate-500">Actual sessions held</div><div className="font-semibold">{s.sessionsHeld}/{TOTAL_SESSIONS}</div></div>
            <div><div className="text-xs text-slate-500">Assigned instructor</div><div className="font-semibold">{s.instructorName}</div></div>
            <div><div className="text-xs text-slate-500">Status</div><Status light={s.trainingLight}>{s.training}</Status></div>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500"><span>Topics covered</span><span>{s.topicsCovered}/10 modules</span></div>
            <Progress value={s.topicsCovered * 10} />
          </div>
        </Card>
        <Card title="Actions">
          <div className="flex flex-col gap-2">
            {role === 'INSTITUTE' && <Link href="/scheduling"><Button variant="accent" className="w-full">Book / view training dates</Button></Link>}
            {(role === 'ADMIN' || role === 'DEPARTMENT') && <Link href={`/scheduling?institute=${id}`}><Button variant="outline" className="w-full">Manage bookings</Button></Link>}
            {canRollCall && s.nextSession && s.nextSession.date === TODAY && (
              <Link href={`/roll-call?booking=${s.nextSession.id}`}><Button className="w-full">Take today&apos;s roll call</Button></Link>
            )}
          </div>
        </Card>
      </div>

      <Card title="Session-wise schedule & attendance">
        {bookings.length === 0 ? (
          <Empty>No training dates booked yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Date & time</Th>
                <Th>Instructor</Th>
                <Th>Status</Th>
                <Th>Topics</Th>
                <Th>Present</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => {
                const v = bookingView(b);
                const present = b.attendanceMarked ? students.filter((st) => isPresent(state, b, st)).length : null;
                return (
                  <Fragment key={b.id}>
                    <tr className={b.status === 'CANCELLED' ? 'opacity-60' : ''}>
                      <Td className="font-medium">S{b.sessionNo}</Td>
                      <Td className="whitespace-nowrap">{fmtDay(b.date)}<div className="text-xs text-slate-500">{SLOT_LABEL[b.slot]}</div></Td>
                      <Td>{instructorById.get(b.instructorId)!.name}</Td>
                      <Td><Status light={VIEW_LIGHT[v]}>{v}</Status></Td>
                      <Td className="max-w-[260px] text-xs text-slate-600">{b.topics.length ? b.topics.join(', ') : <span className="text-slate-400">Planned: {sessionModules(b.sessionNo).join(', ')}</span>}</Td>
                      <Td className="tabular-nums">{present === null ? '—' : `${present}/${students.length}`}</Td>
                      <Td>
                        <div className="flex justify-end gap-2">
                          {canRollCall && b.status === 'CONFIRMED' && b.date <= TODAY && (
                            <Link href={`/roll-call?booking=${b.id}`} className="text-xs font-semibold text-accent hover:underline">
                              {b.attendanceMarked ? 'Edit attendance' : 'Mark attendance'}
                            </Link>
                          )}
                          <button onClick={() => setOpen(open === b.id ? null : b.id)} className="text-xs text-slate-500 hover:underline">
                            History
                          </button>
                        </div>
                      </Td>
                    </tr>
                    {open === b.id && (
                      <tr>
                        <td colSpan={7} className="bg-slate-50 px-4 py-2">
                          <ul className="space-y-1 text-xs text-slate-600">
                            {b.history.map((h, i) => (
                              <li key={i}>
                                <b>{fmtDate(h.at)}</b> · {h.action.toLowerCase()} by {h.by}
                                {h.remarks && <> · <i>{h.remarks}</i></>}
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
