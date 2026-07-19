export interface BranchImportScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
}

export type BranchImportStep = 'pick' | 'processing' | 'done';

export type BranchImportEditableField =
  | 'fullName'
  | 'displayName'
  | 'email'
  | 'phone'
  | 'memberCode'
  | 'batchEntryYear'
  | 'house'
  | 'network';

export type BranchImportRowEdits = Partial<Record<BranchImportEditableField, string>>;

// ─── Attach flow ─────────────────────────────────────────────────────
// Row shape + outcome discriminated union + summary aggregate. Kept in
// this plain (non-'use server') file so both the client widgets and
// the Server Action orchestrator can share one source — `'use server'`
// files only allow async-function exports, not types.

export interface AttachRow {
  readonly fullName?: string | null;
  readonly displayName?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly memberCode?: string | null;
  readonly batchEntryYear?: number | null;
  readonly house?: string | null;
  readonly network?: string | null;
  readonly field?: string | null;
  readonly entryYear?: number | null;
  readonly exitYear?: number | null;
  readonly currentCountry?: string | null;
  readonly currentRegionState?: string | null;
  readonly currentCity?: string | null;
}

export type AttachOutcome =
  | {
      readonly kind: 'attached';
      readonly rowIndex: number;
      readonly memberId: string;
      readonly fullName: string;
    }
  | {
      readonly kind: 'created_and_attached';
      readonly rowIndex: number;
      readonly memberId: string;
      readonly fullName: string;
    }
  | {
      readonly kind: 'already_member';
      readonly rowIndex: number;
      readonly memberId: string;
      readonly fullName: string;
    }
  | {
      readonly kind: 'not_found';
      readonly rowIndex: number;
      readonly identifier: string;
      readonly reason: string;
      readonly row: AttachRow;
    }
  | {
      readonly kind: 'failed';
      readonly rowIndex: number;
      readonly identifier: string;
      readonly message: string;
      readonly row: AttachRow;
    };

export interface AttachSummary {
  readonly total: number;
  readonly attached: number;
  readonly created: number;
  readonly alreadyMember: number;
  readonly notFound: number;
  readonly failed: number;
  readonly outcomes: readonly AttachOutcome[];
}

/** Minimal projection of `core.members` used by the resolver. */
export interface MemberRow {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly member_code: string;
}

/** Aggregated member-lookup maps built once per import run. */
export interface MemberLookup {
  readonly byCode: ReadonlyMap<string, MemberRow>;
  readonly byEmail: ReadonlyMap<string, MemberRow>;
  readonly byPhone: ReadonlyMap<string, MemberRow>;
}

/** Name-to-scope-id catalog for the create-new-member fallback path. */
export interface ScopeCatalog {
  readonly batchesByYear: ReadonlyMap<number, string>;
  readonly housesByName: ReadonlyMap<string, string>;
  readonly networksByName: ReadonlyMap<string, string>;
}
