import { describe, expect, it } from 'vitest';

import {
  findDuplicateSignals,
  isAnyDuplicateSignal,
  type ExistingMemberForDupeCheck,
} from './duplicate-detection';

const BATCH_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const BATCH_B = 'aaaaaaaa-0000-0000-0000-000000000002';

const existing: ExistingMemberForDupeCheck[] = [
  {
    id: 'm1',
    fullName: 'Ada Lovelace',
    email: 'ada@shesa.test',
    phone: '+237600000001',
    batchScopeId: BATCH_A,
  },
  {
    id: 'm2',
    fullName: 'Ada Lovelace',
    email: null,
    phone: null,
    batchScopeId: BATCH_B,
  },
  {
    id: 'm3',
    fullName: 'Grace Hopper',
    email: 'grace@shesa.test',
    phone: '+237600000002',
    batchScopeId: BATCH_A,
  },
];

describe('findDuplicateSignals', () => {
  it('flags a same-email match case-insensitively', () => {
    const signals = findDuplicateSignals(
      {
        fullName: 'New Person',
        email: 'ADA@SHESA.TEST',
        phone: null,
        batchScopeId: BATCH_B,
      },
      existing,
    );
    expect(signals.sameEmail).toEqual(['m1']);
    expect(signals.samePhone).toEqual([]);
    expect(signals.sameName).toEqual([]);
    expect(signals.sameNameAndBatch).toEqual([]);
    expect(isAnyDuplicateSignal(signals)).toBe(true);
  });

  it('flags a same-phone match exactly', () => {
    const signals = findDuplicateSignals(
      {
        fullName: 'Other Person',
        email: null,
        phone: '+237600000001',
        batchScopeId: BATCH_A,
      },
      existing,
    );
    expect(signals.samePhone).toEqual(['m1']);
    // Phone match doesn't imply name match.
    expect(signals.sameName).toEqual([]);
  });

  it('flags same-name (any batch) and same-name-and-batch separately', () => {
    const signals = findDuplicateSignals(
      {
        fullName: 'ada lovelace',
        email: null,
        phone: null,
        batchScopeId: BATCH_A,
      },
      existing,
    );
    expect(signals.sameName.sort()).toEqual(['m1', 'm2']);
    // Only m1 shares BATCH_A with the candidate.
    expect(signals.sameNameAndBatch).toEqual(['m1']);
  });

  it('returns no signals for a genuinely new person', () => {
    const signals = findDuplicateSignals(
      {
        fullName: 'Barbara Liskov',
        email: 'barbara@shesa.test',
        phone: '+237699999999',
        batchScopeId: BATCH_B,
      },
      existing,
    );
    expect(signals.sameEmail).toEqual([]);
    expect(signals.samePhone).toEqual([]);
    expect(signals.sameName).toEqual([]);
    expect(signals.sameNameAndBatch).toEqual([]);
    expect(isAnyDuplicateSignal(signals)).toBe(false);
  });

  it('treats null candidate email/phone as "no signal" (not a match against nulls)', () => {
    // m2 has null email and null phone; a candidate with null email
    // should NOT count that as a same-email match.
    const signals = findDuplicateSignals(
      {
        fullName: 'Unrelated Person',
        email: null,
        phone: null,
        batchScopeId: BATCH_B,
      },
      existing,
    );
    expect(signals.sameEmail).toEqual([]);
    expect(signals.samePhone).toEqual([]);
  });

  it('normalizes name whitespace during comparison', () => {
    const signals = findDuplicateSignals(
      {
        fullName: '  Ada   Lovelace  ',
        email: null,
        phone: null,
        batchScopeId: BATCH_A,
      },
      existing,
    );
    expect(signals.sameName.sort()).toEqual(['m1', 'm2']);
  });
});
