/**
 * Shesa's domain error hierarchy.
 *
 * The top-level error boundary in apps + Edge Functions maps these to
 * the standardized error envelope (ADR-0009):
 *
 *   { status, code, message, traceId, fields? }
 *
 * Throw a `DomainError` (or subclass) from services/policy/repositories;
 * never throw a raw HTTP error or a Supabase error directly.
 */

import type { AuditAction } from '@shesa/types';

export interface DomainErrorOptions {
  readonly cause?: unknown;
  readonly fields?: Readonly<Record<string, string>>;
  readonly traceId?: string;
}

/**
 * Base class for every error the domain emits. Carries the stable `code`
 * and HTTP-equivalent `status` the error-envelope mapper needs.
 */
export class DomainError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields?: Readonly<Record<string, string>>;
  readonly traceId?: string;

  constructor(code: string, status: number, message: string, options?: DomainErrorOptions) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    if (options?.fields) this.fields = options.fields;
    if (options?.traceId) this.traceId = options.traceId;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, options?: DomainErrorOptions) {
    super('VALIDATION_FAILED', 422, message, options);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Not authenticated', options?: DomainErrorOptions) {
    super('UNAUTHORIZED', 401, message, options);
  }
}

export class ForbiddenError extends DomainError {
  constructor(
    /** The permission key or audit-action the caller lacked. */
    deniedFor: string,
    /** Optional resource context, e.g. `{ scopeId: '...' }`. */
    context?: Readonly<Record<string, string>>,
    options?: DomainErrorOptions,
  ) {
    super('FORBIDDEN', 403, `Forbidden: ${deniedFor}`, {
      ...options,
      fields: { deniedFor, ...(context ?? {}) },
    });
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, options?: DomainErrorOptions) {
    super(`${entity.toUpperCase()}_NOT_FOUND`, 404, `${entity} not found`, options);
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string, options?: DomainErrorOptions) {
    super(code, 409, message, options);
  }
}

/**
 * Re-export for callers that want to type-narrow an audited denial:
 *   throw new ForbiddenError(action, { scopeId }); // action: AuditAction
 */
export type DenialAction = AuditAction;
