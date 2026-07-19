import { Mail, MapPin, Phone } from 'lucide-react';

import type { MemberProfile, MembershipHistoryRow } from './member-profile-types';
import { ProfileInfoRow } from './profile-info-row';
import { ProfileKeyValue } from './profile-key-value';
import { ProfileSection } from './profile-section';

interface MemberProfileLeftRailProps {
  readonly profile: MemberProfile;
  readonly currentAffiliation: MembershipHistoryRow | null;
}

/**
 * Left rail — three sections stacked: Contact, Personal, Membership.
 * All read-only. The composed `location` string joins the three
 * current_* address fields with `, ` and falls back to `—`.
 */
export function MemberProfileLeftRail({ profile, currentAffiliation }: MemberProfileLeftRailProps) {
  const location = [profile.current_city, profile.current_region_state, profile.current_country]
    .filter(Boolean)
    .join(', ');

  return (
    <aside className="flex flex-col gap-4">
      <ProfileSection title="Contact">
        <ProfileInfoRow Icon={Mail} value={profile.email ?? '—'} />
        <ProfileInfoRow Icon={Phone} value={profile.phone ?? '—'} />
        <ProfileInfoRow Icon={MapPin} value={location || '—'} />
      </ProfileSection>

      <ProfileSection title="Personal">
        <ProfileKeyValue k="Entry year" v={profile.entry_year?.toString() ?? '—'} />
        <ProfileKeyValue k="Exit year" v={profile.exit_year?.toString() ?? '—'} />
        <ProfileKeyValue k="Field" v={profile.field ?? '—'} />
        <ProfileKeyValue k="Status" v={profile.member_status} />
      </ProfileSection>

      <ProfileSection title="Membership">
        <ProfileKeyValue k="Batch" v={profile.batch_name ?? '—'} />
        <ProfileKeyValue k="House" v={profile.house_name ?? '—'} />
        <ProfileKeyValue k="Network" v={profile.network_name ?? '—'} />
        <ProfileKeyValue k="Currently at" v={currentAffiliation?.scope_name ?? '—'} />
      </ProfileSection>
    </aside>
  );
}
