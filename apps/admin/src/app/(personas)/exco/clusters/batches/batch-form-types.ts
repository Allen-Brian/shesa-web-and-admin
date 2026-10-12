export type BatchFormField =
  | 'name'
  | 'slug'
  | 'entryYear'
  | 'ordinal'
  | 'nickname'
  | 'description'
  | 'contactEmail'
  | 'contactPhone';

export type BatchFormState =
  | { ok: true; scopeId?: string }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<BatchFormField, string>>;
      values?: Partial<Record<BatchFormField, string>>;
    };

export interface ArchiveResult {
  readonly ok: boolean;
  readonly scopeId: string;
  readonly message?: string;
}
