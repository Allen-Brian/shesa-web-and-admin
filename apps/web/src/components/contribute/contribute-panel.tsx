'use client';

import { useState, useTransition } from 'react';
import { HeartHandshake, Loader2 } from 'lucide-react';

import type { PublicContribution } from '@/lib/contribution';

interface Props {
  readonly contribution: PublicContribution;
  /** What is being supported, for the heading and the gateway's description. */
  readonly subject: string;
  readonly action: (formData: FormData) => Promise<{ ok: boolean; message?: string }>;
}

/**
 * The contribute form that appears on anything with an open charge.
 *
 * It asks for identity, how much (or how many), and an optional note — and
 * deliberately does not ask which payment method. That question used to be
 * here *and* on the gateway's page, and only the gateway's answer was ever
 * true, so it is asked once, there.
 *
 * A `ticketed` charge is priced per unit and the visitor picks a quantity;
 * a `donation` charge has no price and the visitor names the amount.
 * Either way the figure actually charged is computed on the server — the
 * quantity is multiplied by `base_amount` inside the Edge Function. The
 * total shown here is a preview, not an instruction.
 */
export function ContributePanel({ contribution, subject, action }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);

  const isTicketed = contribution.shape === 'ticketed' && contribution.baseAmount != null;
  const unit = contribution.baseAmount ?? 0;
  const money = (n: number) =>
    `${new Intl.NumberFormat('fr-CM', { maximumFractionDigits: 0 }).format(n)} ${contribution.currency}`;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        <HeartHandshake className="h-4 w-4" />
        {isTicketed ? `Get a place — ${money(unit)}` : 'Contribute'}
      </button>
    );
  }

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const res = await action(formData);
          // Success redirects to the gateway, so reaching here means it did
          // not. Without this the visitor stares at a form that appears to
          // have done nothing.
          if (!res.ok) setError(res.message ?? 'Something went wrong. Please try again.');
        })
      }
      className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-5"
    >
      <div className="flex flex-col gap-0.5">
        <h3 className="text-base font-semibold text-foreground">Support {subject}</h3>
        <p className="text-xs text-muted-foreground">
          {isTicketed ? `${money(unit)} each` : 'Any amount is welcome'}
        </p>
      </div>

      <input type="hidden" name="chargeId" value={contribution.chargeId} />
      <input type="hidden" name="subject" value={subject} />

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Full name</span>
        <input
          name="fullName"
          required
          minLength={2}
          maxLength={200}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Phone</span>
        <input
          name="phone"
          required
          minLength={9}
          maxLength={80}
          inputMode="tel"
          placeholder="+237…"
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Email (optional)</span>
        <input
          name="email"
          type="email"
          maxLength={320}
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
        />
      </label>

      {isTicketed ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">How many</span>
          <input
            name="quantity"
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
          <span className="text-xs text-muted-foreground">Total {money(unit * quantity)}</span>
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Amount ({contribution.currency})</span>
          <input
            name="amountXaf"
            type="number"
            min={1}
            step={1}
            required
            inputMode="numeric"
            className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Note (optional)</span>
        <textarea
          name="note"
          rows={2}
          maxLength={500}
          placeholder="In memory of…, from the Douala chapter…"
          className="rounded-md border border-border bg-background px-3 py-2 text-foreground"
        />
      </label>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Continue to payment
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {/* Said here rather than left as a surprise at checkout: the payer
          sees a figure on this form and a slightly larger one on the
          gateway's page, and the difference should not need explaining. */}
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        You will choose how to pay — Mobile Money, card or bank — on the next screen, where a small
        transaction fee is added so the full amount reaches SHESA.
      </p>
    </form>
  );
}
