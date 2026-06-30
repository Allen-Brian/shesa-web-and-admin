/**
 * QueryClient factory.
 *
 * Cameroon's flaky 3G is the reason Shesa picked TanStack Query (cache,
 * dedupe, retries). Defaults tuned for that environment: retry network
 * failures by default, hold cached data a bit longer to reduce
 * round-trips.
 */

import { QueryClient } from '@tanstack/react-query';

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't refetch on every focus change — saves cellular data when
        // tab-switching is common.
        refetchOnWindowFocus: false,
        // 5 min before a query is considered stale.
        staleTime: 5 * 60 * 1000,
        retry: 2,
      },
      mutations: {
        // Mutations should not silently retry — the user explicitly
        // initiated, so failures need to surface.
        retry: false,
      },
    },
  });
}
