import { BarChart3 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Reports' };

export default function ReportsPage() {
  return (
    <section className="flex flex-1 flex-col gap-4">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Insight
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <BarChart3 className="h-6 w-6" />
          Reports
        </h1>
        <p className="text-sm text-muted-foreground">
          Collections, arrears, contribution progress, payment method breakdown, expenses by
          category, member statements.
        </p>
      </header>

      <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Report picker + rendered tables + CSV export land in the next slice. The DB fns
        (finance.get_collections, get_arrears, get_contribution_progress,
        get_payment_method_breakdown, get_expense_report_by_category, get_member_statement,
        get_donation_report) are all wired.
      </div>
    </section>
  );
}
