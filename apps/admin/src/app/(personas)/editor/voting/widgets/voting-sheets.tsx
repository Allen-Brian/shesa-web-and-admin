'use client';

import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@shesa/ui';
import { Mail, MapPin, Phone, Quote, UserPlus } from 'lucide-react';

import type { NominationRow, NomineeRow } from '../voting-types';
import { watDate } from '../wat';

/**
 * Everything known about one person put forward for an award.
 *
 * The table can only show a count and a few spellings. This is where the
 * actual submissions live — every citation a member wrote, and who wrote it
 * — which is what somebody deciding whether to put this person on the ballot
 * needs to read.
 */
export function NomineeDetailSheet({
  nominee,
  nominations,
  onClose,
  onAddToBallot,
  pending,
}: {
  readonly nominee: NomineeRow | null;
  readonly nominations: readonly NominationRow[];
  readonly onClose: () => void;
  readonly onAddToBallot: (nominee: NomineeRow) => void;
  readonly pending?: boolean;
}) {
  const mine = nominee ? nominations.filter((n) => n.nomineeId === nominee.id) : [];

  const spellings = [...new Set(mine.map((n) => n.nomineeName.trim()))];
  const batches = [...new Set(mine.map((n) => n.nomineeBatchYear).filter(Boolean))];
  const branches = [...new Set(mine.map((n) => n.nomineeBranchLabel).filter(Boolean))];
  const contacts = [...new Set(mine.map((n) => n.nomineeContact).filter(Boolean))];

  return (
    <Sheet open={nominee !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {nominee && (
          <>
            <SheetHeader className="border-b border-border bg-muted/30 px-6 py-5 pr-14">
              <SheetTitle className="flex flex-col items-start gap-1 text-left">
                <span className="text-2xl font-semibold text-foreground">
                  {nominee.displayName}
                </span>
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  {nominee.nominationCount}{' '}
                  {nominee.nominationCount === 1 ? 'nomination' : 'nominations'}
                </span>
              </SheetTitle>

              <SheetDescription className="mt-2 text-left text-xs text-muted-foreground">
                {[batches.join(', '), branches.join(', ')].filter(Boolean).join(' · ') ||
                  'No batch or branch given'}
              </SheetDescription>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {nominee.candidateId ? (
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    On the ballot
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => onAddToBallot(nominee)}
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add to ballot
                  </Button>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Every spelling, not just the three the table had room for.
                  A name here that is plainly somebody else is how a wrong
                  merge gets caught. */}
              {spellings.length > 1 && (
                <Section title={`Spellings received (${spellings.length})`}>
                  <ul className="flex flex-col gap-1">
                    {spellings.map((s) => (
                      <li key={s} className="text-sm text-foreground">
                        {s}
                        {s.trim().toLowerCase() !== nominee.displayName.trim().toLowerCase() && (
                          <span className="ml-1.5 text-xs text-muted-foreground">(grouped)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {contacts.length > 0 && (
                <Section title="Contacts given for them">
                  <div className="flex flex-col gap-1">
                    {contacts.map((c) => (
                      <ContactLine key={c} icon={<Phone className="h-3.5 w-3.5" />} value={c!} />
                    ))}
                  </div>
                </Section>
              )}

              <Section title={`Nominations (${mine.length})`}>
                <div className="flex flex-col gap-4">
                  {mine.map((n) => (
                    <div key={n.id} className="rounded-md border bg-muted/20 p-3">
                      <p className="flex items-start gap-1.5 text-sm leading-relaxed text-foreground">
                        <Quote
                          className="mt-1 h-3 w-3 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="whitespace-pre-line">{n.citation}</span>
                      </p>

                      <div className="mt-2 flex flex-col gap-0.5 border-t border-border pt-2">
                        <span className="text-xs text-muted-foreground">
                          Submitted as <span className="text-foreground">{n.nomineeName}</span> ·{' '}
                          {watDate(n.createdAt, false)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          By{' '}
                          <span className="text-foreground">
                            {n.nominatorName ?? 'someone anonymous'}
                          </span>
                          {n.nominatorBatchYear ? ` (${n.nominatorBatchYear})` : ''}
                          {n.nominatorBranchLabel ? ` · ${n.nominatorBranchLabel}` : ''}
                        </span>
                        {n.nominatorContact && (
                          <ContactLine
                            icon={<Mail className="h-3.5 w-3.5" />}
                            value={n.nominatorContact}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** One submission, in full — the citation and who sent it. */
export function NominationDetailSheet({
  nomination,
  nomineeName,
  onClose,
}: {
  readonly nomination: NominationRow | null;
  readonly nomineeName: string | null;
  readonly onClose: () => void;
}) {
  return (
    <Sheet open={nomination !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        {nomination && (
          <>
            <SheetHeader className="border-b border-border bg-muted/30 px-6 py-5 pr-14">
              <SheetTitle className="flex flex-col items-start gap-1 text-left">
                <span className="text-2xl font-semibold text-foreground">
                  {nomination.nomineeName}
                </span>
                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Nominated {watDate(nomination.createdAt)}
                </span>
              </SheetTitle>

              <SheetDescription className="mt-2 text-left text-xs text-muted-foreground">
                {[nomination.nomineeBatchYear, nomination.nomineeBranchLabel]
                  .filter(Boolean)
                  .join(' · ') || 'No batch or branch given'}
              </SheetDescription>

              <div className="mt-3">
                {nomineeName ? (
                  <Badge variant="outline" className="border-border">
                    Counted under {nomineeName}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  >
                    Counted against nobody
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <Section title="Why they were put forward">
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {nomination.citation}
                </p>
              </Section>

              {nomination.nomineeContact && (
                <Section title="Contact given for them">
                  <ContactLine
                    icon={<Phone className="h-3.5 w-3.5" />}
                    value={nomination.nomineeContact}
                  />
                </Section>
              )}

              <Section title="Nominated by">
                {nomination.nominatorName ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">
                      {nomination.nominatorName}
                    </span>
                    {(nomination.nominatorBatchYear || nomination.nominatorBranchLabel) && (
                      <ContactLine
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        value={[nomination.nominatorBatchYear, nomination.nominatorBranchLabel]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    )}
                    {nomination.nominatorContact && (
                      <ContactLine
                        icon={<Mail className="h-3.5 w-3.5" />}
                        value={nomination.nominatorContact}
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Submitted anonymously. The form never required a name — a form that demands the
                    sender&apos;s particulars before it will take a nomination is one fewer people
                    finish.
                  </p>
                )}
              </Section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border py-3 first:pt-0 last:border-b-0">
      <p className="mb-1.5 text-[10.5px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function ContactLine({ icon, value }: { readonly icon: React.ReactNode; readonly value: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="shrink-0">{icon}</span>
      <span className="break-all">{value}</span>
    </span>
  );
}
