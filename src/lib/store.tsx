'use client';
// Demo state lives in the browser (localStorage) so actions persist between page
// loads and across the dummy logins, e.g. a slot booked by one institute shows as
// blocked when another institute logs in. "Reset demo data" restores the seed.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { generate, type Booking, type Institute, type Issue, type Kit, type Marks, type Role, type Student, type TeamProject } from './data';
import { TODAY } from './util';

export interface DemoState {
  generatedFor: string;
  bookings: Booking[];
  kits: Kit[];
  issues: Issue[];
  /** `${instructorId}|${date}|${slot}` → true when the instructor is NOT available */
  leave: Record<string, boolean>;
  /** `${bookingId}|${studentId}` → present? (overrides the generated roll call) */
  attendance: Record<string, boolean>;
  students: Record<string, Partial<Student>>;
  extraStudents: Student[];
  marks: Record<string, Marks>;
  teams: Record<string, Partial<TeamProject>>;
  institutes: Record<string, Partial<Institute>>;
  settings: { requireApproval: boolean };
  seq: number;
}

export interface Session {
  role: Role;
  refId: string;
  name: string;
}

const STATE_KEY = 'kcg-mockup-state-v1';
const SESSION_KEY = 'kcg-mockup-session-v1';

function freshState(): DemoState {
  const g = generate();
  return {
    generatedFor: TODAY,
    bookings: g.bookings,
    kits: g.kits,
    issues: g.issues,
    leave: g.leave,
    attendance: {},
    students: {},
    extraStudents: [],
    marks: {},
    teams: {},
    institutes: {},
    settings: { requireApproval: false },
    seq: 1,
  };
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the demo still works for this page view */
  }
}

interface Ctx {
  state: DemoState;
  update: (fn: (s: DemoState) => DemoState) => void;
  session: Session | null;
  login: (s: Session) => void;
  logout: () => void;
  reset: () => void;
  toast: (msg: string, kind?: 'ok' | 'error') => void;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ msg: string; kind: 'ok' | 'error'; id: number } | null>(null);

  useEffect(() => {
    setState(readJSON<DemoState>(STATE_KEY) ?? freshState());
    setSession(readJSON<Session>(SESSION_KEY));
    setReady(true);
  }, []);

  const update = useCallback((fn: (s: DemoState) => DemoState) => {
    setState((prev) => {
      const next = fn(prev!);
      writeJSON(STATE_KEY, next);
      return next;
    });
  }, []);

  const login = useCallback((s: Session) => {
    writeJSON(SESSION_KEY, s);
    setSession(s);
  }, []);
  const logout = useCallback(() => {
    writeJSON(SESSION_KEY, null);
    setSession(null);
  }, []);
  const reset = useCallback(() => {
    writeJSON(STATE_KEY, null);
    setState(freshState());
  }, []);
  const toast = useCallback((msg: string, kind: 'ok' | 'error' = 'ok') => {
    const id = Date.now();
    setToastMsg({ msg, kind, id });
    setTimeout(() => setToastMsg((t) => (t && t.id === id ? null : t)), 3500);
  }, []);

  if (!ready || !state) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading demo…</div>
    );
  }

  return (
    <StoreContext.Provider value={{ state, update, session, login, logout, reset, toast }}>
      {children}
      {toastMsg && (
        <div
          role="status"
          className={`fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toastMsg.kind === 'ok' ? 'bg-brand' : 'bg-bad'
          }`}
        >
          {toastMsg.msg}
        </div>
      )}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}
