// Derived data and business rules: booking/slot rules, institute status, and
// role permissions. Pages read through these so the rules live in one place.
import {
  BOOKING_CUTOFF_DAYS, TARGET_BATCH, TEAMS_PER_BATCH, TOTAL_SESSIONS, baseMarks, basePresent, baseStudents, baseTeam,
  deptById, instituteById, institutes, instructorById,
  type Booking, type BookingEvent, type Institute, type Marks, type Role, type Slot, type Student, type TeamProject,
} from './data';
import type { DemoState, Session } from './store';
import { TODAY, addDays, isSunday, pct } from './util';

// ---------- Roles ----------

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Super Admin (KCG Project Admin)',
  DEPARTMENT: 'Department Coordinator',
  INSTRUCTOR: 'Instructor',
  INSTITUTE: 'Institute Coordinator',
  STUDENT: 'Student',
};

export type Action =
  | 'manageAvailability' | 'editOwnAvailability' | 'manageBookings' | 'approveBookings' | 'requestBooking'
  | 'markAttendance' | 'reviewProjects' | 'updateSetup' | 'enterMarks' | 'verifyMarks' | 'editProfile'
  | 'confirmKit' | 'manageKit' | 'editRoster' | 'verifyAbc' | 'manageIssues' | 'export' | 'settings';

const PERMS: Record<Role, Action[]> = {
  ADMIN: ['manageAvailability', 'manageBookings', 'approveBookings', 'markAttendance', 'reviewProjects', 'updateSetup',
    'enterMarks', 'verifyMarks', 'editProfile', 'manageKit', 'confirmKit', 'editRoster', 'verifyAbc', 'manageIssues', 'export', 'settings'],
  DEPARTMENT: ['approveBookings', 'manageBookings', 'manageIssues', 'export', 'verifyMarks'],
  INSTRUCTOR: ['editOwnAvailability', 'markAttendance', 'reviewProjects', 'updateSetup', 'enterMarks', 'manageIssues'],
  INSTITUTE: ['requestBooking', 'editProfile', 'confirmKit', 'editRoster', 'verifyAbc', 'updateSetup', 'manageIssues'],
  STUDENT: [],
};
export const can = (role: Role, a: Action) => PERMS[role].includes(a);

/** Institutes the signed-in user is allowed to see. */
export function scopedInstitutes(session: Session): Institute[] {
  switch (session.role) {
    case 'ADMIN':
      return institutes;
    case 'DEPARTMENT':
      return institutes.filter((i) => i.departmentId === session.refId);
    case 'INSTRUCTOR':
      return institutes.filter((i) => i.instructorId === session.refId);
    case 'INSTITUTE':
      return institutes.filter((i) => i.id === session.refId);
    case 'STUDENT':
      return institutes.filter((i) => session.refId.startsWith(i.id + '-'));
  }
}

// ---------- Entity reads (seed + demo edits) ----------

export function getInstitute(s: DemoState, id: string): Institute {
  return { ...instituteById.get(id)!, ...(s.institutes[id] ?? {}) };
}

export function getStudents(s: DemoState, instituteId: string): Student[] {
  return [
    ...baseStudents(instituteId),
    ...s.extraStudents.filter((x) => x.instituteId === instituteId),
  ].map((st) => ({ ...st, ...(s.students[st.id] ?? {}) }));
}

export function findStudent(s: DemoState, studentId: string): Student | undefined {
  const instId = studentId.replace(/-s\d+$/, '').replace(/-x\d+$/, '');
  return getStudents(s, instId).find((x) => x.id === studentId);
}

export function getMarks(s: DemoState, st: Student): Marks {
  return s.marks[st.id] ?? baseMarks(st, instituteById.get(st.instituteId)!.phase);
}

export function getTeam(s: DemoState, instituteId: string, teamNo: number): TeamProject {
  return { ...baseTeam(instituteId, teamNo), ...(s.teams[`${instituteId}|${teamNo}`] ?? {}) };
}
export function getTeams(s: DemoState, instituteId: string) {
  return Array.from({ length: TEAMS_PER_BATCH }, (_, i) => getTeam(s, instituteId, i + 1));
}

export function isPresent(s: DemoState, b: Booking, st: Student): boolean {
  const k = `${b.id}|${st.id}`;
  return k in s.attendance ? s.attendance[k] : basePresent(b.id, st);
}

const byInstCache = new WeakMap<Booking[], Map<string, Booking[]>>();
export function bookingsOf(s: DemoState, instituteId: string): Booking[] {
  let m = byInstCache.get(s.bookings);
  if (!m) {
    m = new Map();
    for (const b of s.bookings) {
      const arr = m.get(b.instituteId) ?? [];
      arr.push(b);
      m.set(b.instituteId, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
    byInstCache.set(s.bookings, m);
  }
  return m.get(instituteId) ?? [];
}
export const activeBookings = (s: DemoState, instId: string) => bookingsOf(s, instId).filter((b) => b.status !== 'CANCELLED');

export type BookingView = 'Pending approval' | 'Confirmed' | 'Rescheduled' | 'Completed' | 'Attendance missing' | 'Cancelled';
export function bookingView(b: Booking): BookingView {
  if (b.status === 'CANCELLED') return 'Cancelled';
  if (b.status === 'PENDING') return 'Pending approval';
  if (b.date < TODAY) return b.attendanceMarked ? 'Completed' : 'Attendance missing';
  if (b.date === TODAY && b.attendanceMarked) return 'Completed';
  return b.history.some((h) => h.action === 'RESCHEDULED') ? 'Rescheduled' : 'Confirmed';
}

// ---------- Slot rules ----------

export type SlotState = 'available' | 'mine' | 'mine_pending' | 'booked' | 'no_instructor' | 'closed' | 'past' | 'cutoff';
export interface SlotInfo {
  state: SlotState;
  booking?: Booking;
}

/** Is this (date, slot) bookable for the institute? Mirrors the DB constraints the real system needs. */
export function slotInfo(s: DemoState, inst: Institute, date: string, slot: Slot, ignoreBookingId?: string): SlotInfo {
  if (isSunday(date)) return { state: 'closed' };
  const clash = s.bookings.find(
    (b) =>
      b.id !== ignoreBookingId && b.status !== 'CANCELLED' && b.date === date && b.slot === slot &&
      (b.departmentId === inst.departmentId || b.instructorId === inst.instructorId),
  );
  if (clash) {
    if (clash.instituteId === inst.id) return { state: clash.status === 'PENDING' ? 'mine_pending' : 'mine', booking: clash };
    return { state: 'booked', booking: clash };
  }
  if (date < TODAY) return { state: 'past' };
  if (date < addDays(TODAY, BOOKING_CUTOFF_DAYS)) return { state: 'cutoff' };
  if (s.leave[`${inst.instructorId}|${date}|${slot}`]) return { state: 'no_instructor' };
  return { state: 'available' };
}

const ev = (by: string, action: BookingEvent['action'], remarks?: string): BookingEvent => ({ at: TODAY, by, action, remarks });

export function requestBooking(s: DemoState, inst: Institute, date: string, slot: Slot, by: string, autoConfirm: boolean): DemoState | string {
  const info = slotInfo(s, inst, date, slot);
  if (info.state !== 'available') return 'This slot was just taken or is no longer available. Please pick another.';
  const active = activeBookings(s, inst.id);
  if (active.length >= TOTAL_SESSIONS) return `All ${TOTAL_SESSIONS} sessions are already booked.`;
  const used = new Set(active.map((b) => b.sessionNo));
  const sessionNo = Array.from({ length: TOTAL_SESSIONS }, (_, i) => i + 1).find((n) => !used.has(n))!;
  const confirmed = autoConfirm || !s.settings.requireApproval;
  const b: Booking = {
    id: `bk-new-${s.seq}`,
    instituteId: inst.id,
    departmentId: inst.departmentId,
    instructorId: inst.instructorId,
    sessionNo,
    requestedOn: TODAY,
    date,
    slot,
    status: confirmed ? 'CONFIRMED' : 'PENDING',
    attendanceMarked: false,
    topics: [],
    history: [ev(by, autoConfirm ? 'CREATED' : 'REQUESTED'), ...(confirmed && !autoConfirm ? [ev('System (auto-confirm)', 'CONFIRMED')] : [])],
  };
  return { ...s, seq: s.seq + 1, bookings: [...s.bookings, b] };
}

export function patchBooking(s: DemoState, id: string, patch: Partial<Booking>, event?: BookingEvent): DemoState {
  return {
    ...s,
    bookings: s.bookings.map((b) => (b.id === id ? { ...b, ...patch, history: event ? [...b.history, event] : b.history } : b)),
  };
}

export function rescheduleBooking(s: DemoState, b: Booking, date: string, slot: Slot, by: string, remarks: string): DemoState | string {
  const inst = instituteById.get(b.instituteId)!;
  const info = slotInfo(s, inst, date, slot, b.id);
  if (info.state !== 'available') return 'That slot is not available.';
  return patchBooking(s, b.id, { date, slot }, ev(by, 'RESCHEDULED', `${remarks} (was ${b.date} ${b.slot})`));
}

export { ev as bookingEvent };

// ---------- Institute status (drives the 500-institute dashboard) ----------

export type Light = 'good' | 'warn' | 'bad' | 'none';
export interface InstituteSummary {
  inst: Institute;
  departmentName: string;
  instructorName: string;
  training: 'Not scheduled' | 'Partially booked' | 'Scheduled' | 'In progress' | 'Completed';
  trainingLight: Light;
  sessionsBooked: number;
  sessionsHeld: number;
  pendingRequests: number;
  missingAttendance: number;
  nextSession: Booking | null;
  enrolled: number;
  attendancePct: number | null;
  attendanceLight: Light;
  kit: 'Not dispatched' | 'In transit' | 'Awaiting confirmation' | 'Confirmed' | 'Issue reported';
  kitLight: Light;
  setupDone: number;
  setupLight: Light;
  reviewed: number;
  corrections: number;
  reviewLight: Light;
  marksEntered: number;
  marksLight: Light;
  completedStudents: number;
  openIssues: number;
  overdueIssues: number;
  abcMissing: number;
  abcUnverified: number;
  topicsCovered: number;
}

const summaryCache = new WeakMap<DemoState, Map<string, InstituteSummary>>();

export function summarize(s: DemoState, instId: string): InstituteSummary {
  let m = summaryCache.get(s);
  if (!m) {
    m = new Map();
    summaryCache.set(s, m);
  }
  const hit = m.get(instId);
  if (hit) return hit;

  const inst = getInstitute(s, instId);
  const bks = activeBookings(s, instId);
  const confirmed = bks.filter((b) => b.status === 'CONFIRMED');
  const held = confirmed.filter((b) => b.date <= TODAY && b.attendanceMarked);
  const missing = confirmed.filter((b) => b.date < TODAY && !b.attendanceMarked).length;
  const students = getStudents(s, instId).filter((x) => x.status === 'ENROLLED');

  let training: InstituteSummary['training'] = 'Not scheduled';
  if (bks.length === 0) training = 'Not scheduled';
  else if (held.length >= TOTAL_SESSIONS) training = 'Completed';
  else if (confirmed.some((b) => b.date <= TODAY)) training = 'In progress';
  else if (bks.length < TOTAL_SESSIONS) training = 'Partially booked';
  else training = 'Scheduled';

  let presentTotal = 0;
  const perStudent = new Map<string, number>();
  for (const b of held) {
    for (const st of students) {
      if (isPresent(s, b, st)) {
        presentTotal++;
        perStudent.set(st.id, (perStudent.get(st.id) ?? 0) + 1);
      }
    }
  }
  const attendancePct = held.length ? pct(presentTotal, held.length * students.length) : null;

  const kits = s.kits.filter((k) => k.instituteId === instId);
  let kit: InstituteSummary['kit'] = 'Confirmed';
  if (kits.some((k) => k.status === 'ISSUE')) kit = 'Issue reported';
  else if (kits.some((k) => k.status === 'NOT_DISPATCHED')) kit = 'Not dispatched';
  else if (kits.some((k) => k.status === 'DISPATCHED')) kit = 'In transit';
  else if (kits.some((k) => k.status === 'DELIVERED')) kit = 'Awaiting confirmation';

  const teams = getTeams(s, instId);
  const setupDone = teams.filter((t) => t.setupStatus === 'COMPLETED').length;
  const reviewed = teams.filter((t) => t.reviewStatus === 'APPROVED').length;
  const corrections = teams.filter((t) => t.reviewStatus === 'CORRECTIONS').length;
  const marks = students.map((st) => getMarks(s, st));
  const marksEntered = marks.filter((x) => x.status !== 'NOT_ENTERED').length;
  const completedStudents = students.filter((st, i) => {
    const m = marks[i];
    return held.length >= TOTAL_SESSIONS && pct(perStudent.get(st.id) ?? 0, held.length) >= 75 && m.marks !== null && m.marks >= 40;
  }).length;

  const issues = s.issues.filter((x) => x.instituteId === instId && x.status === 'OPEN');
  const topicsCovered = new Set(confirmed.flatMap((b) => b.topics)).size;

  const sessionsStarted = training === 'In progress' || training === 'Completed';
  const result: InstituteSummary = {
    inst,
    departmentName: deptById.get(inst.departmentId)!.name,
    instructorName: instructorById.get(inst.instructorId)!.name,
    training,
    trainingLight: training === 'Completed' ? 'good' : training === 'Not scheduled' ? 'bad' : 'warn',
    sessionsBooked: bks.length,
    sessionsHeld: held.length,
    pendingRequests: bks.filter((b) => b.status === 'PENDING').length,
    missingAttendance: missing,
    nextSession: confirmed.find((b) => b.date >= TODAY && !b.attendanceMarked) ?? null,
    enrolled: students.length,
    attendancePct,
    attendanceLight: missing > 0 ? 'bad' : attendancePct === null ? 'none' : attendancePct >= 75 ? 'good' : 'warn',
    kit,
    kitLight: kit === 'Confirmed' ? 'good' : kit === 'Issue reported' || (kit === 'Not dispatched' && sessionsStarted) ? 'bad' : 'warn',
    setupDone,
    setupLight: !sessionsStarted ? 'none' : setupDone === teams.length ? 'good' : training === 'Completed' ? 'bad' : 'warn',
    reviewed,
    corrections,
    reviewLight: !sessionsStarted ? 'none' : reviewed === teams.length ? 'good' : training === 'Completed' ? 'bad' : 'warn',
    marksEntered,
    marksLight: training !== 'Completed' ? 'none' : marksEntered === students.length ? 'good' : 'bad',
    completedStudents,
    openIssues: issues.length,
    overdueIssues: issues.filter((x) => x.targetDate < TODAY).length,
    abcMissing: students.filter((x) => !x.abcId).length,
    abcUnverified: students.filter((x) => x.abcId && !x.abcVerified).length,
    topicsCovered,
  };
  m.set(instId, result);
  return result;
}

export function studentProgress(s: DemoState, st: Student) {
  const held = activeBookings(s, st.instituteId).filter((b) => b.status === 'CONFIRMED' && b.date <= TODAY && b.attendanceMarked);
  const present = held.filter((b) => isPresent(s, b, st)).length;
  const m = getMarks(s, st);
  const attendance = held.length ? pct(present, held.length) : null;
  const completed = held.length >= TOTAL_SESSIONS && (attendance ?? 0) >= 75 && m.marks !== null && m.marks >= 40;
  return { held, present, attendance, marks: m, completed };
}

export { TARGET_BATCH };
