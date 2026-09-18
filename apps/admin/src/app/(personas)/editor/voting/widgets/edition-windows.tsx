'use client';

import { Button, Input, Label, Textarea, toast } from '@shesa/ui';
import { Lock } from 'lucide-react';
import { useState, useTransition } from 'react';

import { updateEdition } from '../actions/voting-actions';
import type { EditionRow } from '../voting-types';

/**
 * WAT, as a `datetime-local` value.
 *
 * The input has no timezone, so the string handed to it must already be in
 * the zone the reader thinks in. Formatting in WAT and parsing back with an
 * explicit +01:00 keeps a deadline meaning the same thing to an editor in
 * Yaoundé and to a server in Virginia.
 */
function toWatInput(iso: string | null): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // Midnight comes back as hour "24" from some ICU builds.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

function fromWatInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+01:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * The dates that drive everything.
 *
 * The phase is computed from these four timestamps, so this form is the only
 * control over what the public site shows — there is no "publish" button to
 * forget to press at midnight.
 *
 * The weights are displayed and not editable. The briefing forbids altering
 * them without written authorisation from SHESA, and a form field is not
 * somewhere that authorisation can be recorded; changing them is a migration,
 * which leaves a commit with a name on it.
 */
export function EditionWindows({ edition }: { readonly edition: EditionRow }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(edition.name);
  const [description, setDescription] = useState(edition.description ?? '');
  const [nomOpen, setNomOpen] = useState(toWatInput(edition.nominationsOpenAt));
  const [nomClose, setNomClose] = useState(toWatInput(edition.nominationsCloseAt));
  const [voteOpen, setVoteOpen] = useState(toWatInput(edition.votingOpenAt));
  const [voteClose, setVoteClose] = useState(toWatInput(edition.votingCloseAt));

  const save = () => {
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
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">The cycle</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          All times are West Africa Time. The site opens and closes itself on these dates.
        </p>
      </div>

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

      <Field label="Description (shown on the public page)">
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
          <strong className="text-foreground">{(edition.excoWeight * 100).toFixed(0)}% Exco</strong>{' '}
          ({edition.weightingMethod.replace('_', ' ')}), as approved by the President General&apos;s
          briefing. It cannot be changed here — that needs written authorisation from SHESA and a
          change to the database.
        </span>
      </div>

      <div className="flex justify-end">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
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
