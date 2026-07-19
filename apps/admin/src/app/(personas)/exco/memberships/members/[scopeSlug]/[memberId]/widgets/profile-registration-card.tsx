import { ProfileRegistrationBadge } from './profile-registration-badge';
import type { MembershipHistoryRow } from './member-profile-types';

export function ProfileRegistrationCard({ row }: { readonly row: MembershipHistoryRow }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-sm font-medium text-foreground">{row.scope_name}</div>
        <ProfileRegistrationBadge state={row.registration_state} />
      </div>
      {row.registration_note && (
        <div className="text-xs italic text-muted-foreground">
          &ldquo;{row.registration_note}&rdquo;
        </div>
      )}
    </div>
  );
}
