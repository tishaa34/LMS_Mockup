'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { BatchTab } from '@/components/institute/BatchTab';
import { IssuesTab } from '@/components/institute/IssuesTab';
import { KitTab } from '@/components/institute/KitTab';
import { MarksTab } from '@/components/institute/MarksTab';
import { ProfileTab } from '@/components/institute/ProfileTab';
import { ProjectsTab } from '@/components/institute/ProjectsTab';
import { TrainingTab } from '@/components/institute/TrainingTab';
import { Empty, PageHeader, Status, Tabs } from '@/components/ui';
import { scopedInstitutes, summarize } from '@/lib/logic';
import { useStore } from '@/lib/store';

export default function InstitutePage() {
  return (
    <AppShell roles={['ADMIN', 'DEPARTMENT', 'INSTRUCTOR', 'INSTITUTE']}>
      <Suspense>
        <InstituteDetail />
      </Suspense>
    </AppShell>
  );
}

const TABS = ['profile', 'kit', 'training', 'batch', 'projects', 'marks', 'issues'] as const;
type Tab = (typeof TABS)[number];

function InstituteDetail() {
  const { state, session } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const id = session!.role === 'INSTITUTE' ? session!.refId : params.get('id') ?? '';
  const tabParam = params.get('tab') as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : session!.role === 'INSTITUTE' ? 'batch' : 'profile';

  if (!scopedInstitutes(session!).some((i) => i.id === id)) {
    return <Empty>Institute not found, or not in your scope. <Link href="/institutes" className="font-semibold text-accent">Back to list</Link></Empty>;
  }
  const s = summarize(state, id);
  const setTab = (t: Tab) => router.replace(`/institute?id=${id}&tab=${t}`, { scroll: false });

  return (
    <>
      {session!.role !== 'INSTITUTE' && (
        <Link href="/institutes" className="mb-2 inline-block text-xs font-medium text-accent hover:underline">
          ← Back to institutes
        </Link>
      )}
      <PageHeader
        title={s.inst.name}
        sub={`${s.inst.code} · ${s.departmentName} Department · ${s.inst.district} · Instructor: ${s.instructorName}`}
        actions={
          <div className="flex flex-wrap gap-1.5">
            <Status light={s.trainingLight}>Training: {s.training}</Status>
            <Status light={s.kitLight}>Kit: {s.kit}</Status>
            {s.openIssues > 0 && <Status light={s.overdueIssues ? 'bad' : 'warn'}>{s.openIssues} open issues</Status>}
          </div>
        }
      />
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'profile', label: 'Profile' },
          { id: 'kit', label: 'Kit delivery' },
          { id: 'training', label: 'Training & sessions', count: s.sessionsBooked },
          { id: 'batch', label: 'Batch & attendance', count: s.enrolled },
          { id: 'projects', label: 'Projects' },
          { id: 'marks', label: 'Marks' },
          { id: 'issues', label: 'Issues', count: s.openIssues },
        ]}
      />
      {tab === 'profile' && <ProfileTab id={id} />}
      {tab === 'kit' && <KitTab id={id} />}
      {tab === 'training' && <TrainingTab id={id} />}
      {tab === 'batch' && <BatchTab id={id} />}
      {tab === 'projects' && <ProjectsTab id={id} />}
      {tab === 'marks' && <MarksTab id={id} />}
      {tab === 'issues' && <IssuesTab instituteId={id} />}
    </>
  );
}
