/**
 * TipTap extension set for the Shesa rich editor.
 *
 * Extensions per Phase 2 §9.2 target set: text formatting (StarterKit),
 * tables (with rows/cells/header), inline images, hyperlinks, embedded
 * YouTube videos. Attachments land later as a custom node.
 *
 * Exported as a factory so callers can pass config (e.g. link
 * `openOnClick: false` in the editor, `true` in the renderer).
 */

import { StarterKit } from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Youtube } from '@tiptap/extension-youtube';

export interface ExtensionsOptions {
  /** Whether links open on click (renderer=true, editor=false). */
  linkOpenOnClick?: boolean;
}

export function buildRichEditorExtensions(opts: ExtensionsOptions = {}) {
  return [
    StarterKit.configure({
      // The starter kit's history is enabled by default — leave it on.
      // Table extension replaces the starter kit's blockquote-only
      // structure with proper tables below.
    }),
    Table.configure({ resizable: true, HTMLAttributes: { class: 'shesa-rich-table' } }),
    TableRow,
    TableCell,
    TableHeader,
    Image.configure({ HTMLAttributes: { class: 'shesa-rich-image' } }),
    Link.configure({
      openOnClick: opts.linkOpenOnClick ?? false,
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Youtube.configure({
      controls: true,
      nocookie: true,
      HTMLAttributes: { class: 'shesa-rich-youtube' },
    }),
  ];
}
