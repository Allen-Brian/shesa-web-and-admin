export type ClaimStatus = 'not_invited' | 'invited' | 'claimed' | 'disabled';

export interface InviteRow {
  readonly accountId: string;
  readonly memberId: string;
  readonly memberCode: string | null;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batchName: string | null;
  readonly batchSlug: string | null;
  readonly claimStatus: ClaimStatus;
  readonly invitedAt: string | null;
  readonly claimedAt: string | null;
  readonly lastSentAt: string | null;
  readonly resentCount: number;
  readonly inviteError: string | null;
  readonly createdAt: string;
}

export type SerialRow = InviteRow & { readonly serial: number };

export interface BatchOption {
  readonly slug: string;
  readonly name: string;
}
