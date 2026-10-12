'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { BallotAward, BallotPaper, BranchOption } from '@/lib/awards';
import { visitorId } from '@/lib/content-metrics';

import { vote } from './vote-action';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const NO_BRANCH = 'Ex-student (no branch)';
const ME_KEY = 'shesa:awards:nominator';

type Stage = 'who' | 'ballot' | 'review' | 'done';

/**
 * The ballot.
 *
 * Three stages, because the briefing requires a confirmation step before
 * submission and because a nineteen-award ballot needs somewhere to look
 * back over what you chose. Who you are, then the choices, then a review you
 * have to pass through to submit.
 *
 * Abstention is deliberately allowed on any award. A voter who has never
 * heard of the Agriculture nominees should skip that award rather than guess,
 * and a ballot that demanded all nineteen would produce noise in the awards
 * people care least about.
 */
export function BallotFlow({
  paper,
  branches,
  excoToken,
}: {
  readonly paper: BallotPaper;
  readonly branches: readonly BranchOption[];
  readonly excoToken?: string;
}) {
  const reduce = useReducedMotion();
  const isExco = paper.college === 'exco';

  const [stage, setStage] = useState<Stage>('who');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const [batch, setBatch] = useState('');
  const [branch, setBranch] = useState('');
  const [post, setPost] = useState('');
  const [name, setName] = useState('');
  const [choices, setChoices] = useState<Record<string, string>>({});

  // Prefill from what the nomination form already remembered. Most Exco
  // members will have nominated first, and asking the same two questions
  // twice in a fortnight reads as a form that is not paying attention.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ME_KEY);
      if (!raw) return;
      const me = JSON.parse(raw) as { batch?: string; branch?: string; name?: string };
      if (me.batch) setBatch(me.batch);
      if (me.branch) setBranch(me.branch);
      if (me.name) setName(me.name);
    } catch {
      /* Private mode. The fields start empty. */
    }
  }, []);

  const awardById = useMemo(() => new Map(paper.awards.map((a) => [a.id, a])), [paper.awards]);

  const chosenCount = Object.keys(choices).length;

  const submit = useCallback(async () => {
    if (pending) return;
    setError('');
    setPending(true);

    const res = await vote({
      editionSlug: paper.edition?.slug ?? '',
      deviceId: visitorId(),
      choices: Object.entries(choices).map(([awardId, candidateId]) => ({ awardId, candidateId })),
      batchYear: batch ? Number.parseInt(batch, 10) : null,
      branchLabel: branch === NO_BRANCH ? null : branch || null,
      excoToken: excoToken ?? null,
      excoPost: isExco ? post : null,
      excoName: isExco ? name : null,
    });

    setPending(false);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setStage('done');
  }, [batch, branch, choices, excoToken, isExco, name, paper.edition?.slug, pending, post]);

  const startBallot = () => {
    setError('');
    if (isExco && (!post || name.trim().length < 2)) {
      setError('Please choose your post and enter your name.');
      return;
    }
    if (!isExco && !batch) {
      setError('Please give your batch year.');
      return;
    }
    setStage('ballot');
  };

  if (stage === 'done') return <Cast isExco={isExco} count={chosenCount} />;

  return (
    <div className="overflow-hidden rounded-xs border border-black/10 bg-white">
      {isExco && (
        <div className="flex items-center gap-2.5 border-b border-amber-500/30 bg-amber-50 px-6 py-3 text-[13px] text-amber-900 md:px-10">
          <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Executive Committee ballot. Your post and name are recorded alongside your vote so the
            secretariat can verify it — your choices themselves stay private.
          </span>
        </div>
      )}

      <div className="px-6 py-10 md:px-10 md:py-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -10 }}
            transition={{ duration: 0.35, ease }}
          >
            {stage === 'who' && (
              <WhoStage
                isExco={isExco}
                batch={batch}
                onBatch={setBatch}
                branch={branch}
                onBranch={setBranch}
                branches={branches}
                post={post}
                onPost={setPost}
                posts={paper.excoPosts}
                name={name}
                onName={setName}
              />
            )}

            {stage === 'ballot' && (
              <BallotStage
                awards={paper.awards}
                categories={paper.categories}
                choices={choices}
                onChoose={(awardId, candidateId) =>
                  setChoices((c) => {
                    const next = { ...c };
                    // Tapping the chosen candidate again clears the award —
                    // the only way back to abstaining once you have picked.
                    if (next[awardId] === candidateId) delete next[awardId];
                    else next[awardId] = candidateId;
                    return next;
                  })
                }
              />
            )}

            {stage === 'review' && (
              <ReviewStage
                choices={choices}
                awardById={awardById}
                total={paper.awards.length}
                onJump={() => setStage('ballot')}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-6 rounded-xs border border-primary/40 bg-primary/5 px-4 py-3 text-[13.5px] text-primary">
            {error}
          </p>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-4">
          {stage !== 'who' && (
            <button
              type="button"
              onClick={() => setStage(stage === 'review' ? 'ballot' : 'who')}
              className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-black/45 transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back
            </button>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (stage === 'who') startBallot();
              else if (stage === 'ballot') {
                if (chosenCount === 0) {
                  setError('Choose at least one candidate before continuing.');
                  return;
                }
                setError('');
                setStage('review');
              } else void submit();
            }}
            className="group ml-auto inline-flex items-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-black disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {pending
              ? 'Submitting…'
              : stage === 'who'
                ? 'Start voting'
                : stage === 'ballot'
                  ? `Review my ${chosenCount === 1 ? 'choice' : `${chosenCount} choices`}`
                  : 'Submit my ballot'}
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </button>
        </div>

        {stage === 'review' && (
          <p className="mt-4 text-right text-[12px] text-black/45">
            Once submitted, a ballot cannot be changed.
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Stage one: who is voting ──────────────────────────────────────── */

function WhoStage({
  isExco,
  batch,
  onBatch,
  branch,
  onBranch,
  branches,
  post,
  onPost,
  posts,
  name,
  onName,
}: {
  readonly isExco: boolean;
  readonly batch: string;
  readonly onBatch: (v: string) => void;
  readonly branch: string;
  readonly onBranch: (v: string) => void;
  readonly branches: readonly BranchOption[];
  readonly post: string;
  readonly onPost: (v: string) => void;
  readonly posts: readonly string[];
  readonly name: string;
  readonly onName: (v: string) => void;
}) {
  const line =
    'w-full border-0 border-b border-black/15 bg-transparent px-0 py-3 text-[16px] text-black placeholder:text-black/25 focus:border-primary focus:outline-none';

  return (
    <div>
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-primary">
        Before you vote
      </p>
      <h3
        className="mt-3 font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        {isExco ? 'Which post do you hold?' : 'Which batch are you?'}
      </h3>
      <p className="mt-3 max-w-xl text-[14.5px] leading-[1.7] text-black/55">
        {isExco
          ? 'Your post and name are recorded with your ballot so it can be verified. How you vote is not shown to anyone.'
          : 'Only so the secretariat can report turnout by batch and branch. Nothing here identifies you.'}
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {isExco && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/55">
                Your post
              </span>
              <select value={post} onChange={(e) => onPost(e.target.value)} className={line}>
                <option value="">Select…</option>
                {posts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/55">
                Your name
              </span>
              <input
                value={name}
                onChange={(e) => onName(e.target.value)}
                maxLength={200}
                placeholder="Your full name"
                className={line}
              />
            </label>
          </>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/55">
            Batch year{isExco ? ' (optional)' : ''}
          </span>
          <input
            value={batch}
            onChange={(e) => onBatch(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            placeholder="1998"
            className={`${line} tabular-nums`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/55">
            Branch or chapter
          </span>
          <select value={branch} onChange={(e) => onBranch(e.target.value)} className={line}>
            <option value="">Select…</option>
            <option value={NO_BRANCH}>{NO_BRANCH}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

/* ── Stage two: the choices ────────────────────────────────────────── */

function BallotStage({
  awards,
  categories,
  choices,
  onChoose,
}: {
  readonly awards: readonly BallotAward[];
  readonly categories: readonly { id: string; name: string }[];
  readonly choices: Record<string, string>;
  readonly onChoose: (awardId: string, candidateId: string) => void;
}) {
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div>
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-primary">
        Your ballot
      </p>
      <h3
        className="mt-3 font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        One choice per award.
      </h3>
      <p className="mt-3 max-w-xl text-[14.5px] leading-[1.7] text-black/55">
        Skip any award you would rather not vote on — an unanswered award is an abstention, not a
        spoiled ballot. Tap a chosen name again to clear it.
      </p>

      <div className="mt-10 flex flex-col gap-10">
        {awards.map((award) => (
          <fieldset key={award.id}>
            <legend className="w-full">
              <span className="block font-heading text-[16.5px] font-medium leading-snug text-black">
                {award.name}
              </span>
              {award.categoryId && (
                <span className="mt-0.5 block text-[11px] uppercase tracking-[0.2em] text-black/40">
                  {categoryName.get(award.categoryId)}
                </span>
              )}
            </legend>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {award.candidates.map((c) => {
                const on = choices[award.id] === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onChoose(award.id, c.id)}
                    aria-pressed={on}
                    className={`flex items-start gap-3 rounded-xs border p-4 text-left transition-colors ${
                      on
                        ? 'border-primary bg-primary/5'
                        : 'border-black/12 hover:border-black/30 hover:bg-black/2'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors ${
                        on ? 'border-primary bg-primary text-white' : 'border-black/25'
                      }`}
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    {/* The photograph is what a voter recognises first —
                        many of these names are known by face at branch
                        meetings and not in print. */}
                    {c.photoUrl && (
                      <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-xs bg-black/5">
                        <Image
                          src={c.photoUrl}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover object-top"
                        />
                      </span>
                    )}

                    <span className="min-w-0">
                      <span className="block font-heading text-[15px] font-light leading-snug text-black">
                        {c.fullName}
                      </span>
                      {(c.profession || c.batchYear || c.branchLabel) && (
                        <span className="mt-0.5 block text-[11.5px] text-black/45">
                          {[c.profession, c.batchYear, c.branchLabel].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      {c.accomplishments && (
                        <span className="mt-1.5 block whitespace-pre-line text-[12.5px] leading-relaxed text-black/55">
                          {c.accomplishments}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </div>
  );
}

/* ── Stage three: confirm ──────────────────────────────────────────── */

function ReviewStage({
  choices,
  awardById,
  total,
  onJump,
}: {
  readonly choices: Record<string, string>;
  readonly awardById: ReadonlyMap<string, BallotAward>;
  readonly total: number;
  readonly onJump: () => void;
}) {
  const entries = Object.entries(choices);

  return (
    <div>
      <p className="font-heading text-[11px] font-medium uppercase tracking-[0.26em] text-primary">
        Last look
      </p>
      <h3
        className="mt-3 font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.6rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        Check your ballot.
      </h3>
      <p className="mt-3 max-w-xl text-[14.5px] leading-[1.7] text-black/55">
        You chose {entries.length} of {total} awards.{' '}
        {entries.length < total && <>The rest are recorded as abstentions. </>}
        <button
          type="button"
          onClick={onJump}
          className="text-primary underline-offset-4 hover:underline"
        >
          Go back and change something
        </button>
        .
      </p>

      <ul className="mt-8 flex flex-col">
        {entries.map(([awardId, candidateId]) => {
          const award = awardById.get(awardId);
          const candidate = award?.candidates.find((c) => c.id === candidateId);
          return (
            <li
              key={awardId}
              className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-black/8 py-3.5"
            >
              <span className="text-[13px] uppercase tracking-[0.16em] text-black/45">
                {award?.name}
              </span>
              <span className="font-heading text-[16px] font-light text-black">
                {candidate?.fullName}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Cast({ isExco, count }: { readonly isExco: boolean; readonly count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="rounded-xs border border-black/10 bg-white px-6 py-16 text-center md:px-12 md:py-24"
    >
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-xs bg-primary text-white">
        <Check className="h-6 w-6" aria-hidden />
      </span>
      <h3
        className="mt-7 font-heading font-thin leading-[1.1] text-black"
        style={{ fontSize: 'clamp(1.7rem, 3.6vw, 2.6rem)', letterSpacing: '-0.02em' }}
      >
        Your ballot is in.
      </h3>
      <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-[1.75] text-black/55">
        {count} {count === 1 ? 'choice' : 'choices'} recorded
        {isExco ? ' as an Executive Committee ballot' : ''}. Results are sealed until they are
        presented at the Annual General Meeting.
      </p>
    </motion.div>
  );
}
