'use client';

import { Button, Input, Label, Textarea, toast } from '@shesa/ui';
import { Lock, Plus, X } from 'lucide-react';
import { useState, useTransition } from 'react';

import { deleteExcoPost, saveExcoPost, updateEdition } from '../actions/voting-actions';
import type { CategoryRow, EditionRow } from '../voting-types';
import { fromWatInput, toWatInput } from '../wat';

import { CategoryManager } from './category-manager';
import { VotingLinks } from './voting-links';

/**
 * Everything true of the cycle as a whole.
 *
 * The dates first, because they are the only control over what the public
 * site shows — the phase is computed from these four timestamps, so there is
 * no publish button to forget at midnight. Then the two links, the
 * categories that group the awards, and the Exco post list.
 */
export function DescriptionPanel({
  edition,
  excoPosts,
  webBaseUrl,
  categories,
}: {
  readonly edition: EditionRow;
  readonly excoPosts: readonly { id: string; label: string; sortOrder: number }[];
  readonly webBaseUrl: string;
  readonly categories: readonly CategoryRow[];
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

  return (
    <div className="flex flex-col gap-6">
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

        <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Weighting is fixed at{' '}
            <strong className="text-foreground">
              {(edition.exStudentWeight * 100).toFixed(0)}% ex-students
            </strong>{' '}
            and{' '}
            <strong className="text-foreground">
              {(edition.excoWeight * 100).toFixed(0)}% Exco
            </strong>{' '}
            ({edition.weightingMethod.replace('_', ' ')}), as approved by the President
            General&apos;s briefing. It cannot be changed here — that needs written authorisation
            from SHESA and a change to the database.
          </span>
        </div>

        <div className="flex justify-end">
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </Section>

      <Section
        title="The two links"
        note="The difference between them is the whole security model of this election."
      >
        <VotingLinks
          slug={edition.slug}
          excoToken={edition.excoToken}
          editionId={edition.id}
          webBaseUrl={webBaseUrl}
        />
      </Section>

      <Section
        title="Categories"
        note="Headings that group the awards. An award can also stand alone — Branch and Country Chapter have no parent heading."
      >
        <CategoryManager editionId={edition.id} categories={categories} />
      </Section>

      <Section
        title="Executive Committee posts"
        note="What an Exco voter picks from before casting. A free-text box here would give you 'Treasurer', 'treasurer' and 'Nat. Treasurer' to reconcile afterwards."
      >
        <ExcoPosts editionId={edition.id} posts={excoPosts} />
      </Section>
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
