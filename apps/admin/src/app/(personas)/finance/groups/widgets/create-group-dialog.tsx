'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  NativeDateInput,
  Switch,
  Textarea,
} from '@shesa/ui';

import { slugify } from './groups-helpers';
import type { CreateGroupForm } from './groups-types';

interface CreateGroupDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: CreateGroupForm;
  readonly onFormChange: (patch: Partial<CreateGroupForm>) => void;
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * "New event group" dialog. Slug auto-generates from the name; the
 * operator can override it explicitly. Every group also seeds a
 * same-named default donation campaign server-side — the description
 * text reminds the operator so they don't wonder where the campaign
 * appeared from.
 */
export function CreateGroupDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  onSubmit,
  pending,
}: CreateGroupDialogProps) {
  const derivedSlug = form.slug || slugify(form.name);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New event group</DialogTitle>
          <DialogDescription>
            Groups are mainstream-only lenses that gather every charge, donation, and expense for an
            event. Creating the group also seeds a same-named default donation campaign.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">Name</Label>
            <Input
              id="group-name"
              value={form.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
              placeholder="e.g. AGM 2026"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-slug">Slug</Label>
            <Input
              id="group-slug"
              value={form.slug || derivedSlug}
              onChange={(e) => onFormChange({ slug: e.target.value })}
              placeholder="agm-2026"
              maxLength={80}
            />
            <span className="text-xs text-muted-foreground">
              URL fragment: <code>/finance/groups/{derivedSlug || 'your-slug'}</code>
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-description">Description (optional)</Label>
            <Textarea
              id="group-description"
              rows={2}
              value={form.description}
              onChange={(e) => onFormChange({ description: e.target.value })}
              placeholder="Short summary of the event."
              maxLength={2000}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="group-starts">Starts on</Label>
              <NativeDateInput
                id="group-starts"
                value={form.startsOn}
                onChange={(v) => onFormChange({ startsOn: v })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="group-ends">Ends on</Label>
              <NativeDateInput
                id="group-ends"
                value={form.endsOn}
                onChange={(v) => onFormChange({ endsOn: v })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Show in sidebar</span>
              <span className="text-xs text-muted-foreground">
                Group shows up under Event Groups for every finance user with mainstream reach.
              </span>
            </div>
            <Switch
              checked={form.showInSidebar}
              onCheckedChange={(v) => onFormChange({ showInSidebar: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} loading={pending} disabled={pending}>
            Create group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
