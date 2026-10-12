import type { LucideIcon } from 'lucide-react';

interface ProfileInfoRowProps {
  readonly Icon: LucideIcon;
  readonly value: string;
}

export function ProfileInfoRow({ Icon, value }: ProfileInfoRowProps) {
  return (
    <div className="flex items-start gap-2 text-sm text-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{value}</span>
    </div>
  );
}
