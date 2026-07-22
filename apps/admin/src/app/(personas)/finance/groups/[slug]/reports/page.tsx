import { BarChart } from 'lucide-react';

export const dynamic = 'force-dynamic';

/**
 * Group Reports — placeholder pending Module 8. The mainstream Reports
 * surface takes an optional `group_id` narrowing param; once wired,
 * this page renders that view scoped to the current group.
 */
export default function GroupReportsPage() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <BarChart className="h-8 w-8 text-muted-foreground" />
      <h2 className="text-lg font-semibold">Reports arriving soon</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Reports for this group ride on the mainstream reports engine, which is being extended for
        group narrowing in the next step. Until then, run the mainstream report and filter to this
        group's scope.
      </p>
    </section>
  );
}
