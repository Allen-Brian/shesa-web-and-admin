'use client';

/**
 * AudienceSelector — the shared five-group audience picker.
 *
 * Layout:
 *   - Live "Reaches ~N members" preview at the top (debounced 300ms;
 *     ignores stale responses).
 *   - Filter-template bar: save the current definition to localStorage,
 *     recall / delete previously-saved ones.
 *   - One Collapsible per group (Membership · Location · Houses ·
 *     Networks · Batches). Inside each: All / Specific radio, plus
 *     — when Specific — selected-value chips, a search input, and a
 *     scrollable filtered checkbox list.
 *   - A hidden JSON input carries the whole AudienceDefinition through
 *     the enclosing form. The Server Action parses + Zod-validates.
 *
 * Consumed by Announcements today; Events will consume the same
 * component in Phase 2.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Save, Trash2, X } from 'lucide-react';

import {
  AUDIENCE_ALL,
  AUDIENCE_ALL_LABEL,
  type AudienceDefinition,
  isAudienceAll,
} from '@shesa/domain/audience';
import {
  Badge,
  Button,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@shesa/ui';

import { getAudienceCount } from './actions';

export interface AudienceOption {
  readonly id: string;
  readonly label: string;
}

export interface AudienceOptions {
  readonly membershipScopes: readonly AudienceOption[];
  readonly countries: readonly { code: string; name: string }[];
  /**
   * Raw location triples from members' current_country/region/city.
   * Used for cascading filters — selecting a country narrows the
   * available regions to that country's regions only; selecting a
   * region narrows the cities. `regions` / `cities` on this options
   * object are the flat fallback for when no country is selected.
   */
  readonly locationTriples: readonly {
    readonly country: string | null;
    readonly region: string | null;
    readonly city: string | null;
  }[];
  readonly regions: readonly string[];
  readonly cities: readonly string[];
  readonly houses: readonly AudienceOption[];
  readonly networks: readonly AudienceOption[];
  readonly batches: readonly AudienceOption[];
}

export interface AudienceSelectorProps {
  readonly ownerScopeId: string;
  readonly options: AudienceOptions;
  readonly initialAudience?: AudienceDefinition;
  readonly hiddenInputName?: string;
}

const DEFAULT_HIDDEN_INPUT_NAME = 'audienceDefinitionJson';

interface FilterTemplate {
  readonly id: string;
  readonly name: string;
  readonly definition: AudienceDefinition;
}

const TEMPLATE_STORAGE_KEY = 'shesa:audience-filter-templates';

function loadTemplates(): FilterTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FilterTemplate[]) : [];
  } catch {
    return [];
  }
}

function saveTemplates(next: readonly FilterTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage quota / disabled — silently ignore */
  }
}

export function AudienceSelector({
  ownerScopeId,
  options,
  initialAudience = AUDIENCE_ALL,
  hiddenInputName = DEFAULT_HIDDEN_INPUT_NAME,
}: AudienceSelectorProps) {
  const [audience, setAudience] = useState<AudienceDefinition>(initialAudience);
  const serialized = useMemo(() => JSON.stringify(audience), [audience]);

  // ── Filter templates (localStorage) ─────────────────────────
  const [templates, setTemplates] = useState<FilterTemplate[]>([]);
  useEffect(() => setTemplates(loadTemplates()), []);
  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (t) setAudience(t.definition);
  };
  const saveCurrentAsTemplate = () => {
    const name = window.prompt('Name this filter template:');
    if (!name || !name.trim()) return;
    const next: FilterTemplate[] = [
      ...templates,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        name: name.trim(),
        definition: audience,
      },
    ];
    setTemplates(next);
    saveTemplates(next);
  };
  const deleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  // ── Live count preview ──────────────────────────────────────
  const [countState, setCountState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'ok'; count: number }
    | { status: 'error'; message: string }
  >({ status: 'idle' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!ownerScopeId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCountState({ status: 'loading' });
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      try {
        // Server Action — server-side reads the httpOnly session
        // cookie + forwards the JWT to the Edge Function. Client can't
        // do this directly (per ADR-0014 no token lives in JS).
        const result = await getAudienceCount(ownerScopeId, audience);
        if (seq !== requestSeqRef.current) return;
        if (!result.ok) {
          console.warn('audience/count error:', result.message);
          setCountState({ status: 'error', message: result.message ?? 'Preview unavailable' });
          return;
        }
        setCountState({ status: 'ok', count: result.count ?? 0 });
      } catch (e) {
        if (seq !== requestSeqRef.current) return;
        const message = e instanceof Error ? e.message : 'Preview unavailable';
        console.warn('audience/count exception:', e);
        setCountState({ status: 'error', message });
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [audience, ownerScopeId]);

  return (
    <div className="flex flex-col gap-3">
      {/* Reach preview */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Reaches</span>
          <span className="font-semibold">
            {countState.status === 'loading' && '…'}
            {countState.status === 'ok' && `~${countState.count.toLocaleString()} members`}
            {countState.status === 'error' && countState.message}
            {countState.status === 'idle' && '—'}
          </span>
        </div>
        {isAudienceAll(audience) && <Badge variant="outline">{AUDIENCE_ALL_LABEL}</Badge>}
      </div>

      {/* Template bar — Select + Save button share explicit h-9 for
       * a matching pill row (shadcn Select trigger's default is h-9,
       * Button size='sm' is h-8; force both to h-9 so they align). */}
      <div className="flex items-stretch gap-2">
        <div className="flex-1">
          <Select value="" onValueChange={applyTemplate}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Load filter template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 && (
                <SelectItem value="__empty__" disabled>
                  No saved templates
                </SelectItem>
              )}
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-9 gap-1 text-xs"
          onClick={saveCurrentAsTemplate}
          disabled={isAudienceAll(audience)}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
      </div>
      {templates.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {templates.map((t) => (
            <Badge key={t.id} variant="secondary" className="gap-1 pr-1">
              <span className="text-xs">{t.name}</span>
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-background"
                onClick={() => deleteTemplate(t.id)}
                aria-label={`Delete template ${t.name}`}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* ── Groups ────────────────────────────────────────────── */}
      <ScopeGroup
        title="Membership"
        description="Members whose active membership is in the selected scope(s)."
        mode={audience.membership.mode}
        selectedIds={audience.membership.mode === 'specific' ? audience.membership.scopeIds : []}
        options={options.membershipScopes}
        onModeChange={(mode) =>
          setAudience((a) => ({
            ...a,
            membership: mode === 'all' ? { mode: 'all' } : { mode: 'specific', scopeIds: [] },
          }))
        }
        onSelectionChange={(scopeIds) =>
          setAudience((a) => ({
            ...a,
            membership: scopeIds.length > 0 ? { mode: 'specific', scopeIds } : { mode: 'all' },
          }))
        }
      />

      <LocationGroup
        location={audience.location}
        options={options}
        onChange={(loc) => setAudience((a) => ({ ...a, location: loc }))}
      />

      <ScopeGroup
        title="Houses"
        description="Members whose house attribute matches the selected house(s)."
        mode={audience.houses.mode}
        selectedIds={audience.houses.mode === 'specific' ? audience.houses.scopeIds : []}
        options={options.houses}
        onModeChange={(mode) =>
          setAudience((a) => ({
            ...a,
            houses: mode === 'all' ? { mode: 'all' } : { mode: 'specific', scopeIds: [] },
          }))
        }
        onSelectionChange={(scopeIds) =>
          setAudience((a) => ({
            ...a,
            houses: scopeIds.length > 0 ? { mode: 'specific', scopeIds } : { mode: 'all' },
          }))
        }
      />

      <ScopeGroup
        title="Networks"
        description="Members in the selected professional network(s)."
        mode={audience.networks.mode}
        selectedIds={audience.networks.mode === 'specific' ? audience.networks.scopeIds : []}
        options={options.networks}
        onModeChange={(mode) =>
          setAudience((a) => ({
            ...a,
            networks: mode === 'all' ? { mode: 'all' } : { mode: 'specific', scopeIds: [] },
          }))
        }
        onSelectionChange={(scopeIds) =>
          setAudience((a) => ({
            ...a,
            networks: scopeIds.length > 0 ? { mode: 'specific', scopeIds } : { mode: 'all' },
          }))
        }
      />

      <ScopeGroup
        title="Batches"
        description="Members in the selected batch(es)."
        mode={audience.batches.mode}
        selectedIds={audience.batches.mode === 'specific' ? audience.batches.scopeIds : []}
        options={options.batches}
        onModeChange={(mode) =>
          setAudience((a) => ({
            ...a,
            batches: mode === 'all' ? { mode: 'all' } : { mode: 'specific', scopeIds: [] },
          }))
        }
        onSelectionChange={(scopeIds) =>
          setAudience((a) => ({
            ...a,
            batches: scopeIds.length > 0 ? { mode: 'specific', scopeIds } : { mode: 'all' },
          }))
        }
      />

      <input type="hidden" name={hiddenInputName} value={serialized} readOnly />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
 * Sub-components — Collapsible per group with search + chips
 * ═══════════════════════════════════════════════════════════════════ */

interface ScopeGroupProps {
  readonly title: string;
  readonly description: string;
  readonly mode: 'all' | 'specific';
  readonly selectedIds: readonly string[];
  readonly options: readonly AudienceOption[];
  readonly onModeChange: (mode: 'all' | 'specific') => void;
  readonly onSelectionChange: (ids: string[]) => void;
}

function ScopeGroup({
  title,
  description,
  mode,
  selectedIds,
  options,
  onModeChange,
  onSelectionChange,
}: ScopeGroupProps) {
  const [query, setQuery] = useState('');
  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const idToLabel = useMemo(() => new Map(options.map((o) => [o.id, o.label])), [options]);
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange(selectedIds.filter((s) => s !== id));
    else onSelectionChange([...selectedIds, id]);
  };
  const removeChip = (id: string) => onSelectionChange(selectedIds.filter((s) => s !== id));

  return (
    <Collapsible defaultOpen={false} className="rounded-md border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2 text-left">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{title}</span>
          {mode === 'specific' && selectedIds.length > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">
              {selectedIds.length}
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
          <p className="text-xs text-muted-foreground">{description}</p>

          <RadioGroup
            value={mode}
            onValueChange={(v) => onModeChange(v as 'all' | 'specific')}
            className="flex gap-4"
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem value="all" id={`${title}-all`} />
              <Label htmlFor={`${title}-all`} className="text-sm font-normal">
                All
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <RadioGroupItem value="specific" id={`${title}-specific`} />
              <Label htmlFor={`${title}-specific`} className="text-sm font-normal">
                Specific
              </Label>
            </div>
          </RadioGroup>

          {mode === 'specific' && (
            <>
              {/* Selected chips */}
              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedIds.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1">
                      <span className="text-xs">{idToLabel.get(id) ?? id}</span>
                      <button
                        type="button"
                        onClick={() => removeChip(id)}
                        className="rounded-sm p-0.5 hover:bg-background"
                        aria-label={`Remove ${idToLabel.get(id) ?? id}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Search */}
              <Input
                type="search"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 text-sm"
              />

              <Separator />

              {/* Filtered options */}
              {filteredOptions.length === 0 ? (
                <p className="text-xs italic text-muted-foreground">No matches.</p>
              ) : (
                <ScrollArea className="h-40 rounded-md border border-border">
                  <div className="flex flex-col gap-1 p-2">
                    {filteredOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedIds.includes(opt.id)}
                          onCheckedChange={() => toggle(opt.id)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ── Location group (OR-within: countries / regions / cities) ──────── */

interface LocationGroupProps {
  readonly location: AudienceDefinition['location'];
  readonly options: AudienceOptions;
  readonly onChange: (loc: AudienceDefinition['location']) => void;
}

function LocationGroup({ location, options, onChange }: LocationGroupProps) {
  const mode = location.mode;
  const countries = location.mode === 'specific' ? (location.countries ?? []) : [];
  const regions = location.mode === 'specific' ? (location.regions ?? []) : [];
  const cities = location.mode === 'specific' ? (location.cities ?? []) : [];
  const totalSelected = countries.length + regions.length + cities.length;

  const build = (
    nextCountries: readonly string[],
    nextRegions: readonly string[],
    nextCities: readonly string[],
  ): AudienceDefinition['location'] => {
    if (nextCountries.length + nextRegions.length + nextCities.length === 0) return { mode: 'all' };
    return {
      mode: 'specific',
      countries: nextCountries.length > 0 ? [...nextCountries] : undefined,
      regions: nextRegions.length > 0 ? [...nextRegions] : undefined,
      cities: nextCities.length > 0 ? [...nextCities] : undefined,
    };
  };

  const [countryQuery, setCountryQuery] = useState('');
  const [regionQuery, setRegionQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const filterList = <T,>(
    list: readonly T[],
    q: string,
    keyGetter: (t: T) => string,
  ): readonly T[] => {
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((x) => keyGetter(x).toLowerCase().includes(needle));
  };

  // ── Cascading filters ──────────────────────────────────────
  //
  // When the admin picks a country, the region list narrows to the
  // regions that exist inside that country. When they also pick a
  // region, the city list narrows to cities inside that region. If no
  // country is selected, all regions / cities are on the table (the
  // flat lists on options.regions / options.cities).
  //
  // Computed from options.locationTriples — the raw {country, region,
  // city} rows fetched from core.members' current_* columns.
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

  // Sweep out selected regions/cities that no longer exist under the
  // narrowed set — otherwise a stale selection lingers as a chip but
  // has no matching row anymore.
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
    // Intentionally excludes `countries` / `onChange` / `build` — this
    // effect is a downstream reconciliation triggered by the derived
    // `available*` sets and would otherwise loop.
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
              {totalSelected > 0 && (
                <div className="flex flex-wrap gap-1">
                  {countries.map((c) => (
                    <Badge key={`c-${c}`} variant="secondary" className="gap-1 pr-1">
                      <span className="text-xs">{c}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            build(
                              countries.filter((x) => x !== c),
                              regions,
                              cities,
                            ),
                          )
                        }
                        className="rounded-sm p-0.5 hover:bg-background"
                        aria-label={`Remove ${c}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {regions.map((r) => (
                    <Badge key={`r-${r}`} variant="secondary" className="gap-1 pr-1">
                      <span className="text-xs">{r}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            build(
                              countries,
                              regions.filter((x) => x !== r),
                              cities,
                            ),
                          )
                        }
                        className="rounded-sm p-0.5 hover:bg-background"
                        aria-label={`Remove ${r}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {cities.map((c) => (
                    <Badge key={`ci-${c}`} variant="secondary" className="gap-1 pr-1">
                      <span className="text-xs">{c}</span>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            build(
                              countries,
                              regions,
                              cities.filter((x) => x !== c),
                            ),
                          )
                        }
                        className="rounded-sm p-0.5 hover:bg-background"
                        aria-label={`Remove ${c}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <SubList
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
              <SubList
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
              <SubList
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

interface SubListProps {
  readonly label: string;
  readonly query: string;
  readonly onQueryChange: (q: string) => void;
  readonly options: readonly { id: string; label: string }[];
  readonly selected: readonly string[];
  readonly emptyHint?: string;
  readonly onToggle: (id: string) => void;
}

function SubList({
  label,
  query,
  onQueryChange,
  options,
  selected,
  emptyHint,
  onToggle,
}: SubListProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {selected.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {selected.length}
          </Badge>
        )}
      </div>
      <Input
        type="search"
        placeholder={`Search ${label.toLowerCase()}…`}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        className="h-8 text-sm"
      />
      {options.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          {emptyHint ?? `No ${label.toLowerCase()} match.`}
        </p>
      ) : (
        <ScrollArea className="h-32 rounded-md border border-border">
          <div className="flex flex-col gap-1 p-2">
            {options.map((opt) => (
              <label
                key={opt.id}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={selected.includes(opt.id)}
                  onCheckedChange={() => onToggle(opt.id)}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
