'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { castCupVote, getCupTally, type CupTally } from '@/lib/cup-poll';
import { visitorId } from '@/lib/content-metrics';

import { CUP } from './cup-content';

/**
 * The closing poll: who lifts it?
 *
 * ─── Live now ─────────────────────────────────────────────────────────
 * The tally is real and comes from `cms.cup_votes`. It used to be sample
 * figures in localStorage with a line on screen admitting as much.
 *
 * One vote per device, where the device is the same random id the likes
 * counter and the awards ballot use (`shesa:visitor-id`). A private
 * window is a second vote, and that is accepted — this is an advert, not
 * an election. The database enforces the rule; this hook only reports it.
 *
 * ─── What this does not do ────────────────────────────────────────────
 * It does not poll for other people's votes. The tally is fetched once
 * when the slide mounts and again after this device votes. A trailer that
 * re-fetched on a timer would be spending a request every few seconds for
 * a number nobody is watching change, and the slide it lives on is the
 * one the viewer rests on indefinitely.
 */

/** Remembers the choice so a return visit shows it without a round trip. */
const STORAGE_KEY = 'shesa:cup-poll-vote';

export interface CupPoll {
  /** Zone name → votes. Every zone present, zero-filled. */
  readonly counts: Readonly<Record<string, number>>;
  readonly total: number;
  /** The zone this device picked, or null. */
  readonly myVote: string | null;
  readonly vote: (team: string) => void;
  /** False until the first tally has landed, to avoid animating from a guess. */
  readonly ready: boolean;
  /** True while a vote is in flight, so the bars do not fight the tap. */
  readonly pending: boolean;
  /** Set when a vote could not be recorded. Shown quietly on the slide. */
  readonly error: string | null;
}

const EMPTY: CupTally = { counts: {}, total: 0 };

const MESSAGES: Record<string, string> = {
  rate_limited: 'Too many votes from this connection today.',
  bad_device: 'This browser is blocking the storage the vote needs.',
  unknown_team: 'That side is no longer on the ballot.',
  failed: 'Could not reach the scoreboard. Try again.',
};

export function useCupPoll(): CupPoll {
  const [tally, setTally] = useState<CupTally>(EMPTY);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards every `setState` after an await: the trailer can move off this
  // slide, or be replayed, while a request is still in the air.
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Read the remembered choice after mount, never during render: the
  // server has no localStorage, and seeding state from it would hand the
  // client a different first paint than the server produced.
  useEffect(() => {
    try {
      setMyVote(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      // Private browsing. Voting still works; it just is not remembered.
    }

    void getCupTally().then((fresh) => {
      if (!aliveRef.current) return;
      setTally(fresh);
      setReady(true);
    });
  }, []);

  const vote = useCallback(
    (team: string) => {
      if (pending) return;
      setPending(true);
      setError(null);

      // Shown immediately. The bars should move on the tap, not a round
      // trip later, and the server's answer replaces this a moment after.
      const previous = myVote;
      setMyVote(team);

      void castCupVote(team, visitorId()).then((res) => {
        if (!aliveRef.current) return;
        setPending(false);
        setTally(res.tally);

        if (!res.ok) {
          // Put the selection back where it was rather than leaving the
          // viewer believing a vote was counted.
          setMyVote(previous);
          setError(MESSAGES[res.reason] ?? MESSAGES.failed!);
          return;
        }

        setReady(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, team);
        } catch {
          // Not being able to remember it is no reason to refuse it.
        }
      });
    },
    [myVote, pending],
  );

  // Zero-fill in the hook as well as the database, so the first render —
  // before the tally lands — still has a key for every zone.
  const counts = useMemo(() => {
    const base: Record<string, number> = {};
    for (const zone of CUP.zones) base[zone.name] = tally.counts[zone.name] ?? 0;
    return base;
  }, [tally]);

  return { counts, total: tally.total, myVote, vote, ready, pending, error };
}
