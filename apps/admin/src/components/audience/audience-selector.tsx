'use client';

/**
 * AudienceSelector — the shared five-group audience picker.
 *
 * Layout (top to bottom):
 *   - Live "Reaches ~N members" preview (debounced 300ms; stale requests
 *     discarded). Distinct visual state for error / loading / idle.
 *   - Filter-template bar: load a previously-saved definition or save
 *     the current one. Templates persist in localStorage per browser.
 *   - One Collapsible per group (Membership · Location · Houses ·
 *     Networks · Batches). Each opens to reveal All / Specific radios,
 *     selected-value chips, a search input, and a scrollable checkbox
 *     list.
 *   - A hidden JSON input carries the whole AudienceDefinition through
 *     the enclosing form. The Server Action parses + Zod-validates.
 *
 * Consumed by Announcements + Events.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

import { AUDIENCE_ALL, type AudienceDefinition } from '@shesa/domain/audience';

import { getAudienceCount } from './audience-actions';
import { AudienceLocationGroup } from './audience-location-group';
import { AudienceReachPreview, type ReachState } from './audience-reach-preview';
import { AudienceScopeGroup } from './audience-scope-group';
import { DEFAULT_HIDDEN_INPUT_NAME, type AudienceSelectorProps } from './audience-selector-types';
import { AudienceTemplateBar } from './audience-template-bar';
import {
  generateTemplateId,
  loadTemplates,
  saveTemplates,
  type FilterTemplate,
} from './filter-template-storage';
import { SaveFilterTemplateDialog } from './save-filter-template-dialog';

export type {
  AudienceOption,
  AudienceOptions,
  AudienceSelectorProps,
} from './audience-selector-types';

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
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  useEffect(() => setTemplates(loadTemplates()), []);

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (t) setAudience(t.definition);
  };
  const saveCurrentAsTemplate = (name: string) => {
    const next: FilterTemplate[] = [
      ...templates,
      { id: generateTemplateId(), name, definition: audience },
    ];
    setTemplates(next);
    saveTemplates(next);
    setSaveDialogOpen(false);
  };
  const deleteTemplate = (id: string) => {
    const next = templates.filter((t) => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  // ── Live count preview ──────────────────────────────────────
  const [countState, setCountState] = useState<ReachState>({ status: 'idle' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (!ownerScopeId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setCountState({ status: 'loading' });
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeqRef.current;
      try {
        // Server Action — server-side reads the httpOnly session cookie
        // and forwards the JWT to the Edge Function. Client can't do
        // this directly (per ADR-0014 no token lives in JS).
        const result = await getAudienceCount(ownerScopeId, audience);
        if (seq !== requestSeqRef.current) return;
        if (!result.ok) {
          console.warn('audience/count error:', result.message);
          setCountState({ status: 'error', message: result.message ?? 'No Preview' });
          return;
        }
        setCountState({ status: 'ok', count: result.count ?? 0 });
      } catch (e) {
        if (seq !== requestSeqRef.current) return;
        const message = e instanceof Error ? e.message : 'No Preview';
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
      <AudienceReachPreview state={countState} audience={audience} />

      <AudienceTemplateBar
        templates={templates}
        canSave={!isEmptyAudience(audience)}
        onApply={applyTemplate}
        onOpenSaveDialog={() => setSaveDialogOpen(true)}
        onDelete={deleteTemplate}
      />

      <AudienceScopeGroup
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

      <AudienceLocationGroup
        location={audience.location}
        options={options}
        onChange={(loc) => setAudience((a) => ({ ...a, location: loc }))}
      />

      <AudienceScopeGroup
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

      <AudienceScopeGroup
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

      <AudienceScopeGroup
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

      <SaveFilterTemplateDialog
        open={saveDialogOpen}
        onCancel={() => setSaveDialogOpen(false)}
        onSave={saveCurrentAsTemplate}
      />
    </div>
  );
}

/**
 * "Empty" audience = every group in `all` mode. Save is disabled in
 * that case since there'd be nothing to reuse.
 */
function isEmptyAudience(a: AudienceDefinition): boolean {
  return (
    a.membership.mode === 'all' &&
    a.location.mode === 'all' &&
    a.houses.mode === 'all' &&
    a.networks.mode === 'all' &&
    a.batches.mode === 'all'
  );
}
