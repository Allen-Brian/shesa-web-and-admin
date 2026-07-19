export interface AuditEntryRow {
  readonly id: string;
  readonly actor_label: string;
  readonly actor_email: string | null;
  readonly action: string;
  readonly entity_schema: string;
  readonly entity_table: string;
  readonly entity_id: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly ip_address: string | null;
  readonly user_agent: string | null;
  readonly created_at: string;
}

export type SerialRow = AuditEntryRow & { readonly serial: number };

export type CategoryFilter = 'all' | 'grant' | 'revoke' | 'change' | 'system' | 'event';

export type WindowFilter = 'all' | '24h' | '7d' | '30d';

export interface AuditScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly scope_type: 'mainstream' | 'branch' | 'chapter' | 'batch' | 'house' | 'network';
}
