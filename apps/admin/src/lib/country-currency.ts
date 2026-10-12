/**
 * Country ISO-2 → default currency code (ISO 4217) map for the top ~30
 * countries the association actively touches. Used to pre-fill the
 * currency field on branch/chapter forms when the user picks a country
 * — the user can still override.
 *
 * When a country isn't in the map, the picker falls back to `XAF`
 * (Cameroon default) rather than leaving the currency blank, so the
 * form always submits with a well-formed value.
 */

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  // Cameroon / Central African CFA franc zone
  CM: 'XAF',
  CF: 'XAF',
  TD: 'XAF',
  CG: 'XAF',
  GQ: 'XAF',
  GA: 'XAF',
  // West African CFA franc zone
  BJ: 'XOF',
  BF: 'XOF',
  CI: 'XOF',
  GW: 'XOF',
  ML: 'XOF',
  NE: 'XOF',
  SN: 'XOF',
  TG: 'XOF',
  // Broader Africa
  NG: 'NGN',
  KE: 'KES',
  GH: 'GHS',
  ZA: 'ZAR',
  EG: 'EGP',
  ET: 'ETB',
  UG: 'UGX',
  RW: 'RWF',
  TZ: 'TZS',
  MA: 'MAD',
  DZ: 'DZD',
  TN: 'TND',
  // Diaspora footprints
  US: 'USD',
  CA: 'CAD',
  GB: 'GBP',
  FR: 'EUR',
  DE: 'EUR',
  BE: 'EUR',
  ES: 'EUR',
  IT: 'EUR',
  NL: 'EUR',
  CH: 'CHF',
  AU: 'AUD',
  AE: 'AED',
  SA: 'SAR',
  IN: 'INR',
  CN: 'CNY',
};

export const DEFAULT_CURRENCY = 'XAF';

export function defaultCurrencyForCountry(iso2: string | null | undefined): string {
  if (!iso2) return DEFAULT_CURRENCY;
  return COUNTRY_TO_CURRENCY[iso2.toUpperCase()] ?? DEFAULT_CURRENCY;
}

/** ISO-2 country code Shesa treats as "home" for the diaspora chip. */
export const HOME_COUNTRY_CODE = 'CM';

export function isDiaspora(countryCode: string | null | undefined): boolean {
  if (!countryCode) return false;
  return countryCode.toUpperCase() !== HOME_COUNTRY_CODE;
}
