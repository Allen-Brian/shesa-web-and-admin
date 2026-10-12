import { redirect } from 'next/navigation';

// Root of the Memberships section — always land on the Members sub-page.
// The two top-level entries are /exco/memberships/{members,manage}.
export default function MembershipsRootPage() {
  redirect('/exco/memberships/members');
}
