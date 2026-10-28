'use client';
import {
  BarChart3, BookOpen, Building2, CalendarCheck, CalendarClock, ClipboardCheck, FileDown, GraduationCap, KeyRound,
  LayoutDashboard, LifeBuoy, LogOut, Menu, RotateCcw, Settings, UserCircle, X, type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import type { Role } from '@/lib/data';
import { ROLE_LABEL } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { cx } from '@/lib/util';

export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  ADMIN: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/institutes', label: 'All Institutes', icon: Building2 },
    { href: '/scheduling', label: 'Training Bookings', icon: CalendarCheck },
    { href: '/availability', label: 'Instructor Availability', icon: CalendarClock },
    { href: '/issues', label: 'Issues & Follow-up', icon: LifeBuoy },
    { href: '/reports', label: 'Reports & Export', icon: FileDown },
    { href: '/partner-api', label: 'ABC ID Partner API', icon: KeyRound },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  DEPARTMENT: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/institutes', label: 'Department Institutes', icon: Building2 },
    { href: '/scheduling', label: 'Training Bookings', icon: CalendarCheck },
    { href: '/availability', label: 'Instructor Availability', icon: CalendarClock },
    { href: '/issues', label: 'Issues & Follow-up', icon: LifeBuoy },
    { href: '/reports', label: 'Reports & Export', icon: FileDown },
  ],
  INSTRUCTOR: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/sessions', label: 'My Sessions', icon: ClipboardCheck },
    { href: '/availability', label: 'My Availability', icon: CalendarClock },
    { href: '/institutes', label: 'My Institutes', icon: Building2 },
    { href: '/issues', label: 'Issues & Follow-up', icon: LifeBuoy },
  ],
  INSTITUTE: [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/scheduling', label: 'Book Training', icon: CalendarCheck },
    { href: '/institute', label: 'My Institute & Batch', icon: Building2 },
    { href: '/issues', label: 'Issues & Follow-up', icon: LifeBuoy },
  ],
  STUDENT: [
    { href: '/dashboard', label: 'My Progress', icon: BarChart3 },
    { href: '/profile', label: 'Profile & ABC ID', icon: UserCircle },
  ],
};

export function AppShell({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { session, logout, reset, toast } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!session) router.replace('/login/');
  }, [session, router]);
  useEffect(() => setOpen(false), [path]);

  if (!session) return null;
  const nav = NAV[session.role];
  const allowed = !roles || roles.includes(session.role);
  const isActive = (href: string) => path === href || path === href + '/';

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 py-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${BASE}/logo.png`} alt="" className="h-8 w-auto" />
        <div className="leading-tight">
          <div className="text-sm font-bold text-white">STEMbotix LMS</div>
          <div className="text-[11px] font-medium text-accent-100">KCG · RUSA Program</div>
        </div>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={cx(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
              isActive(n.href) ? 'bg-white/15 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white',
            )}
          >
            <n.icon className="h-4 w-4" aria-hidden />
            {n.label}
          </Link>
        ))}
        <div className="my-2 border-t border-white/10" />
        <Link
          href="/guide"
          className={cx('flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium', isActive('/guide') ? 'bg-white/15 text-white' : 'text-brand-200 hover:bg-white/10 hover:text-white')}
        >
          <BookOpen className="h-4 w-4" aria-hidden />
          Demo guide
        </Link>
      </div>
      <div className="space-y-1 border-t border-white/10 p-3">
        <button
          onClick={() => {
            if (confirm('Reset all demo data to the original dummy data?')) {
              reset();
              toast('Demo data reset');
            }
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-brand-200 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo data
        </button>
        <button
          onClick={() => {
            logout();
            router.replace('/login/');
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-brand-200 hover:bg-white/10 hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" /> Switch user / Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FD]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 bg-brand lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/40" />
          <aside className="absolute inset-y-0 left-0 w-64 bg-brand" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-2 top-3 p-1 text-white" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="lg:pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <button className="rounded p-1.5 text-brand hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <span className="hidden rounded-full bg-accent-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-accent-700 sm:inline">
              Demo mockup · dummy data
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-right">
            <div className="leading-tight">
              <div className="text-sm font-semibold text-slate-800">{session.name}</div>
              <div className="text-[11px] text-slate-500">{ROLE_LABEL[session.role]}</div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
              {session.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1400px] px-4 py-6">
          {allowed ? (
            children
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              <GraduationCap className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              This page is not available for the <b>{ROLE_LABEL[session.role]}</b> role.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
