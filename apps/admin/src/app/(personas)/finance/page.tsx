export const metadata = {
  title: 'Shesa Admin — Finance',
};

export default function FinanceDashboardPage() {
  return (
    <section className="flex flex-1 flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Finance dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Contribution review inbox, ledger, and treasury reports land here once the Phase 3 Finance
        spec ships.
      </p>
    </section>
  );
}
