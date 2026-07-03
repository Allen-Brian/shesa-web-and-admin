export const metadata = {
  title: 'Shesa Admin — Editor',
};

export default function EditorDashboardPage() {
  return (
    <section className="flex flex-1 flex-col gap-2">
      <h1 className="text-2xl font-semibold tracking-tight">Editor dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Announcements, CMS pages, and the media library land here once the Phase 5 CMS spec ships.
      </p>
    </section>
  );
}
