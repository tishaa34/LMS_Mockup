'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useStore } from '@/lib/store';

export default function Home() {
  const { session } = useStore();
  const router = useRouter();
  useEffect(() => {
    router.replace(session ? '/dashboard/' : '/login/');
  }, [session, router]);
  return null;
}
