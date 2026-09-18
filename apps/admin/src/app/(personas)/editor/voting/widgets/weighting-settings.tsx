'use client';

import {
  Button,
  ConfirmDialog,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@shesa/ui';
import { AlertTriangle, Scale } from 'lucide-react';
import { useState, useTransition } from 'react';

import { updateWeighting, type VotingMode, type WeightingInput } from '../actions/voting-actions';
import type { EditionRow } from '../voting-types';
import { watDate } from '../wat';

/**
 * How this ceremony counts votes.
 *
 * Two modes, because not every ceremony has two colleges. A branch award or
 * a year with no sitting Exco is decided by the membership alone, and the
 * honest way to say that is a mode rather than an Exco weight set to zero —
 * a zero weight would leave the Exco link working and every ballot cast
 * through it counting for nothing while telling the voter otherwise.
 */
export function WeightingSettings({
  edition,
  ballotsCast,
}: {
  readonly edition: EditionRow;
  readonly ballotsCast: number;
}) {
  const [mode, setMode] = useState<VotingMode>(edition.votingMode);
  const [exStudent, setExStudent] = useState(String(Math.round(edition.exStudentWeight * 100)));
  const [exco, setExco] = useState(String(Math.round(edition.excoWeight * 100)));
  const [method, setMethod] = useState<WeightingInput['weightingMethod']>(
    edition.weightingMethod === 'college_share' ? 'college_share' : 'raw_weighted',
  );
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const exStudentNum = Number.parseFloat(exStudent) || 0;
  const excoNum = Number.parseFloat(exco) || 0;
  const total = exStudentNum + excoNum;
  const balanced = Math.abs(total - 100) <= 0.01;

  const apply = () =>
    startTransition(async () => {
      const res = await updateWeighting(edition.id, {
        mode,
        exStudentPercent: exStudentNum,
        excoPercent: excoNum,
        weightingMethod: method,
      });
      if (res.ok) toast.success('Weighting saved.');
      else toast.error(res.message);
    });

  const submit = () => {
    // Changing the weighting recomputes a tally that has already been
    // arrived at. Nobody should do that by accident.
    if (ballotsCast > 0) setConfirming(true);
    else apply();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          selected={mode === 'weighted'}
          onSelect={() => setMode('weighted')}
          title="Exco and public"
          body="Two colleges. Ex-student ballots and Executive Committee ballots are counted separately and combined by the weights below."
        />
        <ModeCard
          selected={mode === 'public_only'}
          onSelect={() => setMode('public_only')}
          title="Public only"
          body="One college. Every ballot counts the same, and the Exco link is refused rather than counted at zero."
        />
      </div>

      {mode === 'weighted' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ex-students (%)">
              <Input
                value={exStudent}
                onChange={(e) => setExStudent(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
              />
            </Field>
            <Field label="Executive Committee (%)">
              <Input
                value={exco}
                onChange={(e) => setExco(e.target.value.replace(/[^0-9.]/g, ''))}
                inputMode="decimal"
              />
            </Field>
          </div>

          <p
            className={`text-xs ${balanced ? 'text-muted-foreground' : 'font-medium text-destructive'}`}
          >
            Total: {total}% {balanced ? '' : '— the two weights must add up to 100%.'}
          </p>

          <Field label="How the weights are applied">
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw_weighted">Weight each ballot</SelectItem>
                <SelectItem value="college_share">Weight each college&apos;s share</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {/* The arithmetic consequence, stated before the vote rather than
              discovered when the result is read out. */}
          <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {method === 'raw_weighted' ? (
              <span>
                <strong className="text-foreground">Weight each ballot</strong> multiplies every
                individual vote by its college&apos;s weight. With roughly twenty Exco members
                against several hundred ex-students, this does{' '}
                <strong className="text-foreground">not</strong> give the Exco {Math.round(excoNum)}
                % of the outcome — it gives them {Math.round(excoNum)}% per ballot, which is a few
                percent of the total. This is what SHESA approved for AGM 2026.
              </span>
            ) : (
              <span>
                <strong className="text-foreground">Weight each college&apos;s share</strong> works
                out what proportion of its own college voted for each candidate, then combines those
                proportions. This does give the Exco {Math.round(excoNum)}% of the outcome
                regardless of how many of them vote.
              </span>
            )}
          </div>
        </>
      )}

      {mode === 'public_only' && (
        <p className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
          Every ballot counts equally. The Exco link stops working for this ceremony — a voter
          holding it is told so rather than being quietly counted as an ordinary ex-student.
        </p>
      )}

      {edition.weightsChangedAt && (
        <p className="text-xs text-muted-foreground">
          Last changed {watDate(edition.weightsChangedAt)}.
        </p>
      )}

      {ballotsCast > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>
            <strong className="text-foreground">
              {ballotsCast} ballot{ballotsCast === 1 ? ' has' : 's have'} already been cast.
            </strong>{' '}
            The tally is computed from these settings every time it is read, so changing them now
            changes a result people have already voted towards.
          </span>
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          onClick={submit}
          disabled={pending || (mode === 'weighted' && !balanced)}
        >
          {pending ? 'Saving…' : 'Save weighting'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Change the weighting mid-election?"
        description={`${ballotsCast} ballot(s) have been cast under the current weighting. Saving recomputes the result for every one of them. The change is stamped with your name and the time, so it can be explained afterwards — but it cannot be undone by re-saving the old numbers, because the old result was never stored.`}
        confirmLabel="Change the weighting"
        onConfirm={() => {
          setConfirming(false);
          apply();
        }}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}

function ModeCard({
  selected,
  onSelect,
  title,
  body,
}: {
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly title: string;
  readonly body: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
        selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span
          aria-hidden
          className={`grid h-4 w-4 place-items-center rounded-full border ${
            selected ? 'border-primary' : 'border-muted-foreground/40'
          }`}
        >
          {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        {title}
      </span>
      <span className="text-xs leading-relaxed text-muted-foreground">{body}</span>
    </button>
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
