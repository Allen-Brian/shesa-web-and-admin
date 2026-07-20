'use client';

/**
 * Quill rich-text editor — client-only React wrapper.
 *
 * Snow theme + a full toolbar (headings, formatting, lists, indent,
 * alignment, image, video, code block, link, clean). Text color and
 * text background pickers are deliberately excluded — announcements
 * render inside the members' portal on themed backgrounds where
 * per-run colors would clash.
 *
 * Emits value via a hidden input keyed by `name` so the enclosing
 * <form> submits the HTML string alongside the rest of the fields.
 * That keeps this drop-in with useActionState — no extra state
 * plumbing on the server side.
 *
 * SSR note: Quill touches `document` on init, so this must be
 * client-only. `'use client'` at the top ensures Next.js won't try to
 * render it on the server.
 *
 * The Snow theme's stylesheet is imported once globally in
 * `app/globals.css` (via `@import 'quill/dist/quill.snow.css'`) — NOT
 * here. Importing the CSS inside a client component works in some
 * setups but Webpack's resolver has bugs with sub-path CSS imports
 * from packages declared `"type": "module"` (Quill 2.x's package.json).
 * Routing through the CSS pipeline via globals.css is bulletproof.
 */

import { useEffect, useRef, useState } from 'react';

import { attachImageResizer } from './attach-image-resizer';

interface QuillEditorProps {
  /** Hidden input's `name` attribute — the form submits its value here. */
  readonly name: string;
  /** Initial HTML content (from a draft edit; empty on create). */
  readonly initialValue?: string;
  readonly placeholder?: string;
  readonly className?: string;
  /**
   * Minimum editor height in px. The body area grows with content but
   * never shorter than this. Default matches the "New Post" reference.
   */
  readonly minHeight?: number;
}

const TOOLBAR: ReadonlyArray<unknown> = [
  [
    { header: [1, 2, 3, 4, 5, 6, false] },
    { font: [] },
    { size: ['small', false, 'large', 'huge'] },
  ],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
  [{ align: [] }],
  ['link', 'image', 'video'],
  ['clean'],
];

export function QuillEditor({
  name,
  initialValue = '',
  placeholder = 'Write here…',
  className,
  minHeight = 300,
}: QuillEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<unknown>(null);
  const [html, setHtml] = useState<string>(initialValue);

  // Capture the mount-time init props in refs so the effect can run
  // exactly once — subsequent parent re-renders that change
  // initialValue / placeholder don't reset the user's in-progress edits.
  const initialValueRef = useRef(initialValue);
  const placeholderRef = useRef(placeholder);

  useEffect(() => {
    let mounted = true;
    let detachResizer: (() => void) | undefined;

    (async () => {
      const { default: Quill } = await import('quill');
      if (!mounted || !containerRef.current) return;

      // Persist inline width/height on <img> so the resize-handle
      // dimensions round-trip through Quill's HTML serialisation.
      const AttrModule = Quill.import('parchment') as {
        Attributor: new (name: string, keyName: string, opts?: unknown) => unknown;
        Scope: { INLINE: number };
      };
      const registerImgAttr = (attr: string) => {
        const attrib = new AttrModule.Attributor(attr, attr, {
          scope: AttrModule.Scope.INLINE,
        });
        try {
          Quill.register(attrib as never, true);
        } catch {
          // ignore double-register on hot reload
        }
      };
      registerImgAttr('width');
      registerImgAttr('height');
      registerImgAttr('style');

      const editor = new Quill(containerRef.current, {
        theme: 'snow',
        placeholder: placeholderRef.current,
        modules: {
          toolbar: TOOLBAR,
          clipboard: { matchVisual: false },
        },
        formats: [
          'header',
          'font',
          'size',
          'bold',
          'italic',
          'underline',
          'strike',
          'list',
          'indent',
          'align',
          'link',
          'image',
          'video',
          'blockquote',
        ],
      });

      if (initialValueRef.current) {
        editor.clipboard.dangerouslyPasteHTML(0, initialValueRef.current);
      }

      editor.on('text-change', () => {
        setHtml(editor.root.innerHTML);
      });

      // Image resize: click any <img> inside the editor and drag its
      // bottom-right handle. Detach returns from the resizer function
      // so we can clean it up on unmount.
      detachResizer = attachImageResizer(editor.root);

      quillRef.current = editor;
    })();

    return () => {
      mounted = false;
      if (detachResizer) detachResizer();
      // Quill has no explicit destroy; clearing the ref + letting React
      // remove the container is enough. Any Quill listeners live on
      // the DOM node that's about to be unmounted.
      quillRef.current = null;
    };
  }, []);

  return (
    <div className={`mb-12 ${className}`}>
      <div ref={containerRef} style={{ minHeight: `${minHeight}px` }} className="quill-container" />
      {/* Hidden input carries the HTML into FormData under `name` */}
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}
