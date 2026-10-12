import { describe, expect, it } from 'vitest';

import { deputyRank, officeKey, orderByOffice } from './leadership-order';

/** Terse fixtures — the position and the number an editor typed. */
const at = (position: string, sortOrder: number) => ({ position, sortOrder });
const names = (rows: readonly { position: string }[]) => rows.map((r) => r.position);

describe('officeKey', () => {
  it('reduces a deputy to the office it deputises for', () => {
    expect(officeKey('Vice President')).toBe(officeKey('President'));
    expect(officeKey('Assistant Secretary General')).toBe(officeKey('Secretary General'));
  });

  it('ignores scope words that name the holder rather than the office', () => {
    expect(officeKey('National President')).toBe(officeKey('President'));
    expect(officeKey('1st Vice President')).toBe(officeKey('President'));
  });

  it('keeps offices apart when the qualifier is part of the role', () => {
    // The trap this whole module has to avoid: "Financial Secretary" is a
    // different office from "Secretary", not a variant of it.
    expect(officeKey('Financial Secretary')).not.toBe(officeKey('Secretary General'));
    expect(officeKey('Treasurer')).not.toBe(officeKey('Auditor'));
  });

  it('does not collapse a title made only of qualifiers', () => {
    expect(officeKey('National')).not.toBe(officeKey('Vice'));
  });
});

describe('deputyRank', () => {
  it('marks the recognised deputy words', () => {
    for (const p of ['Vice President', 'Assistant Treasurer', 'Deputy Auditor', 'Acting Chair']) {
      expect(deputyRank(p)).toBe(1);
    }
  });

  it('leaves a principal alone', () => {
    for (const p of ['President', 'Secretary General', 'Financial Secretary']) {
      expect(deputyRank(p)).toBe(0);
    }
  });

  it('does not fire on a word that merely contains one', () => {
    // "Advocate" contains no deputy word, but a substring match would
    // have found "ag" in plenty of titles.
    expect(deputyRank('Legal Adviser')).toBe(0);
    expect(deputyRank('Agriculture Secretary')).toBe(0);
  });
});

describe('orderByOffice', () => {
  it('puts the principal before the deputy however they were numbered', () => {
    // The reported bug: the assistant was added first and got the lower
    // number, so it printed above the office it assists.
    const ordered = orderByOffice([
      at('Assistant Secretary General', 10),
      at('Secretary General', 20),
    ]);
    expect(names(ordered)).toEqual(['Secretary General', 'Assistant Secretary General']);
  });

  it('keeps an office and its deputies together', () => {
    const ordered = orderByOffice([
      at('Vice President', 15),
      at('Treasurer', 20),
      at('National President', 10),
    ]);
    expect(names(ordered)).toEqual(['National President', 'Vice President', 'Treasurer']);
  });

  it('places an office by its most senior holder, not by whoever is listed first', () => {
    // The vice is numbered above the treasurer; the presidency still
    // outranks it because the president does.
    const ordered = orderByOffice([
      at('Vice President', 30),
      at('Treasurer', 20),
      at('President', 10),
    ]);
    expect(names(ordered)).toEqual(['President', 'Vice President', 'Treasurer']);
  });

  it('respects the editor between distinct offices', () => {
    const ordered = orderByOffice([
      at('Auditor', 30),
      at('Treasurer', 10),
      at('Legal Adviser', 20),
    ]);
    expect(names(ordered)).toEqual(['Treasurer', 'Legal Adviser', 'Auditor']);
  });

  it('orders multiple deputies of one office among themselves', () => {
    const ordered = orderByOffice([
      at('2nd Vice President', 40),
      at('1st Vice President', 30),
      at('President', 10),
    ]);
    expect(names(ordered)).toEqual(['President', '1st Vice President', '2nd Vice President']);
  });

  it('does not mutate its input', () => {
    const input = [at('Vice President', 10), at('President', 20)];
    orderByOffice(input);
    expect(names(input)).toEqual(['Vice President', 'President']);
  });

  it('handles an empty group', () => {
    expect(orderByOffice([])).toEqual([]);
  });
});
