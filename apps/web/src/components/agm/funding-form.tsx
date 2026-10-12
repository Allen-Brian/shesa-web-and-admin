'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { AGM_FUNDING_TIERS, tierForAmount, type PaymentOption } from './agm-content';
import { donateForAgmFunding } from './funding-action';
import { FundingTierCard } from './funding-tier-card';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  readonly initialError?: string;
}

/**
 * Donation form. The donor enters an amount; the matching tier card
 * highlights automatically (Bronze / Silver / Gold / Platinum) and
 * that tier is what the server routes the payment to. There is no
 * tier picker — the tier is a function of the amount.
 */
export function FundingForm({ initialError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [amountXaf, setAmountXaf] = useState<number>(0);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  // One method left, so nothing to choose: every submission pays now.
  const paymentOption: PaymentOption = 'pay-now';
  const [error, setError] = useState(initialError ?? '');

  const derivedTier = useMemo(() => (amountXaf > 0 ? tierForAmount(amountXaf) : null), [amountXaf]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (fullName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (phone.trim().length < 9) {
      setError('Please enter a phone number we can reach you on.');
      return;
    }
    if (!Number.isFinite(amountXaf) || amountXaf <= 0) {
      setError('Enter a positive amount.');
      return;
    }

    startTransition(async () => {
      const res = await donateForAgmFunding({
        fullName,
        email,
        phone,
        tier: derivedTier,
        amountXaf,
        paymentOption,
        note,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(res.redirectTo);
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {AGM_FUNDING_TIERS.map((t, i) => (
          <FundingTierCard key={t.key} tier={t} active={derivedTier === t.key} index={i} />
        ))}
      </div>

      <motion.form
        id="funding-form"
        onSubmit={submit}
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.9, ease }}
        className="grid grid-cols-1 gap-6 rounded-xs border border-black/10 bg-white p-6 md:grid-cols-2 md:p-10"
      >
        <div className="md:col-span-2">
          <p className="font-heading text-[12px] font-medium uppercase tracking-[0.28em] text-primary">
            Fund the AGM
          </p>
          <h3
            className="mt-4 font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', letterSpacing: '-0.02em' }}
          >
            {derivedTier
              ? `Your gift lands in ${derivedTier.charAt(0).toUpperCase() + derivedTier.slice(1)}.`
              : 'Enter any amount to give.'}
          </h3>
          <p className="mt-3 max-w-lg text-[14.5px] leading-[1.7] text-black/60">
            The tier is chosen from the amount you give. Bronze covers up to 50,000 XAF, and each
            step up captures the next range. Anything above 1,000,000 XAF counts as Platinum.
          </p>
        </div>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
            Full name
          </span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Ndifon Peter"
            maxLength={200}
            required
            className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
            Email (optional)
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            maxLength={200}
            className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
            Phone
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            placeholder="+237 6xx xxx xxx"
            maxLength={80}
            required
            className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
            Amount (XAF)
          </span>
          <input
            value={amountXaf === 0 ? '' : amountXaf}
            onChange={(e) => setAmountXaf(Number.parseInt(e.target.value, 10) || 0)}
            type="number"
            min="0"
            step="1000"
            placeholder="50000"
            className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
            Message (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={400}
            placeholder="A short note to accompany your donation."
            className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
          />
        </label>

        {error && (
          <p className="rounded-xs border border-primary/40 bg-primary/5 px-4 py-3 text-[13.5px] text-primary md:col-span-2">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
          <p className="text-[12.5px] text-black/50">
            You'll get a printable donation receipt with a QR code on the next page.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="group inline-flex items-center justify-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-black disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {pending ? 'Recording your gift…' : 'Give to the AGM'}
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </button>
        </div>
      </motion.form>
    </div>
  );
}
