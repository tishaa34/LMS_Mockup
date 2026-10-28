// Dummy data for the KCG mockup. Everything is generated from fixed seeds so the
// demo looks the same on every machine; dates are relative to the day it is opened.
import { TODAY, addWorkingDays, addDays, isSunday, mulberry32, pick, rand01 } from './util';

export type Role = 'ADMIN' | 'DEPARTMENT' | 'INSTRUCTOR' | 'INSTITUTE' | 'STUDENT';
export type Slot = 'FN' | 'AN';
export type Phase = 'not_scheduled' | 'scheduled' | 'in_progress' | 'completed';

export const SLOT_LABEL: Record<Slot, string> = { FN: 'Forenoon · 9:30–12:30', AN: 'Afternoon · 1:30–4:30' };
export const SLOT_SHORT: Record<Slot, string> = { FN: 'FN', AN: 'AN' };
export const PROGRAM_NAME = 'KCG STEAM-Based Professional Training Program (RUSA)';
export const TOTAL_SESSIONS = 5;
export const TARGET_BATCH = 40;
export const TEAMS_PER_BATCH = 8;
export const BOOKING_CUTOFF_DAYS = 2;

export const MODULES = [
  'Intro to STEAM & Design Thinking',
  'Electronics Basics & Sensors',
  'Microcontroller Programming',
  'Robotics & Motor Control',
  'IoT & Connectivity',
  '3D Design & Prototyping',
  'Data & AI Basics',
  'Project Planning',
  'Project Build & Testing',
  'Presentation & Documentation',
];
export const sessionModules = (sessionNo: number) => [MODULES[(sessionNo - 1) * 2], MODULES[(sessionNo - 1) * 2 + 1]];

export const KIT_TYPES = [
  { type: 'STEAM Electronics Kit', qty: 10 },
  { type: 'Robotics Kit', qty: 5 },
];

const DISTRICTS = [
  'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore',
  'Thoothukudi', 'Thanjavur', 'Dindigul', 'Kanchipuram', 'Tiruppur', 'Karur', 'Namakkal', 'Krishnagiri',
  'Dharmapuri', 'Cuddalore', 'Villupuram', 'Nagapattinam', 'Ramanathapuram', 'Sivaganga', 'Virudhunagar',
  'Pudukkottai', 'Kanyakumari',
];
const INSTITUTE_TYPES = [
  'Govt. Arts & Science College', 'Govt. College for Women', 'Govt. Polytechnic College', 'College of Engineering',
  'College of Arts & Science', 'Institute of Technology', "Women's College", 'Polytechnic College',
  'College of Technology', 'Arts College',
];
const FIRST = [
  'Aarav', 'Aditi', 'Akash', 'Anitha', 'Arjun', 'Bala', 'Deepa', 'Dinesh', 'Divya', 'Ganesh', 'Gokul', 'Harini',
  'Hari', 'Janani', 'Karthik', 'Kavya', 'Keerthana', 'Lakshmi', 'Manoj', 'Meena', 'Mohan', 'Nandhini', 'Naveen',
  'Nithya', 'Pooja', 'Prakash', 'Priya', 'Rahul', 'Rajesh', 'Ramya', 'Sanjay', 'Saranya', 'Sathish', 'Shalini',
  'Sneha', 'Suresh', 'Swathi', 'Uma', 'Vignesh', 'Vijay', 'Yamini', 'Abdul', 'Fathima', 'Joseph', 'Mary', 'Arun',
  'Bhavana', 'Charan', 'Dharani', 'Ezhil',
];
const LAST = [
  'Kumar', 'Raj', 'Krishnan', 'Subramanian', 'Murugan', 'Natarajan', 'Rajan', 'Selvam', 'Pandian', 'Sundaram',
  'Venkatesan', 'Balaji', 'Shankar', 'Ramesh', 'Ganesan', 'Iyer', 'Nair', 'Khan', 'Thomas', 'Devi',
];
const PROJECTS = [
  'Smart Irrigation System', 'Line Follower Robot', 'Air Quality Monitor', 'Solar Tracker', 'Home Automation',
  'Obstacle Avoiding Robot', 'Smart Dustbin', 'Weather Station', 'Heart-rate Monitor', 'Automatic Street Light',
];

const personName = (rng: () => number) => `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
const phone = (rng: () => number) => `9${Math.floor(100000000 + rng() * 899999999)}`;

// ---------- Entities ----------

export interface Department {
  id: string;
  code: string;
  name: string;
  coordinator: string;
  email: string;
}
export interface Instructor {
  id: string;
  name: string;
  email: string;
  phone: string;
  departmentId: string;
}
export interface Institute {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  instructorId: string;
  district: string;
  address: string;
  coordinator: string;
  coordinatorPhone: string;
  coordinatorEmail: string;
  phase: Phase;
  index: number;
}
export interface Student {
  id: string;
  instituteId: string;
  name: string;
  rollNo: string;
  teamNo: number;
  abcId: string | null;
  abcVerified: boolean;
  status: 'ENROLLED' | 'DROPPED';
  propensity: number;
  email: string;
}
export interface BookingEvent {
  at: string;
  by: string;
  action: 'REQUESTED' | 'CONFIRMED' | 'RESCHEDULED' | 'CANCELLED' | 'CREATED' | 'ATTENDANCE';
  remarks?: string;
}
export interface Booking {
  id: string;
  instituteId: string;
  departmentId: string;
  instructorId: string;
  sessionNo: number;
  requestedOn: string;
  date: string;
  slot: Slot;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED';
  attendanceMarked: boolean;
  topics: string[];
  history: BookingEvent[];
}
export interface Kit {
  id: string;
  instituteId: string;
  type: string;
  qty: number;
  status: 'NOT_DISPATCHED' | 'DISPATCHED' | 'DELIVERED' | 'CONFIRMED' | 'ISSUE';
  dispatchDate: string | null;
  deliveryDate: string | null;
  confirmedBy: string | null;
  issue: string | null;
}
export interface TeamProject {
  instituteId: string;
  teamNo: number;
  title: string;
  setupStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  setupDate: string | null;
  setupNotes: string;
  reviewStatus: 'PENDING' | 'CORRECTIONS' | 'APPROVED';
  reviewer: string | null;
  feedback: string;
  corrections: string;
}
export interface Marks {
  marks: number | null;
  status: 'NOT_ENTERED' | 'ENTERED' | 'VERIFIED';
  evaluator: string | null;
  remarks: string;
}
export interface Issue {
  id: string;
  instituteId: string;
  category: 'Kit' | 'Training' | 'Attendance' | 'Project' | 'Marks' | 'Other';
  title: string;
  owner: string;
  targetDate: string;
  status: 'OPEN' | 'CLOSED';
  createdOn: string;
  closedOn: string | null;
  remarks: string;
}

// ---------- Generation ----------

export const departments: Department[] = DISTRICTS.map((d, i) => {
  const rng = mulberry32(1000 + i);
  const code = `D${String(i + 1).padStart(2, '0')}`;
  return {
    id: `dep-${i + 1}`,
    code,
    name: d,
    coordinator: personName(rng),
    email: `dept.${d.toLowerCase()}@stembotix.demo`,
  };
});

export const instructors: Instructor[] = departments.flatMap((d, i) =>
  [0, 1].map((k) => {
    const rng = mulberry32(2000 + i * 10 + k);
    const name = personName(rng);
    return {
      id: `ins-${i * 2 + k + 1}`,
      name,
      email: `${name.split(' ')[0].toLowerCase()}.${i * 2 + k + 1}@stembotix.demo`,
      phone: phone(rng),
      departmentId: d.id,
    };
  }),
);

function phaseFor(deptIdx: number, j: number): Phase {
  // The first institutes of Department 01 are fixed for the guided demo.
  // The rest of Department 01 is kept light so its calendar has open slots to book.
  if (deptIdx === 0) {
    if (j <= 1 || j >= 17) return 'not_scheduled';
    if (j === 2 || (j >= 10 && j <= 12)) return 'in_progress';
    if (j >= 13) return 'scheduled';
    return 'completed';
  }
  const r = rand01(`phase-${deptIdx}-${j}`);
  if (r < 0.32) return 'completed';
  if (r < 0.62) return 'in_progress';
  if (r < 0.82) return 'scheduled';
  return 'not_scheduled';
}

export const institutes: Institute[] = departments.flatMap((d, i) =>
  Array.from({ length: 20 }, (_, j) => {
    const n = i * 20 + j + 1;
    const rng = mulberry32(3000 + n);
    const code = `KCG-${String(n).padStart(4, '0')}`;
    return {
      id: `inst-${n}`,
      code,
      name: `${INSTITUTE_TYPES[j % 10]}, ${d.name}${j >= 10 ? ' East' : ''}`,
      departmentId: d.id,
      instructorId: instructors[i * 2 + (j < 10 ? 0 : 1)].id,
      district: d.name,
      address: `${Math.floor(rng() * 200) + 1}, College Road, ${d.name}, Tamil Nadu`,
      coordinator: personName(rng),
      coordinatorPhone: phone(rng),
      coordinatorEmail: `coord.${code.toLowerCase()}@institute.demo`,
      phase: phaseFor(i, j),
      index: n,
    };
  }),
);

export const deptById = new Map(departments.map((d) => [d.id, d]));
export const instructorById = new Map(instructors.map((d) => [d.id, d]));
export const instituteById = new Map(institutes.map((d) => [d.id, d]));

const studentCache = new Map<string, Student[]>();
export function baseStudents(instituteId: string): Student[] {
  const hit = studentCache.get(instituteId);
  if (hit) return hit;
  const inst = instituteById.get(instituteId)!;
  const rng = mulberry32(5000 + inst.index);
  const demo = inst.index === 3;
  const count = demo ? 38 : inst.phase === 'not_scheduled' ? 28 + Math.floor(rng() * 13) : 33 + Math.floor(rng() * 8);
  const list: Student[] = Array.from({ length: count }, (_, k) => {
    const name = personName(rng);
    const hasAbc = rng() < 0.78;
    const verified = hasAbc && rng() < 0.7;
    return {
      id: `${instituteId}-s${k + 1}`,
      instituteId,
      name,
      rollNo: `${inst.code}-${String(k + 1).padStart(2, '0')}`,
      teamNo: (k % TEAMS_PER_BATCH) + 1,
      abcId: hasAbc ? String(Math.floor(100000000000 + rng() * 899999999999)) : null,
      abcVerified: verified,
      status: !demo && k > 30 && rng() < 0.15 ? 'DROPPED' : 'ENROLLED',
      propensity: 0.62 + rng() * 0.37,
      email: `${name.split(' ')[0].toLowerCase()}.${inst.code.toLowerCase()}.${k + 1}@student.demo`,
    };
  });
  if (demo) {
    // The demo student has not registered an ABC ID yet.
    list[0] = { ...list[0], name: 'Kavya Natarajan', abcId: null, abcVerified: false, propensity: 0.95 };
  }
  studentCache.set(instituteId, list);
  return list;
}

export function basePresent(bookingId: string, s: Student) {
  return rand01(`att-${bookingId}-${s.id}`) < s.propensity;
}

export function baseMarks(s: Student, phase: Phase): Marks {
  const r = rand01(`marks-${s.id}`);
  const instEntered = rand01(`marks-inst-${s.instituteId}`) < 0.72;
  if (phase !== 'completed' || s.status === 'DROPPED' || (!instEntered && r < 0.55)) {
    return { marks: null, status: 'NOT_ENTERED', evaluator: null, remarks: '' };
  }
  const m = Math.round(35 + s.propensity * 55 + r * 8);
  return {
    marks: Math.min(m, 100),
    status: r < 0.6 ? 'VERIFIED' : 'ENTERED',
    evaluator: instructorById.get(instituteById.get(s.instituteId)!.instructorId)!.name,
    remarks: m >= 80 ? 'Excellent practical work' : m >= 60 ? 'Good' : 'Needs improvement',
  };
}

export function baseTeam(instituteId: string, teamNo: number): TeamProject {
  const inst = instituteById.get(instituteId)!;
  const r = rand01(`team-${instituteId}-${teamNo}`);
  const title = PROJECTS[(inst.index + teamNo) % PROJECTS.length];
  const instructor = instructorById.get(inst.instructorId)!.name;
  const blank: TeamProject = {
    instituteId, teamNo, title, setupStatus: 'NOT_STARTED', setupDate: null, setupNotes: '',
    reviewStatus: 'PENDING', reviewer: null, feedback: '', corrections: '',
  };
  if (inst.phase === 'completed') {
    const setupDone = r < 0.94;
    return {
      ...blank,
      setupStatus: setupDone ? 'COMPLETED' : 'IN_PROGRESS',
      setupDate: setupDone ? addDays(TODAY, -20 - Math.floor(r * 15)) : null,
      setupNotes: setupDone ? 'All components assembled and tested' : 'Waiting for replacement sensor',
      reviewStatus: !setupDone ? 'PENDING' : r < 0.78 ? 'APPROVED' : 'CORRECTIONS',
      reviewer: setupDone ? instructor : null,
      feedback: !setupDone ? '' : r < 0.78 ? 'Working prototype, clear documentation' : 'Wiring needs rework',
      corrections: setupDone && r >= 0.78 ? 'Re-route power lines; add circuit diagram to report' : '',
    };
  }
  if (inst.phase === 'in_progress') {
    const st = r < 0.35 ? 'COMPLETED' : r < 0.75 ? 'IN_PROGRESS' : 'NOT_STARTED';
    return {
      ...blank,
      setupStatus: st,
      setupDate: st === 'COMPLETED' ? addDays(TODAY, -3 - Math.floor(r * 5)) : null,
      setupNotes: st === 'COMPLETED' ? 'Setup complete' : st === 'IN_PROGRESS' ? 'Assembly in progress' : '',
      reviewStatus: st === 'COMPLETED' && r < 0.15 ? 'APPROVED' : 'PENDING',
      reviewer: st === 'COMPLETED' && r < 0.15 ? instructor : null,
      feedback: st === 'COMPLETED' && r < 0.15 ? 'Good start' : '',
    };
  }
  return blank;
}

function genLeave(): Record<string, true> {
  const leave: Record<string, true> = {};
  for (const ins of instructors) {
    for (let d = -70; d <= 75; d++) {
      const iso = addDays(TODAY, d);
      if (isSunday(iso)) continue;
      if (rand01(`leave-${ins.id}-${iso}`) < 0.1) {
        leave[`${ins.id}|${iso}|FN`] = true;
        leave[`${ins.id}|${iso}|AN`] = true;
      }
    }
  }
  return leave;
}

export interface Generated {
  bookings: Booking[];
  kits: Kit[];
  issues: Issue[];
  leave: Record<string, true>;
}

export function generate(): Generated {
  const leave = genLeave();
  const used = new Set<string>(); // dept|date|slot and instructor|date|slot
  const bookings: Booking[] = [];
  let bid = 0;

  const tryPlace = (inst: Institute, date: string): { date: string; slot: Slot } | null => {
    for (let k = 0; k < 8; k++) {
      const d = addWorkingDays(date, k);
      for (const slot of ['FN', 'AN'] as Slot[]) {
        const dk = `${inst.departmentId}|${d}|${slot}`;
        const ik = `${inst.instructorId}|${d}|${slot}`;
        if (!used.has(dk) && !used.has(ik) && !leave[ik]) return { date: d, slot };
      }
    }
    return null;
  };

  // Place the guided-demo institute first so it has a session today.
  const ordered = [...institutes].sort((a, b) => (a.index === 3 ? -1 : b.index === 3 ? 1 : 0));
  for (const inst of ordered) {
    const rng = mulberry32(7000 + inst.index);
    let offsets: number[] = [];
    if (inst.index === 3) offsets = [-8, -6, -4, -2, 0];
    else if (inst.phase === 'completed') {
      const s = -55 + Math.floor(rng() * 25);
      offsets = [0, 2, 4, 6, 8].map((o) => s + o);
    } else if (inst.phase === 'in_progress') {
      const s = -9 + Math.floor(rng() * 6);
      offsets = [0, 3, 6, 9, 12].map((o) => s + o);
    } else if (inst.phase === 'scheduled') {
      const s = 5 + Math.floor(rng() * 40);
      offsets = [0, 4, 8, 12, 16].map((o) => s + o);
    } else if (inst.index > 3 && rng() < 0.4) {
      const s = 8 + Math.floor(rng() * 30);
      offsets = [0, 4].map((o) => s + o);
    }
    offsets.forEach((o, i) => {
      const target = addWorkingDays(TODAY, o);
      const placed =
        inst.index === 3 ? { date: target, slot: 'FN' as Slot } : tryPlace(inst, target);
      if (!placed) return;
      if (inst.index === 3) delete leave[`${inst.instructorId}|${placed.date}|FN`];
      used.add(`${inst.departmentId}|${placed.date}|${placed.slot}`);
      used.add(`${inst.instructorId}|${placed.date}|${placed.slot}`);
      const past = placed.date < TODAY;
      const missing = past && rand01(`miss-${inst.id}-${i}`) < (inst.phase === 'completed' ? 0.05 : 0.18);
      const requestedOn = addDays(placed.date, -10 - Math.floor(rng() * 10));
      const confirmed = inst.phase !== 'not_scheduled' || rng() < 0.6;
      bookings.push({
        id: `bk-${++bid}`,
        instituteId: inst.id,
        departmentId: inst.departmentId,
        instructorId: inst.instructorId,
        sessionNo: i + 1,
        requestedOn,
        date: placed.date,
        slot: placed.slot,
        status: confirmed ? 'CONFIRMED' : 'PENDING',
        attendanceMarked: past && !missing,
        topics: past && !missing ? sessionModules(i + 1) : [],
        history: [
          { at: requestedOn, by: inst.coordinator, action: 'REQUESTED' },
          ...(confirmed
            ? [{ at: addDays(requestedOn, 1), by: deptById.get(inst.departmentId)!.coordinator, action: 'CONFIRMED' as const }]
            : []),
          ...(rng() < 0.12
            ? [{ at: addDays(requestedOn, 3), by: 'KCG Admin', action: 'RESCHEDULED' as const, remarks: 'Institute exam schedule clash' }]
            : []),
        ],
      });
    });
  }

  const kits: Kit[] = institutes.flatMap((inst) =>
    KIT_TYPES.map((k, ki) => {
      const r = rand01(`kit-${inst.id}-${ki}`);
      const base: Kit = {
        id: `kit-${inst.index}-${ki + 1}`, instituteId: inst.id, type: k.type, qty: k.qty, status: 'NOT_DISPATCHED',
        dispatchDate: null, deliveryDate: null, confirmedBy: null, issue: null,
      };
      if (inst.index === 1 || inst.index === 2) {
        return { ...base, status: 'DELIVERED', dispatchDate: addDays(TODAY, -6), deliveryDate: addDays(TODAY, -2) };
      }
      const dispatched = addDays(TODAY, -40 - Math.floor(r * 20));
      const delivered = addDays(dispatched, 4 + Math.floor(r * 4));
      if (inst.phase === 'completed' || inst.phase === 'in_progress' || inst.index === 3) {
        if (r < 0.06) return { ...base, status: 'ISSUE', dispatchDate: dispatched, deliveryDate: delivered, issue: '2 sensor modules damaged in transit' };
        if (r < 0.14) return { ...base, status: 'DELIVERED', dispatchDate: dispatched, deliveryDate: delivered };
        return { ...base, status: 'CONFIRMED', dispatchDate: dispatched, deliveryDate: delivered, confirmedBy: inst.coordinator };
      }
      if (r < 0.35) return { ...base, status: 'DISPATCHED', dispatchDate: addDays(TODAY, -2 - Math.floor(r * 4)) };
      if (r < 0.55) return { ...base, status: 'DELIVERED', dispatchDate: addDays(TODAY, -9), deliveryDate: addDays(TODAY, -4) };
      return base;
    }),
  );

  const issues: Issue[] = [];
  let iid = 0;
  const addIssue = (inst: Institute, category: Issue['category'], title: string, owner: string, seedKey: string) => {
    const r = rand01(seedKey);
    const createdOn = addDays(TODAY, -3 - Math.floor(r * 25));
    const closed = r < 0.35;
    issues.push({
      id: `iss-${++iid}`, instituteId: inst.id, category, title, owner,
      targetDate: addDays(createdOn, 7), status: closed ? 'CLOSED' : 'OPEN', createdOn,
      closedOn: closed ? addDays(createdOn, 4) : null, remarks: closed ? 'Resolved' : '',
    });
  };
  for (const k of kits.filter((k) => k.status === 'ISSUE')) {
    const inst = instituteById.get(k.instituteId)!;
    addIssue(inst, 'Kit', `${k.type}: ${k.issue}`, 'Logistics team', `iss-kit-${k.id}`);
  }
  for (const inst of institutes) {
    const r = rand01(`iss-gen-${inst.id}`);
    if (r < 0.08) addIssue(inst, 'Training', 'Lab projector not working — arrange alternative room', inst.coordinator, `iss-a-${inst.id}`);
    else if (r < 0.14) addIssue(inst, 'Attendance', 'Students missing sessions due to internal exams', inst.coordinator, `iss-b-${inst.id}`);
    else if (r < 0.18 && inst.phase === 'completed') addIssue(inst, 'Marks', 'Marks pending verification', instructorById.get(inst.instructorId)!.name, `iss-c-${inst.id}`);
    else if (r < 0.22) addIssue(inst, 'Project', 'Additional jumper wires needed for project setup', 'Logistics team', `iss-d-${inst.id}`);
  }

  return { bookings, kits, issues, leave };
}
