import type { Metadata } from 'next';

import { BackgroundMandate } from '@/components/strategic-plan/background-mandate';
import { ExecutiveSummary } from '@/components/strategic-plan/executive-summary';
import { FinancialFramework } from '@/components/strategic-plan/financial-framework';
import { ImplementationResults } from '@/components/strategic-plan/implementation-results';
import { RiskManagement } from '@/components/strategic-plan/risk-management';
import { StrategicCallToAction } from '@/components/strategic-plan/strategic-call-to-action';
import { StrategicConclusion } from '@/components/strategic-plan/strategic-conclusion';
import { StrategicFramework } from '@/components/strategic-plan/strategic-framework';
import { StrategicGoals } from '@/components/strategic-plan/strategic-goals';
import { StrategicPlanHero } from '@/components/strategic-plan/strategic-plan-hero';

export const metadata: Metadata = {
  title: 'Strategic Plan 2026 \u2013 2030',
  description:
    'SHESA’s five-year pathway to institutional unity, member value, financial resilience, and societal impact. The 2026 – 2030 Strategic Plan.',
  alternates: { canonical: '/strategic-plan' },
  openGraph: {
    title: 'Strategic Plan 2026 \u2013 2030',
    description:
      'SHESA\u2019s five-year pathway to institutional unity, member value, financial resilience, and societal impact. The 2026 \u2013 2030 Strategic Plan.',
    url: '/strategic-plan',
    type: 'website',
  },
};

export default function StrategicPlanPage() {
  return (
    <>
      <StrategicPlanHero />
      <ExecutiveSummary />
      <BackgroundMandate />
      <StrategicFramework />
      <StrategicGoals />
      <ImplementationResults />
      <FinancialFramework />
      <RiskManagement />
      <StrategicCallToAction />
      <StrategicConclusion />
    </>
  );
}
