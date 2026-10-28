'use client';
import { AppShell } from '@/components/AppShell';
import { IssuesTab } from '@/components/institute/IssuesTab';
import { PageHeader } from '@/components/ui';

export default function IssuesPage() {
  return (
    <AppShell roles={['ADMIN', 'DEPARTMENT', 'INSTRUCTOR', 'INSTITUTE']}>
      <PageHeader title="Issues & Follow-up" sub="Pending actions, responsible person, target date and closure status" />
      <IssuesTab />
    </AppShell>
  );
}
