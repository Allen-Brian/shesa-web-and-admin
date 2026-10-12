'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { AGM_TICKET_UNIT_PRICE_XAF, type PaymentOption } from './agm-content';
import { registerForAgm } from './register-action';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  readonly initialError?: string;
}

/**
 * AGM 2026 ticket form. The event uses a single flat unit price
 * (`AGM_TICKET_UNIT_PRICE_XAF`); the visitor picks a quantity, and the
 * total renders alongside the button.
 *
 * No payment is taken here — there is no provider connected until
 * Tranzak lands. Submission records the registration and forwards to a
 * confirmation page; the secretariat settles payment out-of-band.
 */
export function RegistrationForm({ initialError }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [batch, setBatch] = useState('');
  const [quantity, setQuantity] = useState(1);
  // One method left, so nothing to choose: every submission pays now.
  const paymentOption: PaymentOption = 'pay-now';
  const [error, setError] = useState(initialError ?? '');

  const total = AGM_TICKET_UNIT_PRICE_XAF * Math.max(1, quantity);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (phone.trim().length < 9) {
      setError('Please enter a phone number we can reach you on.');
      return;
    }
    if (batch.trim().length < 2) {
      setError('Please tell us your batch.');
      return;
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    startTransition(async () => {
      const res = await registerForAgm({
        fullName,
        email,
        phone,
        batch,
        quantity,
        paymentOption,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      router.push(res.redirectTo);
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
      className="grid scroll-mt-28 grid-cols-1 gap-6 rounded-xs border border-black/10 bg-white p-6 md:grid-cols-2 md:p-10"
    >
      <div className="md:col-span-2">
        <p className="font-heading text-[12px] font-medium uppercase tracking-[0.28em] text-primary">
          SHES (SACRED HEART EX-STUDENT) REGISTRATION
        </p>
        <h3
          className="mt-4 font-heading font-thin leading-[1.1] text-black"
          style={{ fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)', letterSpacing: '-0.02em' }}
        >
          Fill it in. Get your ticket.
        </h3>
        <p className="mt-3 max-w-lg text-[14.5px] leading-[1.7] text-black/60">
          Tickets are a flat {AGM_TICKET_UNIT_PRICE_XAF.toLocaleString()} XAF per head. Register
          here and the secretariat will be in touch on your phone number to arrange payment.
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
          Batch
        </span>
        <input
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="e.g. 1998"
          maxLength={60}
          required
          className="rounded-xs border border-black/12 bg-white px-4 py-3 text-[15px] text-black focus:border-primary focus:outline-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/60">
          Tickets
        </span>
        <input
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value, 10) || 1))}
          type="number"
          min="1"
          step="1"
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
          Total due: <span className="font-heading text-black">{total.toLocaleString()} XAF</span>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="group inline-flex items-center justify-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-black disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {pending ? 'Registering…' : 'Register my place'}
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
