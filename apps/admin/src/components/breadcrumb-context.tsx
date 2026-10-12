'use client';

import * as React from 'react';

interface BreadcrumbContextValue {
  labels: Record<string, string>;
  setLabel: (segment: string, label: string) => void;
  clearLabel: (segment: string) => void;
}

const BreadcrumbContext = React.createContext<BreadcrumbContextValue | null>(null);

/**
 * Provider that lets pages override how a URL segment renders in the topbar
 * breadcrumb. Used to swap object UUIDs (member id, event id, etc.) for the
 * object's display name.
 */
export function BreadcrumbProvider({ children }: { readonly children: React.ReactNode }) {
  const [labels, setLabels] = React.useState<Record<string, string>>({});
  const setLabel = React.useCallback((segment: string, label: string) => {
    setLabels((prev) => (prev[segment] === label ? prev : { ...prev, [segment]: label }));
  }, []);
  const clearLabel = React.useCallback((segment: string) => {
    setLabels((prev) => {
      if (!(segment in prev)) return prev;
      const next = { ...prev };
      delete next[segment];
      return next;
    });
  }, []);
  const value = React.useMemo(
    () => ({ labels, setLabel, clearLabel }),
    [labels, setLabel, clearLabel],
  );
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumb(): BreadcrumbContextValue {
  const ctx = React.useContext(BreadcrumbContext);
  if (!ctx) throw new Error('useBreadcrumb must be used inside a BreadcrumbProvider');
  return ctx;
}

/**
 * Page-side helper: registers a human-readable label for a URL segment so the
 * topbar breadcrumb shows the object's name instead of its raw id.
 */
export function useBreadcrumbLabel(segment: string | undefined, label: string | null | undefined) {
  const { setLabel, clearLabel } = useBreadcrumb();
  React.useEffect(() => {
    if (!segment) return;
    if (label) setLabel(segment, label);
    return () => {
      if (segment) clearLabel(segment);
    };
  }, [segment, label, setLabel, clearLabel]);
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
