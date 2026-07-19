import { Globe, Home } from 'lucide-react';

import { isDiaspora } from '@/lib/country-currency';

/**
 * Renders "Home" (emerald) or "Diaspora" (sky) depending on whether
 * the country code matches the federation's home country per the
 * `country-currency` lookup.
 */
export function BranchesTerritoryText({ iso2 }: { readonly iso2: string }) {
  if (!iso2) return <span className="text-muted-foreground">—</span>;
  const away = isDiaspora(iso2);
  if (!away) {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
        <Home className="h-3.5 w-3.5" />
        Home
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sky-700 dark:text-sky-300">
      <Globe className="h-3.5 w-3.5" />
      Diaspora
    </span>
  );
}
