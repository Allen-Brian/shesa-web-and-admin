export interface CreateBatchMemberInput {
  readonly batchScopeId: string;
  readonly batchSlug: string;
  readonly fullName: string;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly houseScopeId: string;
  readonly networkScopeId: string;
  readonly entryYear: number | null;
  readonly exitYear: number | null;
  readonly currentCountry: string | null;
  readonly currentRegionState: string | null;
  readonly currentCity: string | null;
}

export type CreateBatchMemberResult =
  { ok: true; memberId: string; inviteSent: boolean } | { ok: false; message: string };

export interface DeleteBatchMemberResult {
  readonly ok: boolean;
  readonly memberId: string;
  readonly message?: string;
}
