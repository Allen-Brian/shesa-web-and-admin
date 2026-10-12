import { StatsCard } from '@shesa/ui';

export interface AuditKpis {
  readonly total: number;
  readonly actors: number;
  readonly grants: number;
  readonly revokes: number;
  readonly changes: number;
}

export function AuditLogsKpiStrip({ kpis }: { readonly kpis: AuditKpis }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Events" value={kpis.total} />
      <StatsCard label="Unique actors" value={kpis.actors} />
      <StatsCard label="Grants" value={kpis.grants} />
      <StatsCard label="Revokes" value={kpis.revokes} />
      <StatsCard label="Changes" value={kpis.changes} />
    </div>
  );
}
