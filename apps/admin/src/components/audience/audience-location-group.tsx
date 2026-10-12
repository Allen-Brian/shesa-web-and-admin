'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import type { AudienceDefinition } from '@shesa/domain/audience';
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@shesa/ui';

import { AudienceLocationChipRow } from './audience-location-chip-row';
import type { AudienceOptions } from './audience-selector-types';
import { AudienceSubList } from './audience-sub-list';

interface AudienceLocationGroupProps {
  readonly location: AudienceDefinition['location'];
  readonly options: AudienceOptions;
  readonly onChange: (loc: AudienceDefinition['location']) => void;
}

function build(
  nextCountries: readonly string[],
  nextRegions: readonly string[],
  nextCities: readonly string[],
): AudienceDefinition['location'] {
  if (nextCountries.length + nextRegions.length + nextCities.length === 0) return { mode: 'all' };
  return {
    mode: 'specific',
    countries: nextCountries.length > 0 ? [...nextCountries] : undefined,
    regions: nextRegions.length > 0 ? [...nextRegions] : undefined,
    cities: nextCities.length > 0 ? [...nextCities] : undefined,
  };
}

function filterList<T>(list: readonly T[], q: string, keyGetter: (t: T) => string): readonly T[] {
  if (!q.trim()) return list;
  const needle = q.trim().toLowerCase();
  return list.filter((x) => keyGetter(x).toLowerCase().includes(needle));
}

/**
 * Location group — country / region / city triple with cascading filters.
 * When the admin picks a country, the region list narrows to the regions
 * that exist inside that country. When they also pick a region, the city
 * list narrows to cities inside that region. Empty selections fall back
 * to the flat lists on options.regions / options.cities.
 */
export function AudienceLocationGroup({ location, options, onChange }: AudienceLocationGroupProps) {
  const mode = location.mode;
  const countries = location.mode === 'specific' ? (location.countries ?? []) : [];
  const regions = location.mode === 'specific' ? (location.regions ?? []) : [];
  const cities = location.mode === 'specific' ? (location.cities ?? []) : [];
  const totalSelected = countries.length + regions.length + cities.length;

  const [countryQuery, setCountryQuery] = useState('');
  const [regionQuery, setRegionQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');

  const availableRegions = useMemo(() => {
    if (countries.length === 0) return options.regions;
    const set = new Set<string>();
    for (const t of options.locationTriples) {
      if (t.country && countries.includes(t.country) && t.region) set.add(t.region);
    }
    return Array.from(set).sort();
  }, [countries, options.locationTriples, options.regions]);

  const availableCities = useMemo(() => {
    if (countries.length === 0 && regions.length === 0) return options.cities;
    const set = new Set<string>();
    for (const t of options.locationTriples) {
      const countryOk = countries.length === 0 || (t.country && countries.includes(t.country));
      const regionOk = regions.length === 0 || (t.region && regions.includes(t.region));
      if (countryOk && regionOk && t.city) set.add(t.city);
    }
    return Array.from(set).sort();
  }, [countries, regions, options.locationTriples, options.cities]);

  // Sweep out selections that no longer exist under the narrowed set —
  // otherwise a stale selection lingers as a chip with no matching row.
  useEffect(() => {
    const staleRegions = regions.filter((r) => !availableRegions.includes(r));
    const staleCities = cities.filter((c) => !availableCities.includes(c));
    if (staleRegions.length === 0 && staleCities.length === 0) return;
    onChange(
      build(
        countries,
        regions.filter((r) => availableRegions.includes(r)),
        cities.filter((c) => availableCities.includes(c)),
      ),
    );
    // Reconciliation effect — depending on the derived sets is intentional.
  }, [availableRegions, availableCities]);

  return (
    <Collapsible defaultOpen={false} className="rounded-md border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Location</span>
          {mode === 'specific' && totalSelected > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {totalSelected}
            </Badge>
          )}
          {mode === 'all' && (
            <Badge variant="outline" className="text-xs font-normal">
              All
            </Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-t border-border px-3 py-3">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Members whose current residence matches. Country OR region OR city.
          </p>

          <RadioGroup
            value={mode}
            onValueChange={(v) => {
              if (v === 'all') onChange({ mode: 'all' });
              else onChange({ mode: 'specific', countries: [] });
            }}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id="Location-all" />
              <Label htmlFor="Location-all" className="text-sm font-normal">
                All
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="specific" id="Location-specific" />
              <Label htmlFor="Location-specific" className="text-sm font-normal">
                Specific
              </Label>
            </div>
          </RadioGroup>

          {mode === 'specific' && (
            <>
              <AudienceLocationChipRow
                countries={countries}
                regions={regions}
                cities={cities}
                onRemoveCountry={(c) =>
                  onChange(
                    build(
                      countries.filter((x) => x !== c),
                      regions,
                      cities,
                    ),
                  )
                }
                onRemoveRegion={(r) =>
                  onChange(
                    build(
                      countries,
                      regions.filter((x) => x !== r),
                      cities,
                    ),
                  )
                }
                onRemoveCity={(c) =>
                  onChange(
                    build(
                      countries,
                      regions,
                      cities.filter((x) => x !== c),
                    ),
                  )
                }
              />

              <AudienceSubList
                label="Countries"
                query={countryQuery}
                onQueryChange={setCountryQuery}
                options={filterList(
                  options.countries,
                  countryQuery,
                  (c) => `${c.name} ${c.code}`,
                ).map((c) => ({
                  id: c.code,
                  label: c.name === c.code ? c.code : `${c.name} (${c.code})`,
                }))}
                selected={countries}
                onToggle={(id) =>
                  onChange(
                    build(
                      countries.includes(id)
                        ? countries.filter((x) => x !== id)
                        : [...countries, id],
                      regions,
                      cities,
                    ),
                  )
                }
              />
              <AudienceSubList
                label="Regions"
                query={regionQuery}
                onQueryChange={setRegionQuery}
                options={filterList(availableRegions, regionQuery, (r) => r).map((r) => ({
                  id: r,
                  label: r,
                }))}
                selected={regions}
                emptyHint={
                  countries.length > 0
                    ? 'No regions on file for the selected countries.'
                    : undefined
                }
                onToggle={(id) =>
                  onChange(
                    build(
                      countries,
                      regions.includes(id) ? regions.filter((x) => x !== id) : [...regions, id],
                      cities,
                    ),
                  )
                }
              />
              <AudienceSubList
                label="Cities"
                query={cityQuery}
                onQueryChange={setCityQuery}
                options={filterList(availableCities, cityQuery, (c) => c).map((c) => ({
                  id: c,
                  label: c,
                }))}
                selected={cities}
                emptyHint={
                  countries.length > 0 || regions.length > 0
                    ? 'No cities on file for the current country/region filter.'
                    : undefined
                }
                onToggle={(id) =>
                  onChange(
                    build(
                      countries,
                      regions,
                      cities.includes(id) ? cities.filter((x) => x !== id) : [...cities, id],
                    ),
                  )
                }
              />
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
