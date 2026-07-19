export interface AnalyticsData {
  readonly membershipGrowth: readonly { readonly month: string; readonly members: number }[];
  readonly registrationPie: readonly { readonly name: string; readonly value: number }[];
  readonly contributionsTimeline: readonly { readonly month: string; readonly raised: number }[];
  readonly chargesTimeline: readonly {
    readonly month: string;
    readonly expected: number;
    readonly paid: number;
  }[];
}

export interface GlobalStats {
  readonly kind: 'global';
  readonly branches: number;
  readonly chapters: number;
  readonly autonomousChapters: number;
  readonly totalMembers: number;
  readonly allMembers: number;
  readonly percentMembership: number;
  readonly upcomingEvents: number;
  readonly collectedByCurrency: readonly { readonly currency: string; readonly amount: number }[];
  readonly trends: {
    readonly totalMembers: number;
    readonly collected: number;
  };
}

export interface ScopedStats {
  readonly kind: 'scoped';
  readonly members: number;
  readonly percentCompletion: number;
  readonly upcomingEvents: number;
  readonly percentAcquisition: number | null;
  readonly newMembersThisMonth: number;
  readonly trends: {
    readonly members: number;
    readonly collected: number;
  };
}

export interface ContributionRow {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
  readonly raised: number;
  readonly goal: number | null;
  readonly currency: string;
  readonly closeDate: string | null;
  readonly scopeName: string;
}

export interface ContributionsBlock {
  readonly total: number;
  readonly currency: string;
  readonly rows: readonly ContributionRow[];
}

export interface EventItem {
  readonly id: string;
  readonly name: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly venue: string | null;
  readonly scopeName: string;
  readonly types: readonly string[];
}

export interface AnnouncementItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly publishedAt: string | null;
  readonly scopeName: string;
}

export interface TopMember {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly city: string | null;
  readonly country: string | null;
  readonly scopeSlug: string | null;
}

export interface CalendarEvent {
  readonly id: string;
  readonly name: string;
  readonly startAt: string;
  readonly types: readonly string[];
}

export interface ChargeCompletion {
  readonly id: string;
  readonly name: string;
  readonly scopeName: string;
  readonly expected: number;
  readonly paid: number;
  readonly percent: number;
  readonly currency: string;
}

export interface Transaction {
  readonly id: string;
  readonly payer: string;
  readonly what: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly isReversal: boolean;
  readonly createdAt: string;
}

export interface DashboardProps {
  readonly isGlobalAdmin: boolean;
  readonly scopeLabel: string;
  readonly userName: string;
  readonly stats: GlobalStats | ScopedStats;
  readonly contributions: ContributionsBlock;
  readonly upcomingEvents: readonly EventItem[];
  readonly announcements: readonly AnnouncementItem[];
  readonly topMembers: readonly TopMember[];
  readonly calendarEvents: readonly CalendarEvent[];
  readonly chargesCompletion: readonly ChargeCompletion[];
  readonly latestTransactions: readonly Transaction[];
  readonly analytics: AnalyticsData;
}
