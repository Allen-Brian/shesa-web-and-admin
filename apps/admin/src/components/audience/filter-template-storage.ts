import type { AudienceDefinition } from '@shesa/domain/audience';

export interface FilterTemplate {
  readonly id: string;
  readonly name: string;
  readonly definition: AudienceDefinition;
}

const TEMPLATE_STORAGE_KEY = 'shesa:audience-filter-templates';

export function loadTemplates(): FilterTemplate[] {
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

export function saveTemplates(next: readonly FilterTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* localStorage quota / disabled — silently ignore */
  }
}

export function generateTemplateId(): string {
  return crypto.randomUUID?.() ?? String(Date.now());
}
