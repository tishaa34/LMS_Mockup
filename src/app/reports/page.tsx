'use client';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { Button, Card, Field, Note, PageHeader, Select } from '@/components/ui';
import { departments, deptById, instituteById, instructorById } from '@/lib/data';
import { exportDepartments, exportInstitutes } from '@/lib/exports';
import { activeBookings, bookingView, getMarks, getStudents, isPresent, scopedInstitutes, summarize } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, downloadCSV, pct } from '@/lib/util';

export default function ReportsPage() {
  return (
    <AppShell roles={['ADMIN', 'DEPARTMENT']}>
      <Reports />
    </AppShell>
  );
}

function Reports() {
  const { state, session, toast } = useStore();
  const scope = useMemo(() => scopedInstitutes(session!), [session]);
  const isAdmin = session!.role === 'ADMIN';
  const [dept, setDept] = useState(isAdmin ? '' : session!.refId);
  const [inst, setInst] = useState('');
  const filtered = scope.filter((i) => !dept || i.departmentId === dept);
  const tag = dept ? deptById.get(dept)!.name.toLowerCase() : 'all';

  const reports = [
    {
      title: 'Institute-wise status report',
      desc: 'One row per institute: profile, kit, training, attendance, project setup/checking, marks, ABC IDs, issues.',
      run: () => { exportInstitutes(filtered.map((i) => summarize(state, i.id)), `kcg-institute-report-${tag}-${TODAY}.csv`); return filtered.length; },
    },
    {
      title: 'Department-wise summary',
      desc: 'Aggregated totals per department: institutes, completion, enrolment, attendance, kits, marks, issues.',
      run: () => { exportDepartments(filtered.map((i) => summarize(state, i.id)), `kcg-department-report-${TODAY}.csv`); return new Set(filtered.map((i) => i.departmentId)).size; },
    },
    {
      title: 'Training bookings report',
      desc: 'Every booking with requested/confirmed date, instructor, status and rescheduling/cancellation remarks.',
      run: () => {
        const ids = new Set(filtered.map((i) => i.id));
        const rows = state.bookings.filter((b) => ids.has(b.instituteId));
        downloadCSV(`kcg-bookings-${tag}-${TODAY}.csv`, [
          ['Institute ID', 'Institute', 'Department', 'Session', 'Requested on', 'Date', 'Slot', 'Instructor', 'Status', 'Remarks'],
          ...rows.map((b) => {
            const i = instituteById.get(b.instituteId)!;
            return [i.code, i.name, deptById.get(b.departmentId)!.name, b.sessionNo, b.requestedOn, b.date, b.slot, instructorById.get(b.instructorId)!.name, bookingView(b), b.history.filter((h) => h.remarks).map((h) => `${h.action}: ${h.remarks}`).join(' | ')];
          }),
        ]);
        return rows.length;
      },
    },
    {
      title: 'Issues & follow-up report',
      desc: 'All follow-up items with responsible person, target date and closure status.',
      run: () => {
        const ids = new Set(filtered.map((i) => i.id));
        const rows = state.issues.filter((x) => ids.has(x.instituteId));
        downloadCSV(`kcg-issues-${tag}-${TODAY}.csv`, [
          ['Institute ID', 'Category', 'Pending action', 'Responsible', 'Created', 'Target date', 'Status', 'Closed on', 'Remarks'],
          ...rows.map((x) => [instituteById.get(x.instituteId)!.code, x.category, x.title, x.owner, x.createdOn, x.targetDate, x.status === 'OPEN' && x.targetDate < TODAY ? 'OVERDUE' : x.status, x.closedOn ?? '', x.remarks]),
        ]);
        return rows.length;
      },
    },
  ];

  const studentReport = () => {
    const list = inst ? [instituteById.get(inst)!] : filtered;
    const rows: (string | number)[][] = [];
    for (const i of list) {
      const held = activeBookings(state, i.id).filter((b) => b.status === 'CONFIRMED' && b.date <= TODAY && b.attendanceMarked);
      for (const st of getStudents(state, i.id)) {
        const p = held.filter((b) => isPresent(state, b, st)).length;
        const m = getMarks(state, st);
        rows.push([i.code, st.rollNo, st.name, st.abcId ?? '', st.abcVerified ? 'Yes' : 'No', st.status, st.teamNo, held.length, p, held.length ? pct(p, held.length) : '', m.marks ?? '', m.status]);
      }
    }
    downloadCSV(`kcg-students-${inst ? instituteById.get(inst)!.code : tag}-${TODAY}.csv`, [
      ['Institute ID', 'Roll no', 'Student', 'ABC ID', 'ABC verified', 'Enrolment', 'Team', 'Sessions held', 'Attended', 'Attendance %', 'Marks', 'Marks status'],
      ...rows,
    ]);
    toast(`Exported ${rows.length.toLocaleString('en-IN')} student rows`);
  };

  return (
    <>
      <PageHeader title="Reports & Export" sub="Downloads open directly in Excel (CSV)" />
      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          {isAdmin && (
            <Field label="Department">
              <Select value={dept} onChange={(e) => { setDept(e.target.value); setInst(''); }}>
                <option value="">All departments (500 institutes)</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
              </Select>
            </Field>
          )}
          <p className="pb-2 text-sm text-slate-500">{filtered.length} institutes in scope</p>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title}>
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="mt-0.5 h-8 w-8 shrink-0 text-ok" />
              <div className="flex-1">
                <h3 className="font-semibold text-slate-800">{r.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{r.desc}</p>
                <Button size="sm" variant="outline" className="mt-3" onClick={() => toast(`Exported ${r.run()} rows`)}>
                  <Download className="h-3.5 w-3.5" /> Download
                </Button>
              </div>
            </div>
          </Card>
        ))}
        <Card className="md:col-span-2">
          <div className="flex items-start gap-3">
            <FileSpreadsheet className="mt-0.5 h-8 w-8 shrink-0 text-ok" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-800">Student-wise batch report</h3>
              <p className="mt-1 text-sm text-slate-500">Each student with ABC ID, attendance and marks. Pick one institute or export the whole scope.</p>
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Select value={inst} onChange={(e) => setInst(e.target.value)} className="max-w-md">
                  <option value="">All institutes in scope</option>
                  {filtered.map((i) => <option key={i.id} value={i.id}>{i.code} · {i.name}</option>)}
                </Select>
                <Button size="sm" variant="outline" onClick={studentReport}><Download className="h-3.5 w-3.5" /> Download</Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-5"><Note>In the real system these would also be available as formatted Excel (.xlsx) and PDF, and could be scheduled to email weekly to each Department Coordinator.</Note></div>
    </>
  );
}
