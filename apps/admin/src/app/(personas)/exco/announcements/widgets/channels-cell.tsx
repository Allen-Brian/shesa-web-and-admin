import { Badge } from '@shesa/ui';

import { CHANNEL_LABEL, CHANNEL_TONE } from './status-constants';

type Channel = 'in_app' | 'email' | 'forum';

/**
 * Channels cell — one small tag per delivery channel. Announcements can
 * carry any combination of `in_app`, `email`, and `forum`; the pills
 * render only the channels present on the row.
 */
export function ChannelsCell({ channels }: { readonly channels: readonly Channel[] }) {
  if (channels.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {channels.map((c) => (
        <Badge
          key={c}
          variant="outline"
          className={`${CHANNEL_TONE[c]} h-5 shrink-0 px-2 py-0 text-[10px] font-medium leading-none`}
        >
          {CHANNEL_LABEL[c]}
        </Badge>
      ))}
    </div>
  );
}
