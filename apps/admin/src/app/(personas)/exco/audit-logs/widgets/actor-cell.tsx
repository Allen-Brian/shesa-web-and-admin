import { getInitials } from './audit-log-helpers';

export function ActorCell({
  label,
  email,
}: {
  readonly label: string;
  readonly email: string | null;
}) {
  const isSystem = label === '(system)';
  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
          isSystem
            ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {isSystem ? 'SY' : getInitials(label)}
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{label}</span>
        {email && email !== label && (
          <span className="truncate text-[11px] text-muted-foreground">{email}</span>
        )}
      </div>
    </div>
  );
}
