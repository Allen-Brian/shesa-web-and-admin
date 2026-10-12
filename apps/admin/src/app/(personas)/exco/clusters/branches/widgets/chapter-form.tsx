'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useFormStatus } from 'react-dom';

import {
  Button,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Switch,
  Textarea,
  toast,
} from '@shesa/ui';

import { CountryRegionPicker } from '@/components/geography/country-region-picker';
import { defaultCurrencyForCountry } from '@/lib/country-currency';

import { createChapter, updateChapter, type ChapterFormState } from '../chapter-actions';

export interface ChapterInitialValues {
  readonly scopeId?: string;
  readonly parentBranchId: string;
  readonly parentBranchName: string;
  readonly chapterKind?: 'autonomous' | 'grouping';
  readonly name?: string;
  readonly slug?: string;
  readonly nickname?: string | null;
  readonly description?: string | null;
  readonly countryCode?: string;
  readonly region?: string;
  readonly city?: string;
  readonly currencyCode?: string | null;
  readonly registrationFeeRequired?: boolean;
  readonly registrationFeeAmount?: number | null;
  readonly registrationFeeCurrency?: string | null;
  readonly contactEmail?: string | null;
  readonly contactPhone?: string | null;
  /** Parent branch geography — used to pre-fill on create. */
  readonly parentGeography?: {
    readonly countryCode: string;
    readonly region: string;
    readonly city: string;
    readonly currencyCode: string;
  };
}

interface ChapterFormProps {
  readonly mode: 'create' | 'edit';
  readonly initial: ChapterInitialValues;
  readonly onSuccess?: (scopeId: string) => void;
  readonly onCancel?: () => void;
}

const INITIAL_STATE: ChapterFormState = { ok: true };

export function ChapterForm({ mode, initial, onSuccess, onCancel }: ChapterFormProps) {
  const action = mode === 'create' ? createChapter : updateChapter;
  const [state, formAction] = useActionState<ChapterFormState, FormData>(action, INITIAL_STATE);

  const [chapterKind, setChapterKind] = useState<'autonomous' | 'grouping'>(
    initial.chapterKind ?? 'grouping',
  );
  const [name, setName] = useState(initial.name ?? '');
  const [slug, setSlug] = useState(initial.slug ?? '');
  const [slugDirty, setSlugDirty] = useState(!!initial.slug);
  const [nickname, setNickname] = useState(initial.nickname ?? '');
  const [description, setDescription] = useState(initial.description ?? '');
  const [geography, setGeography] = useState({
    countryCode: initial.countryCode ?? initial.parentGeography?.countryCode ?? '',
    region: initial.region ?? initial.parentGeography?.region ?? '',
    city: initial.city ?? initial.parentGeography?.city ?? '',
  });
  const [currencyCode, setCurrencyCode] = useState(
    initial.currencyCode ?? initial.parentGeography?.currencyCode ?? 'XAF',
  );
  const [currencyDirty, setCurrencyDirty] = useState(!!initial.currencyCode);
  const [registrationFeeRequired, setRegistrationFeeRequired] = useState(
    initial.registrationFeeRequired ?? false,
  );
  const [registrationFeeAmount, setRegistrationFeeAmount] = useState(
    initial.registrationFeeAmount != null ? String(initial.registrationFeeAmount) : '',
  );
  const [registrationFeeCurrency, setRegistrationFeeCurrency] = useState(
    initial.registrationFeeCurrency ?? '',
  );
  const [contactEmail, setContactEmail] = useState(initial.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(initial.contactPhone ?? '');

  const derivedSlug = useMemo(() => slugify(name), [name]);
  useEffect(() => {
    if (mode === 'create' && !slugDirty) setSlug(derivedSlug);
  }, [derivedSlug, mode, slugDirty]);

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
  const isAutonomous = chapterKind === 'autonomous';

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {initial.scopeId && <input type="hidden" name="scopeId" value={initial.scopeId} />}
      <input type="hidden" name="parentBranchId" value={initial.parentBranchId} />
      <input type="hidden" name="chapterKind" value={chapterKind} />
      <input type="hidden" name="countryCode" value={geography.countryCode} />
      <input type="hidden" name="region" value={geography.region} />
      <input type="hidden" name="city" value={geography.city} />
      <input type="hidden" name="currencyCode" value={isAutonomous ? currencyCode : ''} />
      <input
        type="hidden"
        name="registrationFeeRequired"
        value={isAutonomous && registrationFeeRequired ? 'true' : 'false'}
      />

      <Section title="Parent branch">
        <p className="text-sm text-muted-foreground">
          This chapter belongs to{' '}
          <strong className="text-foreground">{initial.parentBranchName}</strong>. Parent isn&apos;t
          changeable — create the chapter under the correct branch instead.
        </p>
      </Section>

      <Section title="Kind">
        <RadioGroup
          value={chapterKind}
          onValueChange={(v: string) =>
            setChapterKind(v === 'autonomous' ? 'autonomous' : 'grouping')
          }
          className="grid gap-2 sm:grid-cols-2"
        >
          <KindOption
            id="kind-autonomous"
            value="autonomous"
            title="Autonomous"
            blurb="A full body — own registration, treasury, and page. Members join it directly."
          />
          <KindOption
            id="kind-grouping"
            value="grouping"
            title="Grouping"
            blurb="A tag on branch members (e.g. a neighbourhood, a class). No treasury, no registration."
          />
        </RadioGroup>
        {fieldErrors.chapterKind && (
          <p className="text-xs text-destructive">{fieldErrors.chapterKind}</p>
        )}
      </Section>

      <Section title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Chapter name" htmlFor="name" error={fieldErrors.name} required>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Buea University Chapter"
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
              placeholder="buea-uni"
              maxLength={80}
              required
            />
          </Field>
          <Field label="Nickname" htmlFor="nickname">
            <Input
              id="nickname"
              name="nickname"
              value={nickname ?? ''}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={200}
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            value={description ?? ''}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={2000}
          />
        </Field>
      </Section>

      <Section title="Location">
        <p className="text-xs text-muted-foreground">
          Pre-filled from the parent branch. Edit if the chapter sits somewhere else.
        </p>
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

      {isAutonomous && (
        <>
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
              <Field label="Registration fee" htmlFor="registrationFeeRequired">
                <div className="flex h-10 items-center gap-2">
                  <Switch
                    id="registrationFeeRequired"
                    checked={registrationFeeRequired}
                    onCheckedChange={setRegistrationFeeRequired}
                  />
                  <span className="text-sm text-muted-foreground">Track a fee amount.</span>
                </div>
              </Field>
              {registrationFeeRequired && (
                <>
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
                    />
                  </Field>
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
                </>
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
                  maxLength={200}
                />
              </Field>
              <Field label="Contact phone" htmlFor="contactPhone" error={fieldErrors.contactPhone}>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  value={contactPhone ?? ''}
                  onChange={(e) => setContactPhone(e.target.value)}
                  maxLength={40}
                />
              </Field>
            </div>
          </Section>
        </>
      )}

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

function KindOption({
  id,
  value,
  title,
  blurb,
}: {
  readonly id: string;
  readonly value: string;
  readonly title: string;
  readonly blurb: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
    >
      <RadioGroupItem id={id} value={value} className="mt-1" />
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{blurb}</span>
      </div>
    </label>
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
  const idle = mode === 'create' ? 'Create Chapter' : 'Save changes';
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
