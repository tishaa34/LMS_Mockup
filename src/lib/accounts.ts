// Dummy logins. Every account uses the same demo password.
import { baseStudents, departments, instituteById, institutes, instructors, type Role } from './data';
import type { Session } from './store';

export const DEMO_PASSWORD = 'demo@123';
export const ADMIN_EMAIL = 'admin@stembotix.demo';

export interface DemoAccount extends Session {
  email: string;
  title: string;
  description: string;
}

const instA = instituteById.get('inst-1')!;
const instB = instituteById.get('inst-2')!;
const instC = instituteById.get('inst-3')!;
const demoStudent = baseStudents('inst-3')[0];

export const FEATURED: DemoAccount[] = [
  {
    role: 'ADMIN', refId: 'admin', name: 'Meena Raghavan', email: ADMIN_EMAIL,
    title: 'Super Admin', description: 'KCG Project Admin: all 500 institutes, bookings, instructor availability, reports, ABC partner API',
  },
  {
    role: 'DEPARTMENT', refId: departments[0].id, name: departments[0].coordinator, email: departments[0].email,
    title: `Department Coordinator · ${departments[0].name}`, description: 'Only their department: 20 institutes, booking approvals, follow-up, progress',
  },
  {
    role: 'INSTRUCTOR', refId: instructors[0].id, name: instructors[0].name, email: instructors[0].email,
    title: 'Instructor', description: `Availability, today's session roll call, topics, project review and marks (${departments[0].name})`,
  },
  {
    role: 'INSTITUTE', refId: instA.id, name: instA.coordinator, email: instA.coordinatorEmail,
    title: `Institute Coordinator · ${instA.code}`, description: `${instA.name}: not booked yet. Book training dates, confirm kit delivery`,
  },
  {
    role: 'INSTITUTE', refId: instB.id, name: instB.coordinator, email: instB.coordinatorEmail,
    title: `Institute Coordinator · ${instB.code}`, description: `Same department as ${instA.code}: slots booked by ${instA.code} show as blocked here`,
  },
  {
    role: 'INSTITUTE', refId: instC.id, name: instC.coordinator, email: instC.coordinatorEmail,
    title: `Institute Coordinator · ${instC.code}`, description: `${instC.name}: training in progress. Batch roster, attendance, ABC ID verification`,
  },
  {
    role: 'STUDENT', refId: demoStudent.id, name: 'Kavya Natarajan', email: demoStudent.email,
    title: `Student · ${instC.code}`, description: 'Own attendance, topics, team project, marks; register ABC ID',
  },
];

export function accountByEmail(email: string): Session | null {
  const e = email.trim().toLowerCase();
  const featured = FEATURED.find((a) => a.email === e);
  if (featured) return featured;
  const d = departments.find((x) => x.email === e);
  if (d) return { role: 'DEPARTMENT', refId: d.id, name: d.coordinator };
  const ins = instructors.find((x) => x.email === e);
  if (ins) return { role: 'INSTRUCTOR', refId: ins.id, name: ins.name };
  const inst = institutes.find((x) => x.coordinatorEmail === e);
  if (inst) return { role: 'INSTITUTE', refId: inst.id, name: inst.coordinator };
  return null;
}

export const roleOrder: Role[] = ['ADMIN', 'DEPARTMENT', 'INSTRUCTOR', 'INSTITUTE', 'STUDENT'];
