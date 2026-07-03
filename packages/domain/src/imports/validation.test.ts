import { describe, expect, it } from 'vitest';

import { validateImportRow, type SeedContext } from './validation';

const BATCH_2010 = 'aaaaaaaa-0000-0000-0000-000000002010';
const HOUSE_THOMAS = 'aaaaaaaa-0000-0000-0000-00000000ff01';
const NETWORK_OTHER = 'aaaaaaaa-0000-0000-0000-00000000ff02';

const seed: SeedContext = {
  batchesByYear: new Map([[2010, BATCH_2010]]),
  housesByName: new Map([['st thomas', HOUSE_THOMAS]]),
  networksByName: new Map([['other', NETWORK_OTHER]]),
};

describe('validateImportRow', () => {
  it('accepts a minimal well-formed row', () => {
    const result = validateImportRow(
      {
        full_name: 'Ada Lovelace',
        email: 'Ada@Shesa.Test',
        batch_entry_year: 2010,
        house: 'St Thomas',
        network: 'Other',
      },
      seed,
    );
    expect(result.status).toBe('valid');
    expect(result.errors).toEqual([]);
    expect(result.normalized.batch_scope_id).toBe(BATCH_2010);
    expect(result.normalized.house_scope_id).toBe(HOUSE_THOMAS);
    expect(result.normalized.network_scope_id).toBe(NETWORK_OTHER);
    // Email normalization: lowercased.
    expect(result.normalized.email).toBe('ada@shesa.test');
    // Exit year defaulted from entry_year (= batch_entry_year here) + 7.
    expect(result.normalized.exit_year).toBe(2017);
  });

  it('accepts phone-only rows (email OR phone required)', () => {
    const result = validateImportRow(
      {
        full_name: 'Grace Hopper',
        phone: '+237600000000',
        batch_entry_year: 2010,
        house: 'St Thomas',
        network: 'Other',
      },
      seed,
    );
    expect(result.status).toBe('valid');
    expect(result.normalized.email).toBeNull();
    expect(result.normalized.phone).toBe('+237600000000');
  });

  it('flags every missing required field', () => {
    const result = validateImportRow({}, seed);
    expect(result.status).toBe('invalid');
    expect(result.errors).toContain('full_name is required');
    expect(result.errors).toContain('email or phone is required');
    expect(result.errors).toContain('batch_entry_year is required');
    expect(result.errors).toContain('house is required');
    expect(result.errors).toContain('network is required');
  });

  it('flags a batch that does not resolve to a seeded row', () => {
    const result = validateImportRow(
      {
        full_name: 'Barbara Liskov',
        email: 'barbara@shesa.test',
        batch_entry_year: 9999,
        house: 'St Thomas',
        network: 'Other',
      },
      seed,
    );
    expect(result.status).toBe('invalid');
    expect(result.errors).toContain('batch_entry_year 9999 does not match a seeded batch');
  });

  it('resolves house and network case-insensitively', () => {
    const result = validateImportRow(
      {
        full_name: 'Case Insensitive',
        email: 'ci@shesa.test',
        batch_entry_year: 2010,
        house: '  st THOMAS  ',
        network: 'OTHER',
      },
      seed,
    );
    expect(result.status).toBe('valid');
    expect(result.normalized.house_scope_id).toBe(HOUSE_THOMAS);
    expect(result.normalized.network_scope_id).toBe(NETWORK_OTHER);
  });

  it('rejects exit_year < entry_year', () => {
    const result = validateImportRow(
      {
        full_name: 'Time Traveller',
        email: 'tt@shesa.test',
        batch_entry_year: 2010,
        entry_year: 2010,
        exit_year: 2005,
        house: 'St Thomas',
        network: 'Other',
      },
      seed,
    );
    expect(result.status).toBe('invalid');
    expect(result.errors).toContain('exit_year cannot precede entry_year');
  });

  it('uses batch_entry_year as entry_year default when entry_year is absent', () => {
    const result = validateImportRow(
      {
        full_name: 'Default Entry',
        email: 'de@shesa.test',
        batch_entry_year: 2010,
        house: 'St Thomas',
        network: 'Other',
      },
      seed,
    );
    expect(result.normalized.entry_year).toBe(2010);
    expect(result.normalized.exit_year).toBe(2017);
  });
});
