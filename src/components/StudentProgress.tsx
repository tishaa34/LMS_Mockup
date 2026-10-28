'use client';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { MODULES, SLOT_SHORT, TOTAL_SESSIONS, sessionModules } from '@/lib/data';
import { activeBookings, getTeam, isPresent, studentProgress } from '@/lib/logic';
import { useStore } from '@/lib/store';
import { TODAY, fmtDay } from '@/lib/util';
import type { Student } from '@/lib/data';
import { Card, Progress, StatTile, Status, Table, Td, Th } from './ui';

export function StudentProgressView({ student }: { student: Student }) {
  const { state } = useStore();
  const p = studentProgress(state, student);
  const sessions = activeBookings(state, student.instituteId);
  const team = getTeam(state, student.instituteId, student.teamNo);
  const covered = new Set(sessions.flatMap((b) => b.topics));

  return (
    <div className="space-y-5">
      {!student.abcId && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-accent-100 bg-accent-50 px-4 py-3 text-sm text-accent-700">
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Your ABC ID is not registered yet. It is required for the KCG program.
          </span>
          <Link href="/profile" className="font-semibold underline">
            Register ABC ID
          </Link>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Sessions attended" value={`${p.present}/${p.held.length}`} sub={`${TOTAL_SESSIONS} sessions in the program`} />
        <StatTile label="Attendance" value={p.attendance === null ? '—' : `${p.attendance}%`} sub={p.attendance === null ? 'No sessions yet' : p.attendance >= 75 ? 'Meets 75% requirement' : 'Below 75% requirement'} light={p.attendance === null ? undefined : p.attendance >= 75 ? 'good' : 'warn'} />
        <StatTile label="Assessment marks" value={p.marks.marks === null ? '—' : `${p.marks.marks}/100`} sub={p.marks.status === 'NOT_ENTERED' ? 'Not entered yet' : p.marks.status === 'VERIFIED' ? 'Verified' : 'Entered'} />
        <StatTile label="Program status" value={p.completed ? 'Completed' : 'In progress'} light={p.completed ? 'good' : 'warn'} sub={p.completed ? 'Eligible for certificate' : 'Keep going'} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="My sessions">
          <Table>
            <thead>
              <tr>
                <Th>Session</Th>
                <Th>Date</Th>
                <Th>Topics</Th>
                <Th>Attendance</Th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((b) => (
                <tr key={b.id}>
                  <Td>S{b.sessionNo}</Td>
                  <Td className="whitespace-nowrap">
                    {fmtDay(b.date)} · {SLOT_SHORT[b.slot]}
                  </Td>
                  <Td className="text-xs text-slate-600">{sessionModules(b.sessionNo).join(', ')}</Td>
                  <Td>
                    {b.attendanceMarked && b.date <= TODAY ? (
                      isPresent(state, b, student) ? <Status light="good">Present</Status> : <Status light="bad">Absent</Status>
                    ) : (
                      <Status light="none">Upcoming</Status>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <div className="space-y-5">
          <Card title={`Team ${student.teamNo} project`}>
            <div className="text-base font-semibold text-brand">{team.title}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Status light={team.setupStatus === 'COMPLETED' ? 'good' : team.setupStatus === 'IN_PROGRESS' ? 'warn' : 'none'}>
                Setup: {team.setupStatus.replace('_', ' ').toLowerCase()}
              </Status>
              <Status light={team.reviewStatus === 'APPROVED' ? 'good' : team.reviewStatus === 'CORRECTIONS' ? 'bad' : 'none'}>
                Checking: {team.reviewStatus === 'CORRECTIONS' ? 'corrections required' : team.reviewStatus.toLowerCase()}
              </Status>
            </div>
            {team.feedback && <p className="mt-2 text-sm text-slate-600">Feedback: {team.feedback}</p>}
            {team.corrections && <p className="mt-1 text-sm text-bad">Corrections: {team.corrections}</p>}
          </Card>
          <Card title="Topics covered">
            <div className="mb-2 flex justify-between text-xs text-slate-500">
              <span>
                {covered.size} of {MODULES.length} modules
              </span>
            </div>
            <Progress value={(covered.size / MODULES.length) * 100} />
            <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              {MODULES.map((m) => (
                <li key={m} className={covered.has(m) ? 'text-slate-800' : 'text-slate-400'}>
                  {covered.has(m) ? '✓' : '○'} {m}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
