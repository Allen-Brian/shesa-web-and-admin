import { Country } from 'country-state-city';

export function BranchesCountryCell({ iso2 }: { readonly iso2: string }) {
  const country = iso2 ? Country.getCountryByCode(iso2) : null;
  if (!country) return <span className="text-muted-foreground">{iso2 || '—'}</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="text-base">{country.flag}</span>
      <span className="truncate">{country.name}</span>
    </span>
  );
}
