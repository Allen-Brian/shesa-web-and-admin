'use client';

import { useEffect, useMemo, useState } from 'react';
import { Country, State } from 'country-state-city';
import { Check, ChevronsUpDown, Search } from 'lucide-react';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from '@shesa/ui';

/**
 * Shared country + region + city picker for Branch and Chapter forms.
 * Country + region source their options from `country-state-city`;
 * city is free-text. Selecting a country resets region, and each
 * change bubbles up via the `onChange` callback so the parent form
 * can react (e.g. Branch form pre-fills currency from country).
 *
 * Country codes flow through as ISO 3166-1 alpha-2 ("CM", "US"), which
 * matches the DB column shape.
 */

export interface CountryRegionValue {
  readonly countryCode: string; // ISO 3166-1 alpha-2 or ''
  readonly region: string;
  readonly city: string;
}

interface CountryRegionPickerProps {
  readonly value: CountryRegionValue;
  readonly onChange: (next: CountryRegionValue) => void;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly errors?: {
    readonly countryCode?: string;
    readonly region?: string;
    readonly city?: string;
  };
}

interface CountryOption {
  readonly isoCode: string;
  readonly name: string;
  readonly flag: string;
}

interface StateOption {
  readonly isoCode: string;
  readonly name: string;
}

export function CountryRegionPicker({
  value,
  onChange,
  required,
  disabled,
  errors,
}: CountryRegionPickerProps) {
  const countries = useMemo<CountryOption[]>(
    () =>
      Country.getAllCountries().map((c) => ({
        isoCode: c.isoCode,
        name: c.name,
        flag: c.flag,
      })),
    [],
  );

  const regions = useMemo<StateOption[]>(() => {
    if (!value.countryCode) return [];
    return State.getStatesOfCountry(value.countryCode).map((s) => ({
      isoCode: s.isoCode,
      name: s.name,
    }));
  }, [value.countryCode]);

  const [countryOpen, setCountryOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);

  // If the country changes to one with no regions matching the current
  // region string, clear it. Cheap to compute — regions is a stable
  // array for each country.
  useEffect(() => {
    if (!value.region) return;
    if (regions.length === 0) return;
    const hit = regions.some((r) => r.name === value.region);
    if (!hit) onChange({ ...value, region: '' });
  }, [value.countryCode]);

  const currentCountry = countries.find((c) => c.isoCode === value.countryCode);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="country">
          Country
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
          <PopoverTrigger asChild>
            <Button
              id="country"
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              className="w-full justify-between px-3"
            >
              <span className="flex min-w-0 items-center gap-2">
                {currentCountry ? (
                  <>
                    <span className="text-base">{currentCountry.flag}</span>
                    <span className="truncate">{currentCountry.name}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Pick a country</span>
                )}
              </span>
              <ChevronsUpDown className="h-4 w-4 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[320px] p-0">
            <Command>
              <div className="flex items-center gap-2 border-b border-border px-2 py-1">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <CommandInput placeholder="Search countries…" className="h-9 flex-1 border-0" />
              </div>
              <CommandList className="max-h-72">
                <CommandEmpty>No country matches.</CommandEmpty>
                <CommandGroup>
                  {countries.map((c) => (
                    <CommandItem
                      key={c.isoCode}
                      value={`${c.name} ${c.isoCode}`}
                      onSelect={() => {
                        onChange({ ...value, countryCode: c.isoCode, region: '' });
                        setCountryOpen(false);
                      }}
                      className="flex items-center gap-2"
                    >
                      <span className="text-base">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-xs text-muted-foreground">{c.isoCode}</span>
                      {value.countryCode === c.isoCode && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {errors?.countryCode && <p className="text-xs text-destructive">{errors.countryCode}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="region">
          Region / State
          {required && <span className="text-destructive"> *</span>}
        </Label>
        {regions.length > 0 ? (
          <Popover open={regionOpen} onOpenChange={setRegionOpen}>
            <PopoverTrigger asChild>
              <Button
                id="region"
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || !value.countryCode}
                className={cn(
                  'w-full justify-between px-3',
                  !value.region && 'text-muted-foreground',
                )}
              >
                <span className="truncate">{value.region || 'Pick a region'}</span>
                <ChevronsUpDown className="h-4 w-4 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-70 p-0">
              <Command>
                <div className="flex items-center gap-2 border-b border-border px-2 py-1">
                  <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <CommandInput placeholder="Search regions…" className="h-9 flex-1 border-0" />
                </div>
                <CommandList className="max-h-72">
                  <CommandEmpty>No region matches.</CommandEmpty>
                  <CommandGroup>
                    {regions.map((r) => (
                      <CommandItem
                        key={r.isoCode}
                        value={r.name}
                        onSelect={() => {
                          onChange({ ...value, region: r.name });
                          setRegionOpen(false);
                        }}
                      >
                        <span className="flex-1 truncate">{r.name}</span>
                        {value.region === r.name && <Check className="h-4 w-4 text-primary" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        ) : (
          <Input
            id="region"
            value={value.region}
            onChange={(e) => onChange({ ...value, region: e.target.value })}
            disabled={disabled || !value.countryCode}
            placeholder="Type a region"
            maxLength={120}
            required={required}
          />
        )}
        {errors?.region && <p className="text-xs text-destructive">{errors.region}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="city">
          City
          {required && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id="city"
          value={value.city}
          onChange={(e) => onChange({ ...value, city: e.target.value })}
          disabled={disabled}
          placeholder="e.g. Buea"
          maxLength={120}
          required={required}
        />
        {errors?.city && <p className="text-xs text-destructive">{errors.city}</p>}
      </div>
    </div>
  );
}
