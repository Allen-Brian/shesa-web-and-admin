import { describe, expect, it } from 'vitest';

import { safeRedirect } from './safe-redirect';

const APEX = 'shesa.org';

describe('safeRedirect', () => {
  describe('accepts', () => {
    it('a plain relative path', () => {
      expect(safeRedirect('/dashboard', APEX)).toBe('/dashboard');
    });

    it('an absolute URL under the apex', () => {
      expect(safeRedirect('https://exco.shesa.org/x', APEX)).toBe('https://exco.shesa.org/x');
    });

    it('the apex bare (no subdomain)', () => {
      expect(safeRedirect('https://shesa.org/', APEX)).toBe('https://shesa.org/');
    });

    it('a deep-nested subdomain of the apex', () => {
      expect(safeRedirect('https://foo.bar.shesa.org/y', APEX)).toBe('https://foo.bar.shesa.org/y');
    });
  });

  describe('rejects (returns "/") for', () => {
    it('null / undefined / empty', () => {
      expect(safeRedirect(null, APEX)).toBe('/');
      expect(safeRedirect(undefined, APEX)).toBe('/');
      expect(safeRedirect('', APEX)).toBe('/');
    });

    it('a protocol-relative URL', () => {
      // //evil.com is the classic open-redirect payload.
      expect(safeRedirect('//evil.com/x', APEX)).toBe('/');
    });

    it('a backslash variant', () => {
      // Some browsers normalize \\evil.com → //evil.com.
      expect(safeRedirect('\\evil.com', APEX)).toBe('/');
    });

    it('an absolute URL to a foreign host', () => {
      expect(safeRedirect('https://evil.com/x', APEX)).toBe('/');
    });

    it('a host that only contains the apex as a suffix', () => {
      // `evilshesa.org` ends with `shesa.org` but is not `*.shesa.org`.
      expect(safeRedirect('https://evilshesa.org/x', APEX)).toBe('/');
    });

    it('a non-http scheme', () => {
      expect(safeRedirect('javascript:alert(1)', APEX)).toBe('/');
      expect(safeRedirect('data:text/html,x', APEX)).toBe('/');
    });

    it('an unparseable string', () => {
      expect(safeRedirect('not a url', APEX)).toBe('/');
    });
  });
});
