'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { VIEW_LIGHT } from '@/components/institute/TrainingTab';
import { SlotCalendar, SlotLegend } from '@/components/SlotCalendar';
import { Button, Card, Field, Input, Modal, Note, PageHeader, Select, Status, Table, Tabs, Td, Textarea, Th } from '@/components/ui';
import { BOOKING_CUTOFF_DAYS, SLOT_LABEL, TOTAL_SESSIONS, departments, instituteById, instructorById, type Booking, type Institute, type Slot } from '@/lib/data';
import {
  activeBookings, bookingEvent, bookingView, bookingsOf, can, getInstitute, patchBooking, requestBooking, rescheduleBooking,
  scopedInstitutes, slotInfo, type BookingView, type SlotInfo,
} from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, fmtDate, fmtDay } from '@/lib/util';

export default function SchedulingPage() {
  return (
    <AppShell roles={['ADMIN', 'DEPARTMENT', 'INSTITUTE']}>
      <Suspense>
        <Scheduling />
      </Suspense>
    </AppShell>
  );
}

function Scheduling() {
  const { session } = useStore();
  return session!.role === 'INSTITUTE' ? <InstituteBooking /> : <BookingAdmin />;
}

/** Book / view a slot for one institute. Used by the institute coordinator and by admins booking on an institute's behalf. */
function BookingCalendar({ inst, asAdmin }: { inst: Institute; asAdmin: boolean }) {
  const { state, update, session, toast } = useStore();
  const [pick, setPick] = useState<{ date: string; slot: Slot; info: SlotInfo } | null>(null);
  const [remarks, setRemarks] = useState('');
  const booked = activeBookings(state, inst.id);
  const instructor = instructorById.get(inst.instructorId)!;

  const confirm = () => {
    if (!pick) return;
    const res = requestBooking(state, inst, pick.date, pick.slot, session!.name, asAdmin);
    if (typeof res === 'string') {
      toast(res, 'error');
    } else {
      update(() => res);
      toast(res.bookings[res.bookings.length - 1].status === 'PENDING' ? 'Request sent to the Department Coordinator for approval' : 'Booking confirmed. The slot is now blocked for other institutes in this department.');
    }
    setPick(null);
  };
  const cancel = (b: Booking) => {
    update((s) => patchBooking(s, b.id, { status: 'CANCELLED' }, bookingEvent(session!.name, 'CANCELLED', remarks || 'Cancelled by institute')));
    toast('Booking cancelled. The slot is open again for other institutes.');
    setPick(null);
    setRemarks('');
  };

  const mine = pick?.info.booking;
  const canCancelMine = mine && mine.instituteId === inst.id && (asAdmin || mine.date >= TODAY);

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-600">
          <b className="text-brand">{booked.length}/{TOTAL_SESSIONS}</b> sessions booked · Instructor <b>{instructor.name}</b>
        </div>
        <SlotLegend />
      </div>
      <SlotCalendar inst={inst} onPick={(date, slot, info) => setPick({ date, slot, info })} showWho={asAdmin} />

      <Modal
        open={!!pick}
        onClose={() => setPick(null)}
        title={pick ? `${fmtDay(pick.date)} · ${SLOT_LABEL[pick.slot]}` : ''}
        footer={
          pick?.info.state === 'available' ? (
            <>
              <Button variant="ghost" onClick={() => setPick(null)}>Cancel</Button>
              <Button variant="accent" onClick={confirm} disabled={booked.length >= TOTAL_SESSIONS}>
                {asAdmin ? 'Create confirmed booking' : state.settings.requireApproval ? 'Send booking request' : 'Book this slot'}
              </Button>
            </>
          ) : canCancelMine ? (
            <>
              <Button variant="ghost" onClick={() => setPick(null)}>Close</Button>
              <Button variant="danger" onClick={() => cancel(mine!)}>Cancel booking</Button>
            </>
          ) : undefined
        }
      >
        {pick?.info.state === 'available' && (
          <div className="space-y-2 text-sm">
            <p>
              Book <b>Session {Math.min(booked.length + 1, TOTAL_SESSIONS)} of {TOTAL_SESSIONS}</b> for <b>{inst.name}</b>.
            </p>
            <p className="text-slate-600">Instructor: {instructor.name} · {instructor.phone}</p>
            {booked.length >= TOTAL_SESSIONS && <p className="text-bad">All sessions are already booked.</p>}
            <Note>
              Once booked, this slot is blocked for the other institutes in the {departments.find((d) => d.id === inst.departmentId)!.name} department.
              {!asAdmin && state.settings.requireApproval && ' The Department Coordinator will confirm the request.'}
            </Note>
          </div>
        )}
        {mine && (
          <div className="space-y-2 text-sm">
            {mine.instituteId === inst.id ? (
              <>
                <p>Session {mine.sessionNo} · <Status light={VIEW_LIGHT[bookingView(mine)]}>{bookingView(mine)}</Status></p>
                <p className="text-slate-600">Requested on {fmtDate(mine.requestedOn)}</p>
                {canCancelMine && <Field label="Cancellation remarks"><Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>}
              </>
            ) : (
              <p>Booked by <b>{instituteById.get(mine.instituteId)!.code} · {instituteById.get(mine.instituteId)!.name}</b>.</p>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

function InstituteBooking() {
  const { state, session } = useStore();
  const inst = getInstitute(state, session!.refId);
  const list = bookingsOf(state, inst.id);
  return (
    <>
      <PageHeader title="Book Training Dates" sub={`${inst.name} · ${inst.code}`} />
      <div className="mb-4">
        <Note>
          Choose {TOTAL_SESSIONS} training sessions. Only slots where your assigned instructor is available and no other institute in your department has
          booked are open. Bookings close {BOOKING_CUTOFF_DAYS} days before the date.
        </Note>
      </div>
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card>
          <BookingCalendar inst={inst} asAdmin={false} />
        </Card>
        <Card title="My bookings">
          {list.length === 0 ? (
            <p className="text-sm text-slate-500">No sessions booked yet. Click a green slot on the calendar.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((b) => (
                <li key={b.id} className="rounded-lg border border-slate-200 p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">Session {b.sessionNo}</span>
                    <Status light={VIEW_LIGHT[bookingView(b)]}>{bookingView(b)}</Status>
                  </div>
                  <div className="text-xs text-slate-500">{fmtDay(b.date)} · {SLOT_LABEL[b.slot]}</div>
                  {b.history.filter((h) => h.remarks).slice(-1).map((h, i) => <div key={i} className="mt-1 text-xs italic text-slate-500">“{h.remarks}”</div>)}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function BookingAdmin() {
  const { state, update, session, toast } = useStore();
  const params = useSearchParams();
  const scope = useMemo(() => scopedInstitutes(session!), [session]);
  const ids = useMemo(() => new Set(scope.map((i) => i.id)), [scope]);
  const [tab, setTab] = useState<'list' | 'calendar'>(params.get('institute') ? 'calendar' : 'list');
  const [instId, setInstId] = useState(params.get('institute') ?? scope[0].id);
  const [status, setStatus] = useState<BookingView | ''>((params.get('status') as BookingView) ?? '');
  const [dept, setDept] = useState('');
  const [q, setQ] = useState('');
  const [when, setWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [resch, setResch] = useState<Booking | null>(null);
  const [cancelB, setCancelB] = useState<Booking | null>(null);
  const [form, setForm] = useState({ date: '', slot: 'FN' as Slot, remarks: '' });
  const isAdmin = session!.role === 'ADMIN';

  const rows = state.bookings
    .filter((b) => ids.has(b.instituteId))
    .filter((b) => (when === 'upcoming' ? b.date >= TODAY : when === 'past' ? b.date < TODAY : true))
    .filter((b) => !status || bookingView(b) === status)
    .filter((b) => !dept || b.departmentId === dept)
    .filter((b) => {
      if (!q) return true;
      const i = instituteById.get(b.instituteId)!;
      return `${i.code} ${i.name}`.toLowerCase().includes(q.toLowerCase());
    })
    .sort((a, b) => (when === 'past' ? -1 : 1) * (a.date + a.slot).localeCompare(b.date + b.slot));

  const approve = (b: Booking, ok: boolean) => {
    update((s) => patchBooking(s, b.id, { status: ok ? 'CONFIRMED' : 'CANCELLED' }, bookingEvent(session!.name, ok ? 'CONFIRMED' : 'CANCELLED', ok ? undefined : 'Request rejected')));
    toast(ok ? 'Booking confirmed' : 'Request rejected. The slot is open again.');
  };
  const doResch = () => {
    if (!resch || !form.date) return;
    const res = rescheduleBooking(state, resch, form.date, form.slot, session!.name, form.remarks || 'Rescheduled');
    if (typeof res === 'string') return toast(res, 'error');
    update(() => res);
    toast('Booking rescheduled. Old slot released.');
    setResch(null);
  };
  const doCancel = () => {
    if (!cancelB) return;
    update((s) => patchBooking(s, cancelB.id, { status: 'CANCELLED' }, bookingEvent(session!.name, 'CANCELLED', form.remarks || 'Cancelled')));
    toast('Booking cancelled. The slot is open again.');
    setCancelB(null);
  };
  const reschInfo = resch && form.date ? slotInfo(state, instituteById.get(resch.instituteId)!, form.date, form.slot, resch.id) : null;

  return (
    <>
      <PageHeader title="Training Bookings" sub={isAdmin ? 'All departments' : `${departments.find((d) => d.id === session!.refId)!.name} Department`} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'list', label: 'All bookings' }, { id: 'calendar', label: 'Calendar · book for an institute' }]} />

      {tab === 'list' ? (
        <Card>
          <div className="mb-3 flex flex-wrap gap-2">
            <Input placeholder="Search institute…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
            <Select value={when} onChange={(e) => setWhen(e.target.value as typeof when)}>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
              <option value="all">All dates</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value as BookingView)}>
              <option value="">All statuses</option>
              {(['Pending approval', 'Confirmed', 'Rescheduled', 'Completed', 'Attendance missing', 'Cancelled'] as BookingView[]).map((v) => <option key={v}>{v}</option>)}
            </Select>
            {isAdmin && (
              <Select value={dept} onChange={(e) => setDept(e.target.value)}>
                <option value="">All departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
              </Select>
            )}
            <span className="self-center text-xs text-slate-500">{rows.length} bookings</span>
          </div>
          <Table>
            <thead>
              <tr>
                <Th>Institute</Th>
                <Th>Department</Th>
                <Th>Session</Th>
                <Th>Requested</Th>
                <Th>Confirmed date</Th>
                <Th>Instructor</Th>
                <Th>Status</Th>
                <Th>Remarks</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 150).map((b) => {
                const inst = instituteById.get(b.instituteId)!;
                const v = bookingView(b);
                const lastRemark = [...b.history].reverse().find((h) => h.remarks);
                const actionable = b.status !== 'CANCELLED' && b.date >= TODAY;
                return (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td><span className="font-medium text-brand">{inst.code}</span><div className="max-w-[220px] truncate text-xs text-slate-500">{inst.name}</div></Td>
                    <Td className="text-slate-600">{departments.find((d) => d.id === b.departmentId)!.name}</Td>
                    <Td>S{b.sessionNo}</Td>
                    <Td className="text-xs text-slate-600">{fmtDate(b.requestedOn)}</Td>
                    <Td className="whitespace-nowrap">{fmtDay(b.date)} · {b.slot}</Td>
                    <Td className="text-slate-600">{instructorById.get(b.instructorId)!.name}</Td>
                    <Td><Status light={VIEW_LIGHT[v]}>{v}</Status></Td>
                    <Td className="max-w-[200px] truncate text-xs italic text-slate-500">{lastRemark?.remarks ?? ''}</Td>
                    <Td>
                      <div className="flex justify-end gap-1.5">
                        {b.status === 'PENDING' && can(session!.role, 'approveBookings') && (
                          <>
                            <Button size="sm" onClick={() => approve(b, true)}>Approve</Button>
                            <Button size="sm" variant="outline" onClick={() => approve(b, false)}>Reject</Button>
                          </>
                        )}
                        {actionable && can(session!.role, 'manageBookings') && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => { setResch(b); setForm({ date: b.date, slot: b.slot, remarks: '' }); }}>Reschedule</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setCancelB(b); setForm({ ...form, remarks: '' }); }}>Cancel</Button>
                          </>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {rows.length > 150 && <p className="mt-2 text-xs text-slate-500">Showing first 150. Narrow the filters to see more.</p>}
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <Field label="Institute">
              <Select value={instId} onChange={(e) => setInstId(e.target.value)} className="min-w-[320px]">
                {scope.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}
              </Select>
            </Field>
            <p className="pb-2 text-xs text-slate-500">Booked slots show which institute holds them. Bookings created here are confirmed immediately.</p>
          </div>
          <BookingCalendar key={instId} inst={getInstitute(state, instId)} asAdmin />
        </Card>
      )}

      <Modal
        open={!!resch}
        onClose={() => setResch(null)}
        title={resch ? `Reschedule ${instituteById.get(resch.instituteId)!.code} · Session ${resch.sessionNo}` : ''}
        footer={<><Button variant="ghost" onClick={() => setResch(null)}>Cancel</Button><Button onClick={doResch} disabled={reschInfo?.state !== 'available'}>Reschedule</Button></>}
      >
        <p className="text-sm text-slate-600">Currently {resch && `${fmtDay(resch.date)} · ${resch.slot}`}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="New date"><Input type="date" min={TODAY} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Slot">
            <Select className="w-full" value={form.slot} onChange={(e) => setForm({ ...form, slot: e.target.value as Slot })}>
              <option value="FN">Forenoon</option>
              <option value="AN">Afternoon</option>
            </Select>
          </Field>
        </div>
        {reschInfo && (
          <p className={`text-sm ${reschInfo.state === 'available' ? 'text-ok' : 'text-bad'}`}>
            {reschInfo.state === 'available' && '✓ Slot available'}
            {reschInfo.state === 'booked' && `✗ Already booked by ${instituteById.get(reschInfo.booking!.instituteId)!.code} (same department or instructor)`}
            {reschInfo.state === 'mine' && '✗ This institute already has a session in this slot'}
            {reschInfo.state === 'mine_pending' && '✗ This institute already has a pending request for this slot'}
            {reschInfo.state === 'no_instructor' && '✗ Instructor not available on this slot'}
            {reschInfo.state === 'closed' && '✗ Sunday'}
            {(reschInfo.state === 'past' || reschInfo.state === 'cutoff') && `✗ Must be at least ${BOOKING_CUTOFF_DAYS} days ahead`}
          </p>
        )}
        <Field label="Reason for rescheduling"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
      </Modal>
      <Modal open={!!cancelB} onClose={() => setCancelB(null)} title="Cancel booking" footer={<><Button variant="ghost" onClick={() => setCancelB(null)}>Keep</Button><Button variant="danger" onClick={doCancel}>Cancel booking</Button></>}>
        <p className="text-sm">{cancelB && `${instituteById.get(cancelB.instituteId)!.name} · Session ${cancelB.sessionNo} · ${fmtDay(cancelB.date)} ${cancelB.slot}`}</p>
        <Field label="Cancellation remarks"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
      </Modal>
    </>
  );
}
