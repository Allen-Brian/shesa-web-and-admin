'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { PAYMENT_OPTIONS, type PaymentOption } from './data';
import { registerForAgm } from './register-action';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  readonly amountXaf: number;
  readonly onAmountChange: (n: number) => void;
  readonly initialError?: string;
}

/**
 * Client-side wrapper around `registerForAgm`. We drive it from React
 * state rather than a plain <form action> because we want to keep the
 * tier picker in the same page — clicking a tier card just updates
 * `amountXaf` here without touching the DB.
 *
 * No money is moved: the "Pay" button just records the registration
 * and forwards the user to their receipt. Finance flips `status` to
 * `paid` later when they reconcile the actual payment.
 */
export function RegistrationForm({ amountXaf, onAmountChange, initialError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('mtn-momo');
  const [error, setError] = useState(initialError ?? '');

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!Number.isFinite(amountXaf) || amountXaf < 0) {
      setError('Amount must be a positive number.');
      return;
    }

    startTransition(async () => {
      const res = await registerForAgm({
        fullName,
        email,
        phone,
        amountXaf,
        paymentOption,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(`/agm-2026/receipt/${res.code}`);
    });
  };

  return (
    <motion.form
      id="register"
      onSubmit={submit}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.9, ease }}
      className="grid grid-cols-1 gap-6 rounded-xs border border-black/10 bg-white p-6 md:grid-cols-2 md:p-10"
    >
      <div className="md:col-span-2">
        <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
          Register
        </p>
        <h3
          className="mt-4 font-heading font-thin leading-[1.1] text-black"
          style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', letterSpacing: '-0.02em' }}
        >
          Fill it in. Get your ticket.
        </h3>
        <p className="mt-3 max-w-lg text-[14.5px] leading-[1.7] text-black/60">
          You'll get a printable receipt with a QR code on the next page. Money isn't collected here
          — pay by your preferred method and the AGM team will reconcile before check-in.
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
          Phone (optional)
        </span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+237 6xx xxx xxx"
          maxLength={80}
          className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
          Amount (XAF)
        </span>
        <input
          value={amountXaf === 0 ? '' : amountXaf}
          onChange={(e) => onAmountChange(Number.parseInt(e.target.value, 10) || 0)}
          type="number"
          min="0"
          step="1000"
          placeholder="25000"
          className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
          Payment option
        </span>
        <select
          value={paymentOption}
          onChange={(e) => setPaymentOption(e.target.value as PaymentOption)}
          className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
        >
          {PAYMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {error && (
        <p className="rounded-xs border border-primary/40 bg-primary/5 px-4 py-3 text-[13.5px] text-primary md:col-span-2">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3 md:col-span-2 md:flex-row md:items-center md:justify-between">
        <p className="text-[12.5px] text-black/50">
          By registering you agree to be listed on the AGM 2026 attendee roster used by the check-in
          desk.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex items-center justify-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-black disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? 'Issuing your ticket…' : 'Pay & issue my ticket'}
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1"
          >
            →
          </span>
        </button>
      </div>
    </motion.form>
  );
}
