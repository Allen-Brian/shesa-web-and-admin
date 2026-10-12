'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, Input, Label, Textarea, toast } from '@shesa/ui';

import { formatOrdinal } from '@/lib/batches/ordinal';

import { createBatch, updateBatch } from '../batch-actions';
import type { BatchFormState } from '../batch-form-types';

export interface BatchInitialValues {
  readonly scopeId?: string;
  readonly name?: string;
  readonly slug?: string;
  readonly entryYear?: number | null;
  readonly ordinal?: number | null;
  readonly nickname?: string | null;
  readonly description?: string | null;
  readonly contactEmail?: string | null;
  readonly contactPhone?: string | null;
}

interface BatchFormProps {
  readonly mode: 'create' | 'edit';
  readonly initial?: BatchInitialValues;
  readonly onSuccess?: (scopeId: string) => void;
  readonly onCancel?: () => void;
}

const INITIAL_STATE: BatchFormState = { ok: true };

export function BatchForm({ mode, initial, onSuccess, onCancel }: BatchFormProps) {
  const action = mode === 'create' ? createBatch : updateBatch;
  const [state, formAction] = useActionState<BatchFormState, FormData>(action, INITIAL_STATE);

  const [entryYear, setEntryYear] = useState<string>(
    initial?.entryYear ? String(initial.entryYear) : '',
  );
  const [name, setName] = useState(initial?.name ?? '');
  const [nameDirty, setNameDirty] = useState(!!initial?.name);
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugDirty, setSlugDirty] = useState(!!initial?.slug);
  const [ordinal, setOrdinal] = useState<string>(
    initial?.ordinal != null ? String(initial.ordinal) : '',
  );
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');

  // Derive name + slug from entry year on create until the user overrides.
  const derivedName = useMemo(() => (entryYear ? `${entryYear} Batch` : ''), [entryYear]);
  const derivedSlug = useMemo(() => (entryYear ? `batch-${entryYear}` : ''), [entryYear]);
  useEffect(() => {
    if (mode === 'create' && !nameDirty) setName(derivedName);
    if (mode === 'create' && !slugDirty) setSlug(derivedSlug);
  }, [derivedName, derivedSlug, mode, nameDirty, slugDirty]);

  useEffect(() => {
    if (state.ok === false && state.message) toast.error(state.message);
    if (state.ok === true && state.scopeId) onSuccess?.(state.scopeId);
  }, [state, onSuccess]);

  const fieldErrors = state.ok === false ? (state.fieldErrors ?? {}) : {};

  const ordinalPreview = ordinal.trim() ? formatOrdinal(Number.parseInt(ordinal, 10)) : null;

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {initial?.scopeId && <input type="hidden" name="scopeId" value={initial.scopeId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === 'create' && (
          <FormField label="Entry year" htmlFor="entryYear" error={fieldErrors.entryYear} required>
            <Input
              id="entryYear"
              name="entryYear"
              type="number"
              min={1900}
              max={new Date().getUTCFullYear() + 5}
              value={entryYear}
              onChange={(e) => setEntryYear(e.target.value)}
              placeholder="2012"
              required
            />
          </FormField>
        )}

        <FormField label="Batch name" htmlFor="name" error={fieldErrors.name} required>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameDirty(true);
            }}
            placeholder="2012 Batch"
            maxLength={200}
            required
          />
        </FormField>

        {mode === 'create' && (
          <FormField label="Slug" htmlFor="slug" error={fieldErrors.slug} required>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugDirty(true);
              }}
              placeholder="batch-2012"
              maxLength={80}
              required
            />
          </FormField>
        )}

        <FormField
          label="Ordinal position"
          htmlFor="ordinal"
          error={fieldErrors.ordinal}
          hint={
            ordinalPreview
              ? `Renders as "${ordinalPreview} Batch".`
              : 'Optional. 1 = the first ever batch (1953). Leave blank if unknown.'
          }
        >
          <Input
            id="ordinal"
            name="ordinal"
            type="number"
            min={1}
            max={999}
            value={ordinal}
            onChange={(e) => setOrdinal(e.target.value)}
            placeholder="53"
          />
        </FormField>
      </div>

      <FormField
        label="Nickname"
        htmlFor="nickname"
        error={fieldErrors.nickname}
        hint="Optional. Displayed as an accessory badge next to the batch name."
      >
        <Input
          id="nickname"
          name="nickname"
          value={nickname ?? ''}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Golden Jubilee"
          maxLength={80}
        />
      </FormField>

      <FormField label="Description" htmlFor="description" error={fieldErrors.description}>
        <Textarea
          id="description"
          name="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Anything to remember about this batch — highlights, milestones, campaigns."
          rows={3}
          maxLength={2000}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Contact email" htmlFor="contactEmail" error={fieldErrors.contactEmail}>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            value={contactEmail ?? ''}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="batch-2012@shesaconnect.com"
          />
        </FormField>

        <FormField label="Contact phone" htmlFor="contactPhone" error={fieldErrors.contactPhone}>
          <Input
            id="contactPhone"
            name="contactPhone"
            value={contactPhone ?? ''}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+237 …"
            maxLength={40}
          />
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
  hint,
  children,
}: {
  readonly label: string;
  readonly htmlFor: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({ mode }: { readonly mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus();
  const idle = mode === 'create' ? 'Create Batch' : 'Save changes';
  const busy = mode === 'create' ? 'Creating…' : 'Saving…';
  return (
    <Button type="submit" size="sm" loading={pending} disabled={pending}>
      {pending ? busy : idle}
    </Button>
  );
}
