'use client';

import { Checkbox, Label } from '@shesa/ui';

interface ChannelsChecklistProps {
  readonly email: boolean;
  readonly onEmailChange: (v: boolean) => void;
}

export function ChannelsChecklist({ email, onEmailChange }: ChannelsChecklistProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm">Channels</Label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked disabled />
        <span className="text-muted-foreground">In-app (always on)</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={email} onCheckedChange={(v) => onEmailChange(v === true)} />
        <span>Email</span>
      </label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox checked={false} disabled />
        <span>Forum (Phase 8)</span>
      </label>
      {email && <input type="hidden" name="channelEmail" value="on" />}
    </div>
  );
}
