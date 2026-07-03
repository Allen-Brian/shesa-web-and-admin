/**
 * Excel import template — column catalog.
 *
 * The Exco UI's "Download template" button uses this catalog to build
 * a .xlsx client-side (SheetJS, ~2 KB round-trip). The `upload-member-import`
 * Edge Function uses the same catalog to identify required-vs-optional
 * columns during parse.
 *
 * Header names are the canonical column keys. They mirror the human
 * column names shown in the sheet — we're not aliasing "e-mail" to
 * "email" here. The validator normalizes column-header casing but
 * expects the exact underlying identifier.
 *
 * Phase 1 §7.1 owns the field set; changes to that spec propagate here.
 */

export type TemplateColumn = {
  key: string; // canonical column header written into the sheet
  required: boolean;
  description: string;
  example: string;
};

export const IMPORT_TEMPLATE_COLUMNS: readonly TemplateColumn[] = [
  {
    key: 'full_name',
    required: true,
    description: "The member's legal full name (admin-only correctable after creation).",
    example: 'Ada Lovelace',
  },
  {
    key: 'email',
    required: false, // email OR phone required (constraint on the sheet, not per-column)
    description: 'Primary email address. At least one of email or phone is required per row.',
    example: 'ada@example.com',
  },
  {
    key: 'phone',
    required: false,
    description: 'Primary phone number (any format; keep intake consistent for dedup).',
    example: '+237600000000',
  },
  {
    key: 'batch_entry_year',
    required: true,
    description: 'The intake year (e.g. 2010). Must match a seeded batch.',
    example: '2010',
  },
  {
    key: 'house',
    required: true,
    description: 'One of: St Thomas, St Peter, St Francis, St John.',
    example: 'St Thomas',
  },
  {
    key: 'network',
    required: true,
    description: 'Professional network name (e.g. Other, or any Mainstream-seeded network).',
    example: 'Other',
  },
  {
    key: 'field',
    required: false,
    description: 'Field of study / profession.',
    example: 'Computer Science',
  },
  {
    key: 'exit_year',
    required: false,
    description: 'Defaults to batch_entry_year + 7 if omitted.',
    example: '2017',
  },
  {
    key: 'current_country',
    required: false,
    description: "Member's current country of residence.",
    example: 'Cameroon',
  },
  {
    key: 'current_region_state',
    required: false,
    description: 'Region / state of residence.',
    example: 'Sud-Ouest',
  },
  {
    key: 'current_city',
    required: false,
    description: 'City of residence.',
    example: 'Buea',
  },
  {
    key: 'display_name',
    required: false,
    description: 'Presentation name (member can edit later).',
    example: 'Ada',
  },
];

export const IMPORT_TEMPLATE_HEADERS = IMPORT_TEMPLATE_COLUMNS.map((c) => c.key);
