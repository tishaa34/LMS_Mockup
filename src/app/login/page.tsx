'use client';
import { ArrowRight, Building2, GraduationCap, LayoutDashboard, Network, Presentation } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { BASE } from '@/components/AppShell';
import { Button, Field, Input, Select } from '@/components/ui';
import { ADMIN_EMAIL, DEMO_PASSWORD, FEATURED, accountByEmail, type DemoAccount } from '@/lib/accounts';
import { departments, institutes, instructors, type Role } from '@/lib/data';
import { useStore, type Session } from '@/lib/store';

const ICON: Record<Role, typeof LayoutDashboard> = {
  ADMIN: LayoutDashboard,
  DEPARTMENT: Network,
  INSTRUCTOR: Presentation,
  INSTITUTE: Building2,
  STUDENT: GraduationCap,
};

export default function LoginPage() {
  const { login } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState('');
  const [other, setOther] = useState('');

  const go = (s: Session) => {
    login({ role: s.role, refId: s.refId, name: s.name });
    router.push('/dashboard/');
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const acc = accountByEmail(email);
    if (!acc || password !== DEMO_PASSWORD) {
      setError('Unknown demo account or wrong password. Use one of the cards on the right.');
      return;
    }
    go(acc);
  };

  const pickOther = (v: string) => {
    setOther(v);
    const [kind, id] = v.split(':');
    if (kind === 'dep') {
      const d = departments.find((x) => x.id === id)!;
      go({ role: 'DEPARTMENT', refId: d.id, name: d.coordinator });
    } else if (kind === 'ins') {
      const i = instructors.find((x) => x.id === id)!;
      go({ role: 'INSTRUCTOR', refId: i.id, name: i.name });
    } else if (kind === 'inst') {
      const i = institutes.find((x) => x.id === id)!;
      go({ role: 'INSTITUTE', refId: i.id, name: i.coordinator });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] lg:grid lg:grid-cols-[minmax(340px,440px)_1fr]">
      <div className="flex flex-col justify-between bg-brand px-6 py-8 text-white sm:px-10">
        <div>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${BASE}/logo.png`} alt="STEMbotix" className="h-10 w-auto" />
            <div>
              <div className="text-lg font-bold">STEMbotix LMS</div>
              <div className="text-xs text-accent-100">KCG · STEAM-Based Professional Training Program · RUSA</div>
            </div>
          </div>
          <h1 className="mt-10 text-2xl font-bold leading-snug">Scheduling, tracking and progress for all 500 institutes in one place.</h1>
          <p className="mt-3 text-sm text-brand-200">
            This is a clickable <b className="text-white">mockup with dummy data</b>. Pick any role to explore what that user would see. Changes you make
            are saved in this browser only, so you can switch users and see the effect.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
            <Field label="Email" dark>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="text-slate-900" />
            </Field>
            <Field label="Password" dark>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="text-slate-900" />
            </Field>
            {error && <p className="text-xs text-accent-100">{error}</p>}
            <Button type="submit" variant="accent" className="w-full">
              Sign in
            </Button>
            <p className="text-[11px] text-brand-200">
              Demo password for every account: <code className="rounded bg-white/10 px-1">{DEMO_PASSWORD}</code>
            </p>
          </form>
        </div>
        <p className="mt-8 text-[11px] text-brand-200">© STEMbotix · Mockup for client review. Not connected to any live system.</p>
      </div>

      <div className="px-4 py-8 sm:px-8 lg:py-12">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-brand">One-click demo logins</h2>
            <p className="mb-5 text-sm text-slate-500">Each card signs you in as that user.</p>
          </div>
          <Link href="/guide" className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:bg-accent-700">
            Guided walkthrough →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {FEATURED.map((a: DemoAccount) => {
            const Icon = ICON[a.role];
            return (
              <button
                key={a.email}
                onClick={() => go(a)}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-brand-300 hover:shadow-md"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{a.title}</div>
                    <div className="truncate text-xs text-slate-500">{a.name}</div>
                  </div>
                </div>
                <p className="mt-3 flex-1 text-xs leading-relaxed text-slate-600">{a.description}</p>
                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <code className="truncate text-slate-400">{a.email}</code>
                  <ArrowRight className="h-4 w-4 text-accent transition group-hover:translate-x-0.5" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-800">Sign in as any other user</h3>
          <p className="mb-3 text-xs text-slate-500">25 departments · 50 instructors · 500 institutes in the dummy data.</p>
          <Select value={other} onChange={(e) => pickOther(e.target.value)} className="w-full">
            <option value="">Choose a user…</option>
            <optgroup label="Department Coordinators">
              {departments.map((d) => (
                <option key={d.id} value={`dep:${d.id}`}>
                  {d.code} · {d.name}: {d.coordinator}
                </option>
              ))}
            </optgroup>
            <optgroup label="Instructors">
              {instructors.map((i) => (
                <option key={i.id} value={`ins:${i.id}`}>
                  {i.name} ({departments.find((d) => d.id === i.departmentId)!.name})
                </option>
              ))}
            </optgroup>
            <optgroup label="Institute Coordinators">
              {institutes.map((i) => (
                <option key={i.id} value={`inst:${i.id}`}>
                  {i.code} · {i.name}
                </option>
              ))}
            </optgroup>
          </Select>
        </div>
      </div>
    </div>
  );
}
