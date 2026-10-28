'use client';
import { BadgeCheck, Clock } from 'lucide-react';
import { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ABC_RE } from '@/components/institute/BatchTab';
import { Button, Card, Field, Input, Note, PageHeader, Status } from '@/components/ui';
import { instituteById, institutes } from '@/lib/data';
import { findStudent, getStudents } from '@/lib/logic';
import { useStore } from '@/lib/store';

export default function ProfilePage() {
  return (
    <AppShell roles={['STUDENT']}>
      <Profile />
    </AppShell>
  );
}

function Profile() {
  const { state, update, session, toast } = useStore();
  const st = findStudent(state, session!.refId)!;
  const inst = instituteById.get(st.instituteId)!;
  const [abc, setAbc] = useState('');
  const [confirmAbc, setConfirmAbc] = useState('');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState('');

  const save = () => {
    if (!ABC_RE.test(abc)) return setErr('ABC ID must be exactly 12 digits.');
    if (abc !== confirmAbc) return setErr('The two ABC IDs do not match.');
    if (!consent) return setErr('Please give consent to continue.');
    // The real system enforces this with a unique index on live students.
    const taken = institutes.some((i) => getStudents(state, i.id).some((x) => x.abcId === abc && x.id !== st.id));
    if (taken) return setErr('This ABC ID is already registered to another student. Contact your institute coordinator.');
    update((s) => ({ ...s, students: { ...s.students, [st.id]: { ...s.students[st.id], abcId: abc, abcVerified: false } } }));
    toast('ABC ID registered. Your institute coordinator will verify it.');
    setErr('');
  };

  return (
    <>
      <PageHeader title="Profile & ABC ID" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="My details">
          <dl className="space-y-2 text-sm">
            {[
              ['Name', st.name],
              ['Roll no.', st.rollNo],
              ['Institute', `${inst.name} (${inst.code})`],
              ['Team', `Team ${st.teamNo}`],
              ['Email', st.email],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title="Academic Bank of Credits (ABC) ID">
          {st.abcId ? (
            <div className="space-y-3">
              <div className="font-mono text-2xl tracking-widest text-brand">{st.abcId.replace(/(\d{4})(?=\d)/g, '$1 ')}</div>
              {st.abcVerified ? (
                <Status light="good"><BadgeCheck className="h-3 w-3" /> Verified by institute</Status>
              ) : (
                <Status light="warn"><Clock className="h-3 w-3" /> Awaiting verification by your institute coordinator</Status>
              )}
              <p className="text-sm text-slate-500">Your KCG program attendance, project and marks can be looked up by authorised partners using this ID.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Note>Your ABC ID is the 12-digit ID from the Academic Bank of Credits (abc.gov.in / DigiLocker). It is required for the KCG program.</Note>
              <Field label="ABC ID"><Input inputMode="numeric" maxLength={12} placeholder="12 digits" value={abc} onChange={(e) => setAbc(e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="Confirm ABC ID"><Input inputMode="numeric" maxLength={12} value={confirmAbc} onChange={(e) => setConfirmAbc(e.target.value.replace(/\D/g, ''))} /></Field>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#2C2872]" />
                I consent to STEMbotix sharing my KCG program attendance, project status and marks with authorised program partners using my ABC ID.
              </label>
              {err && <p className="text-sm text-bad">{err}</p>}
              <Button onClick={save}>Register ABC ID</Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
