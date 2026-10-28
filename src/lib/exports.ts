// CSV exports (open directly in Excel).
import { TARGET_BATCH, departments } from './data';
import type { InstituteSummary } from './logic';
import { downloadCSV } from './util';

export function exportInstitutes(rows: InstituteSummary[], name: string) {
  downloadCSV(name, [
    ['Institute ID', 'Institute', 'Department', 'District', 'Coordinator', 'Phone', 'Email', 'Instructor', 'Training status',
      'Sessions booked', 'Sessions held', 'Attendance missing (sessions)', 'Enrolled', 'Target', 'Attendance %', 'Kit status',
      'Teams setup done', 'Teams approved', 'Teams with corrections', 'Marks entered', 'Students completed', 'ABC ID missing', 'Open issues', 'Overdue issues'],
    ...rows.map((s) => [
      s.inst.code, s.inst.name, s.departmentName, s.inst.district, s.inst.coordinator, s.inst.coordinatorPhone, s.inst.coordinatorEmail,
      s.instructorName, s.training, s.sessionsBooked, s.sessionsHeld, s.missingAttendance, s.enrolled, TARGET_BATCH,
      s.attendancePct ?? '', s.kit, s.setupDone, s.reviewed, s.corrections, s.marksEntered, s.completedStudents, s.abcMissing,
      s.openIssues, s.overdueIssues,
    ]),
  ]);
}

export function exportDepartments(sums: InstituteSummary[], name: string) {
  downloadCSV(name, [
    ['Department', 'Coordinator', 'Institutes', 'Training completed', 'In progress', 'Not fully booked', 'Students enrolled',
      'Avg attendance %', 'Kits pending', 'Institutes with marks pending', 'Students completed', 'Open issues'],
    ...departments.map((d) => {
      const s = sums.filter((x) => x.inst.departmentId === d.id);
      if (s.length === 0) return null;
      const att = s.filter((x) => x.attendancePct !== null);
      return [
        `${d.code} ${d.name}`, d.coordinator, s.length,
        s.filter((x) => x.training === 'Completed').length,
        s.filter((x) => x.training === 'In progress').length,
        s.filter((x) => x.training === 'Not scheduled' || x.training === 'Partially booked').length,
        s.reduce((a, x) => a + x.enrolled, 0),
        att.length ? Math.round(att.reduce((a, x) => a + (x.attendancePct ?? 0), 0) / att.length) : '',
        s.filter((x) => x.kit !== 'Confirmed').length,
        s.filter((x) => x.marksLight === 'bad').length,
        s.reduce((a, x) => a + x.completedStudents, 0),
        s.reduce((a, x) => a + x.openIssues, 0),
      ];
    }).filter((r): r is (string | number)[] => r !== null),
  ]);
}
