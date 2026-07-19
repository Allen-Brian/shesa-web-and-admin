import { describe, expect, it } from 'vitest';

import { extractInvokeMessage } from './edge-invoke';

/**
 * Recreate the shapes supabase-js gives us at each failure mode without
 * pulling the real SDK in. FunctionsHttpError has a Response as
 * `context`; FunctionsFetchError has the underlying TypeError as
 * `context`. Node/undici puts DNS info on `cause`.
 */
function functionsHttpError(body: object): { name: string; message: string; context: Response } {
  return {
    name: 'FunctionsHttpError',
    message: 'Edge Function returned a non-2xx status code',
    context: new Response(JSON.stringify(body), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    }),
  };
}

function functionsFetchError(cause: Error): {
  name: string;
  message: string;
  context: Error;
} {
  const wrapper = new TypeError('fetch failed');
  (wrapper as unknown as { cause: Error }).cause = cause;
  return {
    name: 'FunctionsFetchError',
    message: 'Failed to send a request to the Edge Function',
    context: wrapper,
  };
}

describe('extractInvokeMessage', () => {
  describe('HTTP error (Edge Function returned non-2xx)', () => {
    it('reads { error: { message } } from the Response body', async () => {
      const err = functionsHttpError({ error: { message: 'Membership already active' } });
      expect(await extractInvokeMessage(err, 'fallback')).toBe('Membership already active');
    });

    it('falls back to { message } at the top level', async () => {
      const err = functionsHttpError({ message: 'Forbidden' });
      expect(await extractInvokeMessage(err, 'fallback')).toBe('Forbidden');
    });
  });

  describe('network failure — request never reached the function', () => {
    it('handles Node/undici ENOTFOUND with helpful message + hostname', async () => {
      const cause = Object.assign(new Error('getaddrinfo ENOTFOUND host.docker.internal'), {
        code: 'ENOTFOUND',
        hostname: 'host.docker.internal',
      });
      const err = functionsFetchError(cause);
      const msg = await extractInvokeMessage(err, 'fallback');
      expect(msg).toContain('host.docker.internal');
      expect(msg.toLowerCase()).toContain('did not resolve');
      expect(msg).toContain('Supabase');
    });

    it('handles undici "name resolution failed" text (no code)', async () => {
      const cause = new Error('name resolution failed');
      const err = functionsFetchError(cause);
      const msg = await extractInvokeMessage(err, 'fallback');
      expect(msg.toLowerCase()).toContain('did not resolve');
      expect(msg).not.toContain('name resolution failed');
    });

    it('handles macOS getaddrinfo phrasing', async () => {
      const cause = new Error('nodename nor servname provided, or not known');
      const err = functionsFetchError(cause);
      const msg = await extractInvokeMessage(err, 'fallback');
      expect(msg.toLowerCase()).toContain('did not resolve');
    });

    it('handles ECONNREFUSED with a "running locally" hint', async () => {
      const cause = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:54321'), {
        code: 'ECONNREFUSED',
      });
      const err = functionsFetchError(cause);
      const msg = await extractInvokeMessage(err, 'fallback');
      expect(msg).toContain('refused');
      expect(msg).toContain('Supabase');
    });

    it('handles ETIMEDOUT', async () => {
      const cause = Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' });
      const err = functionsFetchError(cause);
      expect(await extractInvokeMessage(err, 'fallback')).toContain('timed out');
    });

    it('classifies FunctionsFetchError even without a recognisable cause', async () => {
      const err = {
        name: 'FunctionsFetchError',
        message: 'Failed to send a request to the Edge Function',
      };
      const msg = await extractInvokeMessage(err, 'fallback');
      expect(msg.toLowerCase()).toContain('unreachable');
    });
  });

  describe('unknown error shape', () => {
    it('returns error.message when nothing else fits', async () => {
      const err = new Error('Custom domain error');
      expect(await extractInvokeMessage(err, 'fallback')).toBe('Custom domain error');
    });

    it('returns the caller fallback when there is no message', async () => {
      expect(await extractInvokeMessage({}, 'Could not approve.')).toBe('Could not approve.');
    });

    it('does NOT misclassify a plain business error as network failure', async () => {
      const err = { name: 'FunctionsError', message: 'MEMBERSHIP_NOT_PENDING: cannot approve' };
      expect(await extractInvokeMessage(err, 'fallback')).toBe(
        'MEMBERSHIP_NOT_PENDING: cannot approve',
      );
    });
  });
});
