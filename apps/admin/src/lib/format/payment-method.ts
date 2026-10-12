/**
 * Display label for a `finance.payment_method` enum value.
 *
 * This existed in five places — the exco dashboard, the charge detail
 * sheet, the donations helpers, the reports formatters and the
 * transactions helpers. Four agreed exactly; the fifth rendered
 * `bank_transfer` as "Bank" rather than "Bank transfer", because it
 * feeds a compact dashboard card with no room for two words.
 *
 * That difference is real, so it survives as an option rather than
 * being flattened away — but there is now one function deciding it.
 */

const LABELS: Record<string, { full: string; short: string }> = {
  cash: { full: 'Cash', short: 'Cash' },
  mtn_momo: { full: 'MTN MoMo', short: 'MTN MoMo' },
  orange_money: { full: 'Orange Money', short: 'Orange' },
  bank_transfer: { full: 'Bank transfer', short: 'Bank' },
  card: { full: 'Card', short: 'Card' },
};

export interface FormatPaymentMethodOptions {
  /** Compact form, for KPI cards and narrow cells. */
  readonly short?: boolean;
}

/**
 * Unknown values fall through to the raw string rather than rendering
 * blank, so a new enum member shows up as `mobile_wallet` instead of
 * vanishing while the client catches up.
 */
export function formatPaymentMethod(
  method: string,
  options: FormatPaymentMethodOptions = {},
): string {
  const entry = LABELS[method];
  if (!entry) return method;
  return options.short ? entry.short : entry.full;
}
