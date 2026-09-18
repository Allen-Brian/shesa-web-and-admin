'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from '@shesa/ui';
import { ChevronRight, Plus, Trash2, Trophy } from 'lucide-react';
import { useState, useTransition } from 'react';

import { createCeremony, deleteCeremony, type CeremonyInput } from '../actions/voting-actions';
import type { EditionSummary } from '../load-voting';
import { fromWatInput, watDate } from '../wat';

import { PhaseBadge } from './phase-badge';

const BLANK: CeremonyInput = {
  name: '',
  description: null,
  nominationsOpenAt: null,
  nominationsCloseAt: null,
  votingOpenAt: null,
  votingCloseAt: null,
};

/**
 * Every ceremony, as a table you click into.
 *
 * Rows rather than cards: the useful comparison between two cycles is their
 * dates and their counts side by side, and cards put those on separate
 * lines at different heights.
 */
export function CeremonyIndex({ editions }: { readonly editions: readonly EditionSummary[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<EditionSummary | null>(null);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    startTransition(async () => {
      const res = await deleteCeremony(target.id);
      if (res.ok) toast.success('Ceremony deleted.');
      else toast.error(res.message);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {editions.length === 0
            ? 'No ceremonies yet.'
            : `${editions.length} ${editions.length === 1 ? 'ceremony' : 'ceremonies'}`}
        </p>
        <Button type="button" onClick={() => setCreating(true)}>
          <Plus className="h-3.5 w-3.5" /> New ceremony
        </Button>
      </div>

      {editions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <Trophy className="h-8 w-8 text-muted-foreground" aria-hidden />
          <p className="text-sm font-medium text-foreground">Start an awards ceremony</p>
          <p className="max-w-md text-sm text-muted-foreground">
            A ceremony holds its own categories, awards and dates. Create it, add the awards, then
            open nominations.
          </p>
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus className="h-3.5 w-3.5" /> New ceremony
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Ceremony</th>
                <th className="px-3 py-2 text-left font-medium">Nominations</th>
                <th className="px-3 py-2 text-left font-medium">Voting</th>
                <th className="px-3 py-2 text-right font-medium">Awards</th>
                <th className="px-3 py-2 text-right font-medium">Names in</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {editions.map((e) => (
                <tr
                  key={e.id}
                  className="cursor-pointer border-t transition-colors hover:bg-muted/40"
                  onClick={() => router.push(`/editor/voting/${e.slug}`)}
                >
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/editor/voting/${e.slug}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        {e.name}
                      </Link>
                      <PhaseBadge phase={e.phase} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{e.slug}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {watDate(e.nominationsOpenAt, false)} → {watDate(e.nominationsCloseAt, false)}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {watDate(e.votingOpenAt, false)} → {watDate(e.votingCloseAt, false)}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {e.awardCount}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {e.nominationCount}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setRemoving(e);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateCeremonyDialog
        open={creating}
        onOpenChange={setCreating}
        onCreated={(slug) => router.push(`/editor/voting/${slug}`)}
      />

      <ConfirmDialog
        open={removing !== null}
        title={`Delete "${removing?.name ?? ''}"?`}
        description={`Its ${removing?.awardCount ?? 0} award(s) and ${removing?.nominationCount ?? 0} nomination(s) go with it, and this cannot be undone. A ceremony that already holds cast ballots is refused.`}
        confirmLabel="Delete"
        onConfirm={remove}
        onCancel={() => setRemoving(null)}
      />

      {pending && <span className="sr-only">Working…</span>}
    </div>
  );
}

/**
 * Creating a ceremony asks for the name and the two windows, and nothing
 * else. Categories and awards come next, on the ceremony's own page, where
 * there is room to see them as a structure rather than a list of fields.
 */
function CreateCeremonyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onCreated: (slug: string) => void;
}) {
  const [input, setInput] = useState<CeremonyInput>(BLANK);
  const [nomOpen, setNomOpen] = useState('');
  const [nomClose, setNomClose] = useState('');
  const [voteOpen, setVoteOpen] = useState('');
  const [voteClose, setVoteClose] = useState('');
  const [pending, startTransition] = useTransition();

  const save = () => {
    if (input.name.trim().length < 2) {
      toast.error('The ceremony needs a name.');
      return;
    }
    startTransition(async () => {
      const res = await createCeremony({
        ...input,
        nominationsOpenAt: fromWatInput(nomOpen),
        nominationsCloseAt: fromWatInput(nomClose),
        votingOpenAt: fromWatInput(voteOpen),
        votingCloseAt: fromWatInput(voteClose),
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Ceremony created. Add its awards next.');
      onOpenChange(false);
      setInput(BLANK);
      if (res.slug) onCreated(res.slug);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New awards ceremony</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field label="Name" required>
            <Input
              value={input.name}
              onChange={(e) => setInput({ ...input, name: e.target.value })}
              placeholder="SHESA Leadership Awards 2027"
              maxLength={200}
              autoFocus
            />
          </Field>

          <Field label="Description — shown on the public page">
            <Textarea
              value={input.description ?? ''}
              onChange={(e) => setInput({ ...input, description: e.target.value })}
              rows={3}
              maxLength={1000}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nominations open">
              <Input
                type="datetime-local"
                value={nomOpen}
                onChange={(e) => setNomOpen(e.target.value)}
              />
            </Field>
            <Field label="Nominations close">
              <Input
                type="datetime-local"
                value={nomClose}
                onChange={(e) => setNomClose(e.target.value)}
              />
            </Field>
            <Field label="Voting opens">
              <Input
                type="datetime-local"
                value={voteOpen}
                onChange={(e) => setVoteOpen(e.target.value)}
              />
            </Field>
            <Field label="Voting closes">
              <Input
                type="datetime-local"
                value={voteClose}
                onChange={(e) => setVoteClose(e.target.value)}
              />
            </Field>
          </div>

          <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            All times are West Africa Time. The dates can be left blank and set later — the public
            site opens and closes itself from them, so nothing goes live until they are filled in.
            Weighting starts at the approved 60% ex-students / 40% Exco and cannot be changed here.
          </p>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? 'Creating…' : 'Create ceremony'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  readonly label: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}
