export interface ChargeRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly scopeName: string;
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrenceInterval: number;
  readonly status: string;
  readonly activationDate: string | null;
}

export type SerialRow = ChargeRow & { readonly serial: number };
