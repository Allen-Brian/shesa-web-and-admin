import { STATUS, STATUS_FALLBACK } from './status-constants';

export function StatusCell({ status }: { readonly status: string }) {
  const desc = STATUS[status] ?? STATUS_FALLBACK;
  const Icon = desc.icon;
  return (
    <span className={`inline-flex h-full items-center gap-1.5 text-sm ${desc.className}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{desc.label}</span>
    </span>
  );
}
