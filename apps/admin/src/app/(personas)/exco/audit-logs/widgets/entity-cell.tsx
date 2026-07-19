export function EntityCell({
  schema,
  table,
  entityId,
}: {
  readonly schema: string;
  readonly table: string;
  readonly entityId: string | null;
}) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-xs font-medium text-foreground">
        {schema}.{table}
      </span>
      {entityId && (
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          {entityId.slice(0, 8)}…
        </span>
      )}
    </div>
  );
}
