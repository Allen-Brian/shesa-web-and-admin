/**
 * The President General's address, verbatim.
 *
 * Single source for both the home-page excerpt and the full letter at
 * /presidents-address, so the two can never drift apart. Paragraphs are
 * an array rather than one blob because the letter styles the opening
 * paragraph differently (drop cap) and pulls one line out as a device.
 */

export const PRESIDENTS_ADDRESS = {
  title: 'A New Era of Unity, Leadership, Professional & Institutional Excellence',
  salutation: 'Dear SHESANs Across the Globe,',

  paragraphs: [
    'The time has come for SHESA to rise to the full measure of its potential. This is a defining moment to consolidate our Association into a strong, united, and professionally influential global institution, one that transforms our collective identity into collective opportunity, excellence, and impact.',
    'This is the moment for every SHESAN to move from belonging to building. Let us join hands to create a powerful professional network, a career oasis where every SHESAN can find mentorship, opportunities, collaboration, knowledge, and the support to thrive. Our strength must no longer be measured only by our numbers, but by the value we create for one another and the impact we make in the world.',
    'A new dawn demands a new level of leadership. Let us aspire not merely to be an alumni association, but to become a global benchmark for professional excellence, ethical leadership, unity, and service. The future of SHESA will be determined by what we do together today.',
    'To belong to SHESA is therefore to accept a responsibility to build and to give back. Sacred Heart College, Mankon (SAHECO) is the institution that nurtured us, shaped our character, and gave us the foundation upon which our journeys have been built. We owe it not only gratitude, but a legacy of service and transformation. Let us strengthen the institution that strengthened us.',
    'Our diversity must never become our division. Every branch, country, and batch must reflect the same spirit of unity and purpose. We must build systems that transcend personalities, structures that outlive generations, and a culture where every SHESAN is an active contributor, not a passive spectator.',
  ],

  /** Set apart in the letter as a declaration rather than a paragraph. */
  creed: {
    lead: 'Therefore, we stand for',
    line: 'One SHESA, One Logo, One Structure, One Dream.',
    tail: 'This is more than a slogan; it is a commitment to institutional unity, collective responsibility, and shared destiny.',
  },

  closingParagraphs: [
    'The opportunity is before us. The responsibility is ours. The time is now. Let us unite our talents, mobilize our resources, strengthen our bonds, and build a SHESA that will stand as a model of alumni excellence across the world.',
  ],

  refrain: 'One SHESA — One Vision — One Brotherhood — One Future.',

  valediction: 'Yours in humble and committed service,',
  signatory: {
    name: 'Barrister Akonteh Clifford Niba',
    title: 'President General',
    organisation: 'SHESA',
  },

  /**
   * Carried on the home page above "read the full address" — the
   * opening paragraph plus the call that follows it, lifted verbatim
   * so the summary is the address's own words.
   */
  excerpt:
    'The time has come for SHESA to rise to the full measure of its potential. This is a defining moment to consolidate our Association into a strong, united, and professionally influential global institution, one that transforms our collective identity into collective opportunity, excellence, and impact. This is the moment for every SHESAN to move from belonging to building. Let us join hands to create a powerful professional network, a career oasis where every SHESAN can find mentorship, opportunities, collaboration, knowledge, and the support to thrive.',
} as const;
