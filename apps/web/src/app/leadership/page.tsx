import type { Metadata } from 'next';

import { BatchPresidents } from '@/components/leadership/batch-presidents';
import { BranchPresidents } from '@/components/leadership/branch-presidents';
import { DiasporaPresidents } from '@/components/leadership/diaspora-presidents';
import { LeadershipHero } from '@/components/leadership/leadership-hero';
import { MainOrgan } from '@/components/leadership/main-organ';

export const metadata: Metadata = {
  title: 'Leadership · SHESA',
  description: 'The National Executive, branch presidents, and batch chairs of the SHESA alumni.',
};

export default function LeadershipPage() {
  return (
    <>
      <LeadershipHero />
      <MainOrgan />
      <BranchPresidents />
      <DiasporaPresidents />
      <BatchPresidents />
    </>
  );
}
