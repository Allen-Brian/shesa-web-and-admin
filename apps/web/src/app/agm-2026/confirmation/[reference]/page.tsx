import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { createServiceRoleClient } from '@shesa/supabase/service-role';

export const dynamic = 'force-dynamic';

interface Params {
  readonly reference: string;
}

/** `AGM-` + 10 uppercase hex, as minted by `cms.submit_agm_registration`. */
const REFERENCE_RE = /^AGM-[0-9A-F]{10}$/;

interface Registration {
  readonly reference: string;
  readonly kind: 'ticket' | 'attire' | 'donation';
  readonly full_name: string;
  readonly phone: string;
  readonly quantity: number | null;
  readonly amount_xaf: string;
  readonly attire_size: string | null;
  readonly payment_method: string;
  readonly created_at: string;
}

const KIND_LABEL: Record<Registration['kind'], string> = {
  ticket: 'AGM 2026 ticket',
  attire: 'AGM 2026 attire',
  donation: 'AGM 2026 contribution',
};

const METHOD_LABEL: Record<string, string> = {
  'pay-now': 'Paid online',
  'mtn-momo': 'MTN Mobile Money',
  'orange-money': 'Orange Money',
  card: 'Card (Visa / MasterCard)',
  'bank-transfer': 'Bank transfer',
  'cash-on-site': 'Pay on arrival',
};

/**
 * Look up a submission by its reference.
 *
 * Uses the service-role client for the same reason the receipt page does:
 * the page is public, and `cms.agm_registrations` deliberately grants
 * `anon` nothing at all. The reference in the URL is the only key, and
 * the query is pinned to it.
 */
async function loadRegistration(reference: string): Promise<Registration | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .schema('cms')
    .from('agm_registrations')
    .select(
      'reference, kind, full_name, phone, quantity, amount_xaf, attire_size, payment_method, created_at',
    )
    .eq('reference', reference)
    .maybeSingle();
  return (data as Registration | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `AGM 2026 · Registration ${reference} · SHESA`,
    // Nothing here should ever surface in search results.
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmationPage({ params }: { readonly params: Promise<Params> }) {
  const { reference } = await params;
  if (!REFERENCE_RE.test(reference)) notFound();

  const registration = await loadRegistration(reference);
  if (!registration) notFound();

  const amount = Number.parseFloat(registration.amount_xaf);

  return (
    <main className="relative min-h-screen bg-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-5 py-20 md:px-8 md:py-28">
        <div>
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
            Registration received
          </p>
          <h1
            className="mt-4 font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}
          >
            Thank you, {registration.full_name.split(' ')[0]}.
          </h1>
          <p className="mt-4 max-w-lg text-[15px] leading-[1.75] text-black/60">
            We have your details for the {KIND_LABEL[registration.kind]}. Someone from the
            secretariat will contact you on <span className="text-black">{registration.phone}</span>{' '}
            to arrange payment and confirm your place.
          </p>
        </div>

        {/*
          This is an acknowledgement, not a receipt. No payment has been
          recorded and no verifiable receipt token exists — saying so
          plainly is the whole point, because a document that looks like
          proof of payment but isn't would undermine the real receipts
          issued at /verify.
        */}
        <div className="rounded-xs border border-primary/30 bg-primary/5 px-5 py-4">
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-primary">
            Not yet a receipt
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.7] text-black/70">
            No payment has been taken. You'll receive an official receipt with a verification code
            once your payment has been received and confirmed.
          </p>
        </div>

        <dl className="flex flex-col rounded-xs border border-black/10 bg-white">
          <Row label="Reference">
            <span className="font-heading tabular-nums tracking-wide text-black">
              {registration.reference}
            </span>
          </Row>
          <Row label="For">{KIND_LABEL[registration.kind]}</Row>
          {registration.quantity !== null && <Row label="Quantity">{registration.quantity}</Row>}
          {registration.attire_size && <Row label="Size">{registration.attire_size}</Row>}
          <Row label="Amount">
            <span className="font-heading text-black">{amount.toLocaleString()} XAF</span>
          </Row>
          <Row label="Payment option">
            {METHOD_LABEL[registration.payment_method] ?? registration.payment_method}
          </Row>
          <Row label="Submitted">
            {new Date(registration.created_at).toLocaleString('en-GB', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </Row>
        </dl>

        <p className="text-[13px] leading-[1.7] text-black/50">
          Keep your reference — quote it in any correspondence about this registration.
        </p>

        <Link
          href="/agm-2026"
          className="inline-flex w-fit items-center gap-3 rounded-xs bg-primary px-7 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-black"
        >
          Back to AGM 2026
        </Link>
      </div>
    </main>
  );
}

function Row({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-black/8 px-5 py-3.5 last:border-0">
      <dt className="font-heading text-[11px] font-medium uppercase tracking-[0.22em] text-black/45">
        {label}
      </dt>
      <dd className="text-right text-[14.5px] text-black/80">{children}</dd>
    </div>
  );
}
