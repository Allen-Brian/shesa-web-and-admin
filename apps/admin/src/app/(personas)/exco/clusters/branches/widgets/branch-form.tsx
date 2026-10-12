'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import { Button, Input, Label, Switch, Textarea, toast } from '@shesa/ui';

import { CountryRegionPicker } from '@/components/geography/country-region-picker';
import { defaultCurrencyForCountry } from '@/lib/country-currency';

import { createBranch, updateBranch, type BranchFormState } from '../branch-actions';

export interface BranchInitialValues {
  readonly scopeId?: string;
  readonly name?: string;
  readonly slug?: string;
  readonly nickname?: string | null;
  readonly description?: string | null;
  readonly countryCode?: string;
  readonly region?: string;
  readonly city?: string;
  readonly currencyCode?: string;
  readonly registrationFeeRequired?: boolean;
  readonly registrationFeeAmount?: number | null;
  readonly registrationFeeCurrency?: string | null;
  readonly contactEmail?: string | null;
  readonly contactPhone?: string | null;
}

interface BranchFormProps {
  readonly mode: 'create' | 'edit';
  readonly initial?: BranchInitialValues;
  readonly onSuccess?: (scopeId: string) => void;
  readonly onCancel?: () => void;
}

const INITIAL_STATE: BranchFormState = { ok: true };

export function BranchForm({ mode, initial, onSuccess, onCancel }: BranchFormProps) {
  const action = mode === 'create' ? createBranch : updateBranch;
  const [state, formAction] = useActionState<BranchFormState, FormData>(action, INITIAL_STATE);

  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugDirty, setSlugDirty] = useState(!!initial?.slug);
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [geography, setGeography] = useState({
    countryCode: initial?.countryCode ?? '',
    region: initial?.region ?? '',
    city: initial?.city ?? '',
  });
  const [currencyCode, setCurrencyCode] = useState(initial?.currencyCode ?? 'XAF');
  const [currencyDirty, setCurrencyDirty] = useState(!!initial?.currencyCode);
  const [registrationFeeRequired, setRegistrationFeeRequired] = useState(
    initial?.registrationFeeRequired ?? false,
  );
  const [registrationFeeAmount, setRegistrationFeeAmount] = useState<string>(
    initial?.registrationFeeAmount != null ? String(initial.registrationFeeAmount) : '',
  );
  const [registrationFeeCurrency, setRegistrationFeeCurrency] = useState(
    initial?.registrationFeeCurrency ?? '',
  );
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(initial?.contactPhone ?? '');

  // Auto-derive slug from name (create only, until user edits slug).
  const derivedSlug = useMemo(() => slugify(name), [name]);
  useEffect(() => {
    if (mode === 'create' && !slugDirty) setSlug(derivedSlug);
  }, [derivedSlug, mode, slugDirty]);

  // Pre-fill currency from selected country, until the user overrides it.
  useEffect(() => {
    if (currencyDirty) return;
    if (!geography.countryCode) return;
    setCurrencyCode(defaultCurrencyForCountry(geography.countryCode));
  }, [geography.countryCode, currencyDirty]);

  useEffect(() => {
    if (state.ok === false && state.message) toast.error(state.message);
    if (state.ok === true && state.scopeId) onSuccess?.(state.scopeId);
  }, [state, onSuccess]);

  const fieldErrors = state.ok === false ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {initial?.scopeId && <input type="hidden" name="scopeId" value={initial.scopeId} />}
      <input type="hidden" name="countryCode" value={geography.countryCode} />
      <input type="hidden" name="region" value={geography.region} />
      <input type="hidden" name="city" value={geography.city} />
      <input type="hidden" name="currencyCode" value={currencyCode} />
      <input
        type="hidden"
        name="registrationFeeRequired"
        value={registrationFeeRequired ? 'true' : 'false'}
      />

      <Section title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Branch name" htmlFor="name" error={fieldErrors.name} required>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Shesa Buea"
              maxLength={200}
              required
            />
          </Field>
          <Field label="Slug" htmlFor="slug" error={fieldErrors.slug} required>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugDirty(true);
              }}
              placeholder="shesa-buea"
              maxLength={80}
              required
            />
          </Field>
          <Field label="Nickname" htmlFor="nickname" error={fieldErrors.nickname}>
            <Input
              id="nickname"
              name="nickname"
              value={nickname ?? ''}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. DMV"
              maxLength={200}
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="description" error={fieldErrors.description}>
          <Textarea
            id="description"
            name="description"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short blurb about the branch."
            rows={2}
            maxLength={2000}
          />
        </Field>
      </Section>

      <Section title="Location">
        <CountryRegionPicker
          required
          value={geography}
          onChange={setGeography}
          errors={{
            countryCode: fieldErrors.countryCode,
            region: fieldErrors.region,
            city: fieldErrors.city,
          }}
        />
      </Section>

      <Section title="Finance settings">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Currency"
            htmlFor="currencyDisplay"
            error={fieldErrors.currencyCode}
            required
          >
            <Input
              id="currencyDisplay"
              value={currencyCode}
              onChange={(e) => {
                setCurrencyCode(e.target.value.toUpperCase());
                setCurrencyDirty(true);
              }}
              placeholder="XAF"
              maxLength={3}
              className=""
              required
            />
          </Field>
          <Field
            label="Registration fee required"
            htmlFor="registrationFeeRequired"
            error={undefined}
          >
            <div className="flex h-10 items-center">
              <Switch
                id="registrationFeeRequired"
                checked={registrationFeeRequired}
                onCheckedChange={setRegistrationFeeRequired}
              />
              <span className="ml-2 text-sm text-muted-foreground">Tracked, not enforced.</span>
            </div>
          </Field>
          {registrationFeeRequired && (
            <Field
              label="Fee amount"
              htmlFor="registrationFeeAmount"
              error={fieldErrors.registrationFeeAmount}
              required
            >
              <Input
                id="registrationFeeAmount"
                name="registrationFeeAmount"
                type="number"
                min={0}
                step={1}
                value={registrationFeeAmount}
                onChange={(e) => setRegistrationFeeAmount(e.target.value)}
                placeholder="0"
              />
            </Field>
          )}
          {registrationFeeRequired && (
            <Field
              label="Fee currency"
              htmlFor="registrationFeeCurrency"
              error={fieldErrors.registrationFeeCurrency}
            >
              <Input
                id="registrationFeeCurrency"
                name="registrationFeeCurrency"
                value={registrationFeeCurrency ?? ''}
                onChange={(e) => setRegistrationFeeCurrency(e.target.value.toUpperCase())}
                placeholder={currencyCode}
                maxLength={3}
                className=""
              />
            </Field>
          )}
        </div>
      </Section>

      <Section title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email" htmlFor="contactEmail" error={fieldErrors.contactEmail}>
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              value={contactEmail ?? ''}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="branch@shesaconnect.com"
              maxLength={200}
            />
          </Field>
          <Field label="Contact phone" htmlFor="contactPhone" error={fieldErrors.contactPhone}>
            <Input
              id="contactPhone"
              name="contactPhone"
              value={contactPhone ?? ''}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+237 …"
              maxLength={40}
            />
          </Field>
        </div>
      </Section>

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

function Section({
  title,
  children,
}: {
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

function Field({
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
  const idle = mode === 'create' ? 'Create Branch' : 'Save changes';
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
