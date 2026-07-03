import { redirect } from 'next/navigation';

// Root of the Memberships section — always land on the Members sub-page.
// The three sub-items live at /exco/memberships/{members,requests-transfers,registration}.
export default function MembershipsRootPage() {
  redirect('/exco/memberships/members');
}
