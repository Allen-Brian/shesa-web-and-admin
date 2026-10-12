import type { AudienceDefinition } from '@shesa/domain/audience';

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

export const DEFAULT_HIDDEN_INPUT_NAME = 'audienceDefinitionJson';
