'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, CornerDownLeft, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { Award, AwardCategory, BranchOption } from '@/lib/awards';
import { visitorId } from '@/lib/content-metrics';

import { nominate, suggestNames } from './nominate-action';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Where the nominator's own details are remembered between nominations. */
const ME_KEY = 'shesa:awards:nominator';

const NO_BRANCH = 'Ex-student (no branch)';

/**
 * The five screens, in order. Only the first three are required — the two
 * detail screens can be skipped, and the button on each says so, because a
 * form that looks optional is finished more often than one that looks long.
 */
type Step = 'award' | 'nominee' | 'citation' | 'nomineeDetails' | 'you';
const STEPS: readonly Step[] = ['award', 'nominee', 'citation', 'nomineeDetails', 'you'];

interface Me {
  name: string;
  batch: string;
  branch: string;
  contact: string;
}

const EMPTY_ME: Me = { name: '', batch: '', branch: '', contact: '' };

interface Props {
  readonly awards: readonly Award[];
  readonly categories: readonly AwardCategory[];
  readonly branches: readonly BranchOption[];
}

/**
 * Put a name forward, one question at a time.
 *
 * The shape is deliberate. Nominations are open for six days and most
 * people will meet this on a phone, once, probably from a WhatsApp link —
 * so the cost that matters is not how many fields there are but how much
 * thinking each screen asks for. One question fills the screen, Enter moves
 * on, and the only three answers that are required are the award, the name,
 * and why.
 *
 * Everything else is optional and marked as such. The secretariat reviews
 * every nomination by hand anyway, so a missing batch year costs a lookup,
 * while a mandatory one costs nominations.
 *
 * Finishing returns to the first screen rather than to a dead end: whoever
 * has opened this has more than one name in mind, and their own details are
 * remembered so the second nomination is three screens, not five.
 */
export function NominationFlow({ awards, categories, branches }: Props) {
  const reduce = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const [awardId, setAwardId] = useState('');
  const [query, setQuery] = useState('');
  const [nomineeName, setNomineeName] = useState('');
  const [citation, setCitation] = useState('');
  const [nomineeBatch, setNomineeBatch] = useState('');
  const [nomineeBranch, setNomineeBranch] = useState('');
  const [me, setMe] = useState<Me>(EMPTY_ME);

  const step = STEPS[index] ?? 'award';
  const award = useMemo(() => awards.find((a) => a.id === awardId) ?? null, [awards, awardId]);

  // The nominator's own details, remembered across nominations — and across
  // visits. Typing your name and batch again for a second nomination is the
  // point at which people stop at one.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ME_KEY);
      if (raw) setMe({ ...EMPTY_ME, ...(JSON.parse(raw) as Partial<Me>) });
    } catch {
      /* Private mode. The fields simply start empty. */
    }
  }, []);

  const rememberMe = useCallback((next: Me) => {
    setMe(next);
    try {
      window.localStorage.setItem(ME_KEY, JSON.stringify(next));
    } catch {
      /* Nothing to remember it with; the nomination still goes through. */
    }
  }, []);

  const categoryName = useCallback(
    (id: string | null) => categories.find((c) => c.id === id)?.name ?? null,
    [categories],
  );

  const back = () => {
    setError('');
    setIndex((i) => Math.max(0, i - 1));
  };

  const submit = useCallback(async () => {
    if (pending) return;
    setError('');
    setPending(true);

    const device = visitorId();
    const res = await nominate({
      awardId,
      nomineeName,
      citation,
      deviceId: device,
      nomineeBatchYear: nomineeBatch ? Number.parseInt(nomineeBatch, 10) : null,
      nomineeBranchLabel: nomineeBranch === NO_BRANCH ? null : nomineeBranch || null,
      nominatorName: me.name || null,
      nominatorBatchYear: me.batch ? Number.parseInt(me.batch, 10) : null,
      nominatorBranchLabel: me.branch === NO_BRANCH ? null : me.branch || null,
      nominatorContact: me.contact || null,
    });

    setPending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setDone(true);
  }, [awardId, citation, me, nomineeBatch, nomineeBranch, nomineeName, pending]);

  /** Validate the current screen, then advance — or submit from the last. */
  const next = useCallback(() => {
    setError('');
    if (step === 'award' && !awardId) {
      setError('Choose an award first.');
      return;
    }
    if (step === 'nominee' && nomineeName.trim().length < 2) {
      setError('Who are you nominating?');
      return;
    }
    if (step === 'citation' && citation.trim().length < 10) {
      setError('A sentence or two is enough — but the panel does need something to read.');
      return;
    }
    if (index === STEPS.length - 1) {
      void submit();
      return;
    }
    setIndex((i) => i + 1);
  }, [awardId, citation, index, nomineeName, step, submit]);

  /** Start the next nomination: keep who I am, clear who I nominated. */
  const again = () => {
    setDone(false);
    setAwardId('');
    setQuery('');
    setNomineeName('');
    setCitation('');
    setNomineeBatch('');
    setNomineeBranch('');
    setError('');
    setIndex(0);
  };

  if (done) {
    return <Thanks awardName={award?.name ?? ''} name={nomineeName} onAgain={again} />;
  }

  const progress = ((index + 1) / STEPS.length) * 100;

  return (
    <div className="relative overflow-hidden rounded-xs border border-black/10 bg-white">
      {/* Progress. Five screens is short, and showing that it is short is
          most of the reason someone starts the second one. */}
      <div className="h-1 w-full bg-black/8">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease }}
        />
      </div>

      <div className="px-6 py-10 md:px-12 md:py-14">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={index === 0}
            className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-black/45 transition-colors hover:text-primary disabled:pointer-events-none disabled:opacity-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back
          </button>
          <span className="font-heading text-[11px] uppercase tracking-[0.24em] text-black/40">
            {index + 1} of {STEPS.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -12 }}
            transition={{ duration: 0.35, ease }}
          >
            {step === 'award' && (
              <AwardStep
                awards={awards}
                categoryName={categoryName}
                query={query}
                onQuery={setQuery}
                selected={awardId}
                onSelect={(id) => {
                  setAwardId(id);
                  setError('');
                  // Picking is the answer — no second tap on "Next".
                  setIndex((i) => i + 1);
                }}
              />
            )}

            {step === 'nominee' && (
              <Question
                kicker={award?.name ?? 'Nomination'}
                title="Who are you nominating?"
                hint="Their full name, as you would read it out at the ceremony. If someone has already been put forward, pick their name from the list so the spellings match."
              >
                <NomineeNameInput value={nomineeName} onChange={setNomineeName} onEnter={next} />
              </Question>
            )}

            {step === 'citation' && (
              <Question
                kicker={award?.name ?? 'Nomination'}
                title="Why them?"
                hint="What have they done? A sentence or two is plenty — this is what the secretariat reads."
              >
                <textarea
                  value={citation}
                  onChange={(e) => setCitation(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter submits the screen; Shift+Enter starts a new
                    // line. The same bargain Tally makes, and the reason a
                    // long answer never needs the mouse.
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      next();
                    }
                  }}
                  rows={4}
                  maxLength={2000}
                  autoFocus
                  placeholder="Built the community clinic at Bamenda and has run it since 2011…"
                  className="w-full resize-none border-0 border-b border-black/15 bg-transparent px-0 py-3 font-heading text-[19px] font-light leading-[1.6] text-black placeholder:text-black/25 focus:border-primary focus:outline-none md:text-[22px]"
                />
                <p className="mt-2 text-right text-[11px] tabular-nums text-black/35">
                  {citation.trim().length}/2000
                </p>
              </Question>
            )}

            {step === 'nomineeDetails' && (
              <Question
                kicker="Optional"
                title={`A little more about ${firstName(nomineeName)}`}
                hint="Skip this if you are not sure — the secretariat will check the register."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Their batch year">
                    <YearInput value={nomineeBatch} onChange={setNomineeBatch} onEnter={next} />
                  </Field>
                  <Field label="Their branch or chapter">
                    <BranchSelect
                      branches={branches}
                      value={nomineeBranch}
                      onChange={setNomineeBranch}
                    />
                  </Field>
                </div>
              </Question>
            )}

            {step === 'you' && (
              <Question
                kicker="Optional"
                title="And you are?"
                hint="Only so the secretariat can come back to you if they need to. Nominations are not published."
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Your name">
                    <LineInput
                      value={me.name}
                      onChange={(v) => rememberMe({ ...me, name: v })}
                      onEnter={next}
                      placeholder="Your name"
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Your batch year">
                    <YearInput
                      value={me.batch}
                      onChange={(v) => rememberMe({ ...me, batch: v })}
                      onEnter={next}
                    />
                  </Field>
                  <Field label="Your branch or chapter">
                    <BranchSelect
                      branches={branches}
                      value={me.branch}
                      onChange={(v) => rememberMe({ ...me, branch: v })}
                    />
                  </Field>
                  <Field label="Phone or email">
                    <LineInput
                      value={me.contact}
                      onChange={(v) => rememberMe({ ...me, contact: v })}
                      onEnter={next}
                      placeholder="+237 6xx xxx xxx"
                      maxLength={200}
                    />
                  </Field>
                </div>
              </Question>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-6 rounded-xs border border-primary/40 bg-primary/5 px-4 py-3 text-[13.5px] text-primary">
            {error}
          </p>
        )}

        {/* The award screen answers itself on tap, so it needs no button. */}
        {step !== 'award' && (
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={next}
              disabled={pending}
              className="group inline-flex items-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-black disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {pending
                ? 'Sending…'
                : index === STEPS.length - 1
                  ? 'Submit nomination'
                  : isOptional(step)
                    ? 'Continue'
                    : 'Next'}
              <span
                aria-hidden
                className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </button>

            {/* A skip on the optional screens. Without it people answer them
                out of obligation, which is the slow path we are avoiding. */}
            {isOptional(step) && !pending && (
              <button
                type="button"
                onClick={() => {
                  if (index === STEPS.length - 1) void submit();
                  else setIndex((i) => i + 1);
                }}
                className="text-[13px] font-medium text-black/45 underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {index === STEPS.length - 1 ? 'Skip and submit' : 'Skip'}
              </button>
            )}

            <span className="ml-auto hidden items-center gap-1.5 text-[11.5px] text-black/35 sm:inline-flex">
              press <CornerDownLeft className="h-3.5 w-3.5" aria-hidden /> Enter
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function isOptional(step: Step): boolean {
  return step === 'nomineeDetails' || step === 'you';
}

/** "Ndifon Peter" → "Ndifon", for the heading. Falls back to "them". */
function firstName(full: string): string {
  const first = full.trim().split(/\s+/)[0];
  return first && first.length > 1 ? first : 'them';
}

/* ── Screen furniture ──────────────────────────────────────────────── */

function Question({
  kicker,
  title,
  hint,
  children,
}: {
  readonly kicker: string;
  readonly title: string;
  readonly hint: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-primary">
        {kicker}
      </p>
      <h3
        className="mt-3 font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        {title}
      </h3>
      <p className="mt-3 max-w-xl text-[14.5px] leading-[1.7] text-black/55">{hint}</p>
      <div className="mt-8">{children}</div>
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
    <label className="flex flex-col gap-1.5">
      <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/55">
        {label}
      </span>
      {children}
    </label>
  );
}

/* Underlined rather than boxed. A single question on an empty screen does
   not need a box drawn round it to be found, and the line reads as
   something to write on. */
const LINE =
  'w-full border-0 border-b border-black/15 bg-transparent px-0 py-3 text-black placeholder:text-black/25 focus:border-primary focus:outline-none';

/**
 * The nominee's name, with suggestions from what has already been put
 * forward this cycle.
 *
 * The point is spelling, not convenience. Every fresh variant of a name —
 * a reordering, a dropped middle name, `Gohn` for `John` — is one the
 * secretariat has to reconcile by hand afterwards, and one that silently
 * splits a person's count in two if they miss it. Offering the existing
 * spelling is the cheapest possible fix, applied before the problem exists.
 *
 * Suggestions are names only. Never how many times anyone has been
 * nominated: that would turn the round into a campaign, with people piling
 * onto whoever is visibly ahead.
 */
function NomineeNameInput({
  value,
  onChange,
  onEnter,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onEnter: () => void;
}) {
  const [suggestions, setSuggestions] = useState<readonly string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // What the last accepted suggestion was, so re-showing the list for a
  // name the visitor just picked does not make it look unaccepted.
  const acceptedRef = useRef('');

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2 || q === acceptedRef.current) {
      setSuggestions([]);
      return;
    }

    // Debounced, and every in-flight result is discarded if the field has
    // moved on — otherwise a slow response overwrites a newer one and the
    // list flickers back to an older query on a bad connection.
    let live = true;
    const t = setTimeout(async () => {
      const names = await suggestNames(q);
      if (!live) return;
      // Exact match already typed: nothing left to suggest.
      const filtered = names.filter((n) => n.toLowerCase() !== q.toLowerCase());
      setSuggestions(filtered);
      setActive(-1);
      setOpen(filtered.length > 0);
    }, 220);

    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [value]);

  const accept = (name: string) => {
    acceptedRef.current = name;
    onChange(name);
    setSuggestions([]);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnter();
            }
            return;
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => (i + 1) % suggestions.length);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === 'Escape') {
            setOpen(false);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            // Enter takes the highlighted suggestion if the visitor moved
            // to one, and otherwise takes them at their word and advances.
            const picked = active >= 0 ? suggestions[active] : undefined;
            if (picked) accept(picked);
            else onEnter();
          }
        }}
        // A short delay, or the blur fires before the click on a suggestion
        // registers and the list closes out from under the tap.
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(suggestions.length > 0)}
        placeholder="Ndifon Peter"
        maxLength={200}
        autoFocus
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={`${LINE} font-heading text-[24px] font-light md:text-[30px]`}
      />

      {open && suggestions.length > 0 && (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xs border border-black/12 bg-white shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)]">
          <p className="border-b border-black/8 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-black/40">
            Already put forward
          </p>
          <ul>
            {suggestions.map((name, i) => (
              <li key={name}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => accept(name)}
                  onMouseEnter={() => setActive(i)}
                  className={`block w-full px-4 py-3 text-left font-heading text-[16px] font-light transition-colors ${
                    i === active ? 'bg-primary/8 text-primary' : 'text-black hover:bg-black/3'
                  }`}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-black/8 px-4 py-2 text-[11.5px] leading-relaxed text-black/45">
            Someone else has nominated this person. Picking their name keeps the spellings together
            — or keep typing if you mean someone different.
          </p>
        </div>
      )}
    </div>
  );
}

function LineInput({
  value,
  onChange,
  onEnter,
  placeholder,
  maxLength,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onEnter: () => void;
  readonly placeholder: string;
  readonly maxLength: number;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        }
      }}
      placeholder={placeholder}
      maxLength={maxLength}
      className={`${LINE} text-[16px]`}
    />
  );
}

/**
 * Batch year. `inputMode="numeric"` so a phone opens the number pad — four
 * digits behind a full keyboard is a needless tap.
 */
function YearInput({
  value,
  onChange,
  onEnter,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly onEnter: () => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 4))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onEnter();
        }
      }}
      inputMode="numeric"
      placeholder="1998"
      className={`${LINE} text-[16px] tabular-nums`}
    />
  );
}

/**
 * Branch or chapter, with a free-text fallback.
 *
 * The register holds five Cameroonian branches and, today, no chapters, so
 * a plain select would leave most of the diaspora with nothing to pick.
 * "Somewhere else" turns the control into a text box; the value is stored
 * as a label either way, because the secretariat resolves it by hand.
 */
function BranchSelect({
  branches,
  value,
  onChange,
}: {
  readonly branches: readonly BranchOption[];
  readonly value: string;
  readonly onChange: (v: string) => void;
}) {
  const known = useMemo(() => new Set(branches.map((b) => b.name)), [branches]);
  const [free, setFree] = useState(() => value !== '' && value !== NO_BRANCH && !known.has(value));

  const chapters = branches.filter((b) => b.kind === 'chapter');
  const locals = branches.filter((b) => b.kind !== 'chapter');

  if (free) {
    return (
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Branch or chapter"
        maxLength={160}
        autoFocus
        className={`${LINE} text-[16px]`}
      />
    );
  }

  return (
    <select
      value={known.has(value) || value === NO_BRANCH ? value : ''}
      onChange={(e) => {
        if (e.target.value === '__other') {
          onChange('');
          setFree(true);
          return;
        }
        onChange(e.target.value);
      }}
      className={`${LINE} text-[16px]`}
    >
      <option value="">Select…</option>
      <option value={NO_BRANCH}>{NO_BRANCH}</option>
      {locals.length > 0 && (
        <optgroup label="Branches">
          {locals.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </optgroup>
      )}
      {chapters.length > 0 && (
        <optgroup label="Country chapters">
          {chapters.map((b) => (
            <option key={b.id} value={b.name}>
              {b.name}
            </option>
          ))}
        </optgroup>
      )}
      <option value="__other">Somewhere else…</option>
    </select>
  );
}

/**
 * The award list. Nineteen awards is too many to scan on a phone, so the
 * search box filters on the award name and on its category — typing "ict",
 * "health" or "branch" narrows it to one or two rows.
 */
function AwardStep({
  awards,
  categoryName,
  query,
  onQuery,
  selected,
  onSelect,
}: {
  readonly awards: readonly Award[];
  readonly categoryName: (id: string | null) => string | null;
  readonly query: string;
  readonly onQuery: (v: string) => void;
  readonly selected: string;
  readonly onSelect: (id: string) => void;
}) {
  const q = query.trim().toLowerCase();
  const shown = q
    ? awards.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (categoryName(a.categoryId) ?? '').toLowerCase().includes(q),
      )
    : awards;

  return (
    <div>
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-primary">
        Step one
      </p>
      <h3
        className="mt-3 font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        Which award?
      </h3>
      <p className="mt-3 max-w-xl text-[14.5px] leading-[1.7] text-black/55">
        Pick one. You can come back and nominate for the others afterwards.
      </p>

      <div className="mt-7 flex items-center gap-3 border-b border-black/15 focus-within:border-primary">
        <Search className="h-4 w-4 shrink-0 text-black/35" aria-hidden />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter on a search that has narrowed to one row picks it.
            if (e.key === 'Enter' && shown.length === 1 && shown[0]) {
              e.preventDefault();
              onSelect(shown[0].id);
            }
          }}
          placeholder="Search the awards…"
          className="w-full border-0 bg-transparent py-3 text-[16px] text-black placeholder:text-black/25 focus:outline-none"
        />
      </div>

      {/* `data-lenis-prevent` so the list scrolls under a thumb: Lenis
          otherwise swallows the touchmove and the page moves instead. */}
      <div className="mt-5 max-h-[45vh] overflow-y-auto pr-1" data-lenis-prevent>
        {shown.length === 0 ? (
          <p className="py-8 text-[14px] text-black/45">No award matches “{query}”.</p>
        ) : (
          <ul className="flex flex-col">
            {shown.map((a) => {
              const cat = categoryName(a.categoryId);
              const isOn = a.id === selected;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(a.id)}
                    className={`group flex w-full items-center gap-4 border-b border-black/8 px-1 py-4 text-left transition-colors ${
                      isOn ? 'bg-primary/5' : 'hover:bg-black/3'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading text-[15.5px] font-light leading-snug text-black">
                        {a.name}
                      </span>
                      {cat && (
                        <span className="mt-0.5 block text-[11.5px] uppercase tracking-[0.18em] text-black/40">
                          {cat}
                        </span>
                      )}
                    </span>
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-xs border transition-colors ${
                        isOn
                          ? 'border-primary bg-primary text-white'
                          : 'border-black/12 text-black/30 group-hover:border-primary group-hover:text-primary'
                      }`}
                    >
                      {isOn ? <Check className="h-3.5 w-3.5" /> : '→'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Thanks({
  awardName,
  name,
  onAgain,
}: {
  readonly awardName: string;
  readonly name: string;
  readonly onAgain: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="rounded-xs border border-black/10 bg-white px-6 py-14 text-center md:px-12 md:py-20"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-xs bg-primary text-white">
        <Check className="h-6 w-6" aria-hidden />
      </span>

      <h3
        className="mt-7 font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        {name.trim()} is nominated.
      </h3>
      <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-[1.75] text-black/55">
        Your nomination for the {awardName} has been recorded. The secretariat reviews every
        submission, and the shortlist goes to the vote on 25 September.
      </p>

      <button
        type="button"
        onClick={onAgain}
        className="group mt-9 inline-flex items-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-black"
      >
        Nominate someone else
        <span
          aria-hidden
          className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1"
        >
          →
        </span>
      </button>
    </motion.div>
  );
}
