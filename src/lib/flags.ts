// "Highlight pending" rules shared by the dashboard and the institutes list.
import type { InstituteSummary } from './logic';

export const FLAGS = {
  kit: { label: 'Kit delivery pending', test: (s: InstituteSummary) => s.kit !== 'Confirmed' },
  unbooked: { label: 'Training not fully booked', test: (s: InstituteSummary) => s.training === 'Not scheduled' || s.training === 'Partially booked' },
  attendance: { label: 'Attendance missing', test: (s: InstituteSummary) => s.missingAttendance > 0 },
  setup: { label: 'Project setup incomplete', test: (s: InstituteSummary) => s.setupLight === 'bad' || s.setupLight === 'warn' },
  review: { label: 'Project checking incomplete', test: (s: InstituteSummary) => s.reviewLight === 'bad' || s.reviewLight === 'warn' },
  marks: { label: 'Marks not entered', test: (s: InstituteSummary) => s.marksLight === 'bad' },
  issues: { label: 'Open issues', test: (s: InstituteSummary) => s.openIssues > 0 },
  abc: { label: 'ABC ID missing', test: (s: InstituteSummary) => s.abcMissing > 0 },
} as const;
export type FlagId = keyof typeof FLAGS;
export const FLAG_IDS = Object.keys(FLAGS) as FlagId[];
