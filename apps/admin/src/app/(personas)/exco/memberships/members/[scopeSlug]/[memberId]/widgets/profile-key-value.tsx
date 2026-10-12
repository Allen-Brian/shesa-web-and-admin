interface ProfileKeyValueProps {
  readonly k: string;
  readonly v: string;
}

export function ProfileKeyValue({ k, v }: ProfileKeyValueProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-xs text-muted-foreground">{k}</div>
      <div className="text-sm text-foreground">{v}</div>
    </div>
  );
}
