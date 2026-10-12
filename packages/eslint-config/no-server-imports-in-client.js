/**
 * shesa/no-server-imports-in-client — the firewall three modules claimed.
 *
 * `packages/config/src/env.server.ts`, `packages/supabase/src/index.ts` and
 * `packages/supabase/src/service-role.ts` each carried a comment saying a
 * `no-restricted-imports` rule banned them from client trees "added in E10".
 * No such rule was ever written. Three modules whose entire security model
 * is "never reaches the browser" were guarded by a sentence describing a
 * rule that did not exist.
 *
 * What crossing that line costs: `@shesa/config/env.server` holds the
 * service-role key, the database URL and the Resend key, all of which would
 * be readable in a browser bundle; `@shesa/supabase/service-role` opens a
 * client that bypasses RLS entirely.
 *
 * The rule fires on the thing that actually determines whether code reaches
 * a browser — the `'use client'` directive — rather than on a path pattern,
 * because in the App Router server and client files share a tree.
 *
 * Known limit: this catches direct imports only. A client component that
 * imports a local module which in turn imports `env.server` is not flagged
 * here; Next.js's own bundler is the backstop for that case.
 */

/** Module specifier -> what leaks if it reaches a browser bundle. */
const SERVER_ONLY = new Map([
  [
    '@shesa/config/env.server',
    'the server environment — service-role key, database URL, Resend key',
  ],
  ['@shesa/supabase/service-role', 'a Supabase client that bypasses row-level security'],
  ['@shesa/supabase/server', 'the cookie-bound server client, which reads request headers'],
  [
    '@shesa/supabase',
    'the package barrel, which re-exports the service-role client — import @shesa/supabase/browser instead',
  ],
]);

function hasUseClientDirective(node) {
  for (const statement of node.body) {
    if (statement.type !== 'ExpressionStatement') break;
    const { expression } = statement;
    if (expression?.type !== 'Literal' || typeof expression.value !== 'string') break;
    if (expression.value === 'use client') return true;
  }
  return false;
}

/** @type {import('eslint').Rule.RuleModule} */
const noServerImportsInClient = {
  meta: {
    type: 'problem',
    docs: {
      description: "Forbid server-only modules in files marked 'use client'.",
    },
    schema: [],
    messages: {
      forbidden:
        "'{{source}}' is server-only and this file is a client component, so importing it ships {{leaks}} to the browser.",
    },
  },
  create(context) {
    let isClient = false;
    return {
      Program(node) {
        isClient = hasUseClientDirective(node);
      },
      ImportDeclaration(node) {
        if (!isClient) return;
        const leaks = SERVER_ONLY.get(node.source.value);
        if (!leaks) return;
        context.report({
          node: node.source,
          messageId: 'forbidden',
          data: { source: node.source.value, leaks },
        });
      },
    };
  },
};

export default {
  rules: { 'no-server-imports-in-client': noServerImportsInClient },
};
