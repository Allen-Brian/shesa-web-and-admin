import { describe, expect, it } from 'vitest';

import { safeRedirect } from './safe-redirect';

const APEX = 'shesaconnect.com';

describe('safeRedirect', () => {
  describe('accepts', () => {
    it('a plain relative path', () => {
      expect(safeRedirect('/dashboard', APEX)).toBe('/dashboard');
    });

    it('an absolute URL under the apex', () => {
      expect(safeRedirect('https://admin.shesaconnect.com/exco', APEX)).toBe(
        'https://admin.shesaconnect.com/exco',
      );
    });

    it('the apex bare (no subdomain)', () => {
      expect(safeRedirect('https://shesaconnect.com/', APEX)).toBe('https://shesaconnect.com/');
    });

    it('a deep-nested subdomain of the apex', () => {
      expect(safeRedirect('https://foo.bar.shesaconnect.com/y', APEX)).toBe(
        'https://foo.bar.shesaconnect.com/y',
      );
    });

    it('a staging sibling hostname (shares apex)', () => {
      expect(safeRedirect('https://staging-admin.shesaconnect.com/exco', APEX)).toBe(
        'https://staging-admin.shesaconnect.com/exco',
      );
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
      // `evilshesaconnect.com` ends with `shesaconnect.com` but is not `*.shesaconnect.com`.
      expect(safeRedirect('https://evilshesaconnect.com/x', APEX)).toBe('/');
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
