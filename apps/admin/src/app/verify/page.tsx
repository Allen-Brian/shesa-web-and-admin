import { CheckCircle2, XCircle } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa — Receipt verification' };

interface VerifyResult {
  readonly valid: boolean;
  readonly receipt_number: string | null;
  readonly amount: string | null;
  readonly currency: string | null;
  readonly paid_at: string | null;
  readonly charge_name: string | null;
  readonly reversed: boolean;
}

interface PageProps {
  readonly searchParams: Promise<{ token?: string }>;
}

/**
 * Public receipt verification page.
 *
 * Callable by anyone with a receipt token — no auth required. Uses the
 * SECURITY DEFINER `finance.verify_receipt(token)` RPC (M5) which
 * returns the minimal-disclosure payload (receipt_number, amount,
 * currency, paid_at, charge_name, reversed, valid) and NOTHING ELSE.
 * A tampered paper receipt fails because the QR points back to the
 * real record; scanning leaks nothing beyond that one payment.
 */
export default async function VerifyPage({ searchParams }: PageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Shell>
        <StateCard
          state="invalid"
          title="Missing token"
          message="This link doesn't carry a receipt token. Ask for the receipt again."
        />
      </Shell>
    );
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('finance')
    .rpc('verify_receipt', { p_token: token } as never);

  if (error) {
    return (
      <Shell>
        <StateCard
          state="invalid"
          title="Could not verify"
          message="Verification service is unavailable. Try again in a moment."
        />
      </Shell>
    );
  }

  const result = (Array.isArray(data) ? (data[0] as VerifyResult | undefined) : null) ?? null;

  if (!result || !result.valid) {
    return (
      <Shell>
        <StateCard
          state="invalid"
          title="Invalid receipt"
          message="This token doesn't match a valid receipt. If you received a paper receipt with this URL, it may have been tampered with."
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <StateCard
        state={result.reversed ? 'reversed' : 'valid'}
        title={result.reversed ? 'Payment reversed' : 'Valid receipt'}
        message={
          result.reversed
            ? 'This payment was recorded then reversed later — it does not represent settled money.'
            : 'This receipt matches an authoritative payment record.'
        }
      />
      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-6">
        <ReceiptField label="Receipt #">
          <span className="text-sm text-foreground">{result.receipt_number}</span>
        </ReceiptField>
        <ReceiptField label="Amount">
          <span className="text-lg font-semibold text-foreground">
            {result.amount ? new Intl.NumberFormat().format(parseFloat(result.amount)) : '—'}{' '}
            {result.currency ?? ''}
          </span>
        </ReceiptField>
        <ReceiptField label="For">
          <span className="text-sm text-foreground">{result.charge_name ?? '—'}</span>
        </ReceiptField>
        <ReceiptField label="Paid on">
          <span className="text-sm text-foreground">
            {result.paid_at ? new Date(result.paid_at).toLocaleString() : '—'}
          </span>
        </ReceiptField>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Verification is minimal-disclosure. The verifier sees only this payment — no other history
        is exposed.
      </p>
    </Shell>
  );
}

function Shell({ children }: { readonly children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center p-6">
      <div className="mb-6 text-center">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Shesa
        </div>
        <div className="text-2xl font-semibold text-foreground">Receipt verification</div>
      </div>
      {children}
    </main>
  );
}

function StateCard({
  state,
  title,
  message,
}: {
  readonly state: 'valid' | 'reversed' | 'invalid';
  readonly title: string;
  readonly message: string;
}) {
  const styles: Record<string, string> = {
    valid: 'border-emerald-500/40 bg-emerald-500/10',
    reversed: 'border-amber-500/40 bg-amber-500/10',
    invalid: 'border-destructive/40 bg-destructive/10',
  };
  const Icon = state === 'invalid' ? XCircle : CheckCircle2;
  const iconClass =
    state === 'valid'
      ? 'text-emerald-700 dark:text-emerald-400'
      : state === 'reversed'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-destructive';
  return (
    <div className={`rounded-xl border ${styles[state]} p-6 text-center`}>
      <Icon className={`mx-auto mb-2 h-10 w-10 ${iconClass}`} />
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ReceiptField({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border last:border-0 pb-2 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  );
}
