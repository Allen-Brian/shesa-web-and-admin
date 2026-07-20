export type AgmTicketStatus = 'issued' | 'paid' | 'cancelled';

export interface AgmTicketRow {
  readonly id: string;
  readonly code: string;
  readonly fullName: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly amountXaf: number;
  readonly paymentOption: string;
  readonly status: AgmTicketStatus;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
