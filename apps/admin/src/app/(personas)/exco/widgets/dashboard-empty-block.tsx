export function DashboardEmptyBlock({ label }: { readonly label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}
