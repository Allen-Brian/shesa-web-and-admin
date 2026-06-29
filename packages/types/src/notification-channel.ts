/**
 * Channels a notification delivery can attempt.
 *
 * Phase 0 wires only `email` (Resend) and `sms` (stub log adapter — real
 * provider deferred to Phase 6 pending MTN/Orange OTP go/no-go in E9).
 * `in_app` and `push` are placeholders for later phases.
 */

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'in_app', 'push'] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

/**
 * Severity classes for triaging notifications (spec §12.1).
 *
 * - `critical`: payment confirmations, security alerts. Always sent.
 * - `important`: arrears reminders, governance changes. Respects quiet hours.
 * - `info`: digests, announcements. Batched, can be muted by user.
 */
export const NOTIFICATION_SEVERITIES = ['critical', 'important', 'info'] as const;

export type NotificationSeverity = (typeof NOTIFICATION_SEVERITIES)[number];
