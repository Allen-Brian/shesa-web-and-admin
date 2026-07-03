export const metadata = {
  title: 'Shesa Admin — Exco',
};

export default function ExcoDashboardPage() {
  return (
    <section className="flex flex-1 flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Exco dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Widgets, member ops, governance, positions, and events land here as the Phase 2 domain epics
        roll in.
      </p>
    </section>
  );
}
