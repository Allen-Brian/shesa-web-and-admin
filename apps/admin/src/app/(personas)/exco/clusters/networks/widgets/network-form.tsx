'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, ColorField, Input, Label, Textarea, toast } from '@shesa/ui';

import { IconPicker } from '@/components/networks/icon-picker';

import { createNetwork, updateNetwork, type NetworkFormState } from '../network-actions';

export interface NetworkInitialValues {
  readonly scopeId?: string;
  readonly name?: string;
  readonly shortName?: string;
  readonly slug?: string;
  readonly description?: string | null;
  readonly icon?: string | null;
  readonly colorHex?: string | null;
  readonly sortOrder?: number;
}

interface NetworkFormProps {
  readonly mode: 'create' | 'edit';
  readonly initial?: NetworkInitialValues;
  readonly onSuccess?: (scopeId: string) => void;
  readonly onCancel?: () => void;
}

const INITIAL_STATE: NetworkFormState = { ok: true };

/**
 * Presentation-agnostic form body. Works inside a Dialog (create/edit
 * both open a popup per the 2026-07-02 spec) — `onSuccess` closes the
 * dialog + revalidates; `onCancel` closes without saving.
 */
export function NetworkForm({ mode, initial, onSuccess, onCancel }: NetworkFormProps) {
  const action = mode === 'create' ? createNetwork : updateNetwork;
  const [state, formAction] = useActionState<NetworkFormState, FormData>(action, INITIAL_STATE);

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugDirty, setSlugDirty] = useState(!!initial?.slug);
  const [shortName, setShortName] = useState(initial?.shortName ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null);
  const [colorHex, setColorHex] = useState(initial?.colorHex ?? '#7C3AED');
  const [sortOrder, setSortOrder] = useState<string>(String(initial?.sortOrder ?? 0));

  // Auto-derive slug from name until the user edits the slug field.
  const derivedSlug = useMemo(() => slugify(name), [name]);
  useEffect(() => {
    if (mode === 'create' && !slugDirty) setSlug(derivedSlug);
  }, [derivedSlug, mode, slugDirty]);

  // Wire form state → toasts + parent callbacks.
  useEffect(() => {
    if (state.ok === false && state.message) toast.error(state.message);
    if (state.ok === true && state.scopeId) onSuccess?.(state.scopeId);
  }, [state, onSuccess]);

  const fieldErrors = state.ok === false ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {initial?.scopeId && <input type="hidden" name="scopeId" value={initial.scopeId} />}
      <input type="hidden" name="icon" value={icon ?? ''} />
      <input type="hidden" name="colorHex" value={colorHex} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Network name" htmlFor="name" error={fieldErrors.name} required>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Shesa Legal"
            maxLength={200}
            required
          />
        </FormField>

        <FormField label="Short name" htmlFor="shortName" error={fieldErrors.shortName} required>
          <Input
            id="shortName"
            name="shortName"
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="Legal"
            maxLength={40}
            required
          />
        </FormField>

        <FormField label="Slug" htmlFor="slug" error={fieldErrors.slug} required>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugDirty(true);
            }}
            placeholder="shesa-legal"
            maxLength={80}
            required
          />
        </FormField>

        <FormField label="Sort order" htmlFor="sortOrder" error={fieldErrors.sortOrder}>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            min={0}
            max={999}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description" error={fieldErrors.description}>
        <Textarea
          id="description"
          name="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Who this network is for and what its forum will cover."
          rows={3}
          maxLength={2000}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Icon" htmlFor="iconPicker" error={fieldErrors.icon}>
          <IconPicker value={icon} onChange={setIcon} />
        </FormField>

        <FormField label="Accent color" htmlFor="colorHex" error={fieldErrors.colorHex}>
          <ColorField id="colorHex" value={colorHex} onChange={setColorHex} />
        </FormField>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}

function FormField({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function SubmitButton({ mode }: { readonly mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  const idle = mode === 'create' ? 'Create Network' : 'Save changes';
  const busy = mode === 'create' ? 'Creating…' : 'Saving…';
  return (
    <Button type="submit" size="sm" loading={pending} disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}

function slugify(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
