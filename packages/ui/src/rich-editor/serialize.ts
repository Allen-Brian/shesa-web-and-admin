/**
 * Rich-content serialization.
 *
 * TipTap content persists as JSON (canonical) + HTML (render path).
 * The Edge Function (`create-announcement`, `update-announcement`)
 * accepts JSON, renders HTML server-side, and stores both. Reads
 * render the stored HTML through `<RichContent>` which sanitizes via
 * DOMPurify.
 *
 * Client helpers here are used by:
 *   - the editor's `onUpdate` to produce the outgoing JSON
 *   - preview screens that want to render a draft's JSON without
 *     round-tripping to the server
 */

import { generateHTML } from '@tiptap/html';
import type { JSONContent } from '@tiptap/react';
import DOMPurify from 'dompurify';

import { buildRichEditorExtensions } from './extensions';

export type RichJSON = JSONContent;

/**
 * Convert a TipTap JSON tree to HTML using the canonical extension
 * set. Runs client-side (renderer only — @tiptap/html is
 * environment-agnostic but this helper stays here for the render
 * preview path).
 */
export function richJsonToHtml(json: RichJSON): string {
  return generateHTML(json, buildRichEditorExtensions({ linkOpenOnClick: true }));
}

/**
 * Sanitize a stored HTML string before rendering it into the DOM.
 * DOMPurify is stock — no custom allow-list — because the HTML
 * originated from TipTap's own extension set, which is already
 * conservative. Server-side rendering ALSO passes through
 * `sanitize-html` in the Edge Function for defense-in-depth.
 */
export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
    ADD_TAGS: ['iframe'], // YouTube embed
    ALLOWED_URI_REGEXP: /^(https?:|mailto:|tel:|#)/i,
  });
}
