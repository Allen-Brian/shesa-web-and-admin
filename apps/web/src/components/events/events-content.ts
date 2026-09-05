/**
 * Public-site event shape. Sourced from `cms.site_events` +
 * `cms.site_event_categories` at read time by the server page. Web
 * components accept these as props, no static data lives here.
 */

export type ProgramItem = {
  /** ISO date (YYYY-MM-DD) when the event runs over several days. */
  readonly day?: string;
  readonly time: string;
  readonly title: string;
  readonly description?: string;
};

export type SiteEvent = {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  /** Derived display components, day of month, "Feb", "2026". */
  readonly day: string;
  readonly month: string;
  readonly year: string;
  /** ISO date string (yyyy-MM-dd), used by the countdown + related-event filter. */
  readonly fullDate: string;
  readonly location: string;
  readonly city: string;
  readonly image: string;
  readonly description: string;
  /** First joined category name, displayed as the primary tag. */
  readonly category: string;
  /** All joined category names. */
  readonly categories: readonly string[];
  readonly upcoming: boolean;
  readonly featured?: boolean;
  /** Slug of the gallery album that documents this event, if any. */
  readonly albumSlug?: string;
  /**
   * The finance charge this event collects into, or null when it is not
   * accepting contributions. Distinct from `ticketUrl`, which points at an
   * external checkout this system never sees.
   */
  readonly contributionChargeId: string | null;
  /** Optional flyer / poster images. */
  readonly flyers?: readonly string[];
  /** Optional programme, chronologically. */
  readonly program?: readonly ProgramItem[];
  /**
   * Optional extended-narrative paragraphs. Post-CMS shift these are
   * derived from `description_html` by splitting on `</p>`.
   */
  readonly extendedDescription?: readonly string[];
  /**
   * The editor's description exactly as Quill saved it. Rendered on the
   * detail page so headings, bold, links and lists survive; the plain
   * `description` above stays the card summary.
   */
  readonly descriptionHtml?: string;
  /** The separate short summary, when the editor wrote one. */
  readonly summary?: string;
  /** Ticketing, opt-in triple. */
  readonly ticketUrl?: string;
  readonly ticketPrice?: number;
  readonly ticketCurrency?: string;
};
