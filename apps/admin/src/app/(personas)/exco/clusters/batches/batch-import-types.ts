export interface ImportSummary {
  readonly batchId: string;
  readonly totalRows: number;
  readonly validRows: number;
  readonly invalidRows: number;
}

export interface InvalidImportRow {
  readonly id: string;
  readonly rowNumber: number;
  readonly fullName: string | null;
  readonly displayName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batchEntryYear: number | null;
  readonly house: string | null;
  readonly network: string | null;
  readonly errors: readonly string[];
}
