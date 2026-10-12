import type { AuditAction } from './audit-action';

/**
 * The payload an audit logger writes to `audit.audit_entries` via
 * `audit.log_event(...)`. Field names mirror the SQL columns
 * (camelCase here, snake_case there) — the concrete impl maps between
 * them.
 *
 * `entityId`, `scopeId`, `metadata`, `ipAddress`, `userAgent` are
 * optional because the SQL function accepts NULL defaults for each.
 * The actor (`auth.uid()`) is captured server-side from the JWT — never
 * passed by the caller.
 */
export interface AuditLogEvent {
  readonly action: AuditAction;
  readonly entitySchema: string;
  readonly entityTable: string;
  readonly entityId?: string;
  readonly scopeId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
}

/**
 * Contract for writing audit events. The concrete Supabase impl (wired
 * up by apps in E10) calls the `audit.log_event` Postgres function via
 * supabase-js RPC and returns the new audit entry's id.
 *
 * Lives in `@shesa/types` so `@shesa/domain/audit` and `@shesa/supabase`
 * (sibling packages per ADR-0010) can share the contract without
 * importing each other.
 *
 * Note: for role assignments, the database TRIGGER writes audit entries
 * automatically. Apps do NOT need to call this for role grants/revokes.
 * Use it for actions the database doesn't catch automatically:
 * auth.login, payment.recorded, member.transferred, etc.
 */
export interface AuditLogger {
  log(event: AuditLogEvent): Promise<string>;
}
