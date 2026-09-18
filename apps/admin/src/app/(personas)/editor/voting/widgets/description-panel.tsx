'use client';

import { Button, Input, Label, Switch, Textarea, toast } from '@shesa/ui';
import { Globe, Plus, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import {
  deleteExcoPost,
  saveExcoPost,
  setActiveCeremony,
  updateEdition,
} from '../actions/voting-actions';
import type { EditionRow } from '../voting-types';
import { fromWatInput, toWatInput } from '../wat';

import { VotingLinks } from './voting-links';
import { WeightingSettings } from './weighting-settings';

/**
 * Everything true of the cycle as a whole.
 *
 * The dates first, because they are the only control over what the public
 * site shows — the phase is computed from these four timestamps, so there is
 * no publish button to forget at midnight. Then how votes are weighted, the
 * two links, and the Exco post list.
 *
 * Categories are NOT here. A category only exists to group awards, so it
 * lives beside them on the Awards tab — and can be created from inside the
 * award dialog, rather than sending someone to a different screen to make
 * one before they can finish the thing they were doing.
 */
export function DescriptionPanel({
  edition,
  excoPosts,
  webBaseUrl,
  ballotsCast,
}: {
  readonly edition: EditionRow;
  readonly excoPosts: readonly { id: string; label: string; sortOrder: number }[];
  readonly webBaseUrl: string;
  readonly ballotsCast: number;
}) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(edition.name);
  const [description, setDescription] = useState(edition.description ?? '');
  const [nomOpen, setNomOpen] = useState(toWatInput(edition.nominationsOpenAt));
  const [nomClose, setNomClose] = useState(toWatInput(edition.nominationsCloseAt));
  const [voteOpen, setVoteOpen] = useState(toWatInput(edition.votingOpenAt));
  const [voteClose, setVoteClose] = useState(toWatInput(edition.votingCloseAt));

  const save = () =>
    startTransition(async () => {
      const res = await updateEdition(edition.id, {
        name,
        description: description || null,
        nominationsOpenAt: fromWatInput(nomOpen),
        nominationsCloseAt: fromWatInput(nomClose),
        votingOpenAt: fromWatInput(voteOpen),
        votingCloseAt: fromWatInput(voteClose),
      });
      if (res.ok) toast.success('Saved. The public site follows these dates.');
      else toast.error(res.message);
    });

  const toggleActive = (next: boolean) =>
    startTransition(async () => {
      const res = await setActiveCeremony(next ? edition.id : null);
      if (res.ok) {
        toast.success(
          next
            ? 'This ceremony is now the one the website shows.'
            : 'Stood down. The awards page has nothing to show until a ceremony is made live.',
        );
      } else {
        toast.error(res.message);
      }
    });

  return (
    <div className="flex flex-col gap-6">
      {/* The switch that puts a nomination form in front of the membership.
          Only one ceremony can be live at a time — the database enforces it,
          so turning this on stands the previous one down. */}
      <div
        className={`flex flex-wrap items-center gap-4 rounded-lg border p-4 ${
          edition.isActive ? 'border-emerald-500/40 bg-emerald-500/5' : 'bg-card'
        }`}
      >
        <Globe
          className={`h-5 w-5 shrink-0 ${
            edition.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
          }`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">
            {edition.isActive ? 'Live on the website' : 'Not on the website'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {edition.isActive
              ? 'This is the ceremony visitors see at /awards. Turning it off leaves the page with nothing to show.'
              : 'Turn this on to make it the ceremony visitors see. Only one can be live at a time, so any other is stood down.'}
          </p>
        </div>
        <Switch
          checked={edition.isActive}
          onCheckedChange={toggleActive}
          disabled={pending}
          aria-label="Live on the website"
        />
      </div>

      <Section
        title="The cycle"
        note="All times are West Africa Time. The site opens and closes itself on these dates."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
          </Field>
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

        <Field label="Description — shown on the public page">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
          />
        </Field>

        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Section>

      <Section
        title="Weighting"
        note="How this ceremony counts votes. Changing it after ballots are cast changes a result people have already voted towards, so the change is stamped with your name and the time."
      >
        <WeightingSettings edition={edition} ballotsCast={ballotsCast} />
      </Section>

      <Section
        title={edition.votingMode === 'public_only' ? 'The voting link' : 'The two links'}
        note={
          edition.votingMode === 'public_only'
            ? 'One college, so one link. Everyone votes through the same URL.'
            : 'The difference between them is the whole security model of this election.'
        }
      >
        <VotingLinks
          slug={edition.slug}
          excoToken={edition.excoToken}
          editionId={edition.id}
          webBaseUrl={webBaseUrl}
          publicOnly={edition.votingMode === 'public_only'}
        />
      </Section>

      {edition.votingMode !== 'public_only' && (
        <Section
          title="Executive Committee posts"
          note="What an Exco voter picks from before casting. A free-text box here would give you 'Treasurer', 'treasurer' and 'Nat. Treasurer' to reconcile afterwards."
        >
          <ExcoPosts editionId={edition.id} posts={excoPosts} />
        </Section>
      )}
    </div>
  );
}

function ExcoPosts({
  editionId,
  posts,
}: {
  readonly editionId: string;
  readonly posts: readonly { id: string; label: string; sortOrder: number }[];
}) {
  const [label, setLabel] = useState('');
  const [pending, startTransition] = useTransition();

  const add = () =>
    startTransition(async () => {
      const res = await saveExcoPost(editionId, label, posts.length + 1);
      if (res.ok) {
        setLabel('');
        toast.success('Post added.');
      } else {
        toast.error(res.message);
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {posts.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs text-foreground"
          >
            {p.label}
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await deleteExcoPost(p.id);
                  if (!res.ok) toast.error(res.message);
                })
              }
              className="text-muted-foreground transition-colors hover:text-destructive"
              aria-label={`Remove ${p.label}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {posts.length === 0 && <p className="text-sm text-muted-foreground">No posts yet.</p>}
      </div>

      <div className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && label.trim().length >= 2) {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Add a post"
          className="w-[260px]"
          maxLength={160}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending || label.trim().length < 2}
          onClick={add}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
