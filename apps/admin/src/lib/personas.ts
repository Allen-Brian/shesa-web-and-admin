/**
 * Persona registry — the three flavors of the admin app per ADR-0040.
 *
 * The full grant-weighted resolver + eligibility check lands in
 * E2.pivot.E. For the shell scaffold here we just need names / URL
 * segments / sidebar subtitle strings.
 */

export type Persona = 'exco' | 'finance' | 'editor';

export const PERSONAS: readonly Persona[] = ['exco', 'finance', 'editor'] as const;

interface PersonaMeta {
  readonly slug: Persona;
  /** Sidebar subtitle. */
  readonly portalLabel: string;
  /** Header brand suffix ("Shesa {name}" — used in the profile menu / topbar). */
  readonly displayName: string;
}

export const PERSONA_META: Record<Persona, PersonaMeta> = {
  exco: { slug: 'exco', portalLabel: 'Admin Portal', displayName: 'Exco' },
  finance: { slug: 'finance', portalLabel: 'Finance Portal', displayName: 'Finance' },
  editor: { slug: 'editor', portalLabel: 'Editor Portal', displayName: 'Editor' },
};
