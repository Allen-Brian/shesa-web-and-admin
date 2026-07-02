'use client';

import * as React from 'react';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';

import { cn } from '../lib/cn';
import { buildRichEditorExtensions } from './extensions';

export interface RichEditorProps {
  /** Initial content as TipTap JSON. Uncontrolled after mount. */
  initialContent?: JSONContent;
  /** Fired on every change with the latest JSON tree. */
  onChange?: (json: JSONContent) => void;
  /** Optional placeholder for the empty state. */
  placeholder?: string;
  /** Read-only editor (useful for review states). */
  editable?: boolean;
  className?: string;
}

/**
 * Rich content editor for announcements. Ships the StarterKit +
 * tables + images + links + YouTube extension set. Toolbar is
 * intentionally not bundled — consumers (Epic 2.8's announcement
 * form) compose a toolbar per the wireframe.
 *
 * Content contract: emits JSON via `onChange`. The consuming form
 * sends JSON to `create-announcement` / `update-announcement`; the
 * Edge Function renders + stores the HTML snapshot server-side.
 */
export function RichEditor({
  initialContent,
  onChange,
  placeholder,
  editable = true,
  className,
}: RichEditorProps) {
  const editor = useEditor({
    extensions: buildRichEditorExtensions({ linkOpenOnClick: false }),
    content: initialContent,
    editable,
    onUpdate: ({ editor: ed }) => onChange?.(ed.getJSON()),
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm max-w-none focus:outline-none min-h-[240px] px-3 py-2',
          'shesa-rich-editor',
        ),
        'data-placeholder': placeholder ?? '',
      },
    },
  });

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background',
        !editable && 'bg-muted/40',
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
