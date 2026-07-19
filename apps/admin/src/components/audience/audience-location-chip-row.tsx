'use client';

import { RemovableChip } from './removable-chip';

interface AudienceLocationChipRowProps {
  readonly countries: readonly string[];
  readonly regions: readonly string[];
  readonly cities: readonly string[];
  readonly onRemoveCountry: (c: string) => void;
  readonly onRemoveRegion: (r: string) => void;
  readonly onRemoveCity: (c: string) => void;
}

/**
 * Renders the union of selected countries / regions / cities as
 * removable chips. Prefixes each key with a distinct char so React
 * doesn't confuse a country and a region that happen to share the same
 * string.
 */
export function AudienceLocationChipRow({
  countries,
  regions,
  cities,
  onRemoveCountry,
  onRemoveRegion,
  onRemoveCity,
}: AudienceLocationChipRowProps) {
  const total = countries.length + regions.length + cities.length;
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {countries.map((c) => (
        <RemovableChip key={`c-${c}`} label={c} onRemove={() => onRemoveCountry(c)} />
      ))}
      {regions.map((r) => (
        <RemovableChip key={`r-${r}`} label={r} onRemove={() => onRemoveRegion(r)} />
      ))}
      {cities.map((c) => (
        <RemovableChip key={`ci-${c}`} label={c} onRemove={() => onRemoveCity(c)} />
      ))}
    </div>
  );
}
