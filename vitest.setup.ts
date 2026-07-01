/**
 * Vitest setup — runs once before every test file that opts in via
 * `setupFiles`. Loads jest-dom's custom matchers (toBeInTheDocument,
 * toHaveTextContent, etc.) so component tests read naturally.
 *
 * jsdom is opted into per-file via `// @vitest-environment jsdom`
 * rather than globally, so node-environment tests (pure logic) don't
 * pay the jsdom startup cost.
 */

import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

import '@testing-library/jest-dom/vitest';

// Unmount everything rendered by RTL between tests. Otherwise
// `render()` accumulates copies of the same component into a shared
// `document.body`, and `getByRole` starts throwing "found multiple
// elements". RTL auto-cleans under jest globals but not under vitest
// unless we wire it explicitly (`globals: true` would also work but
// pollutes the module scope).
afterEach(() => {
  cleanup();
});
