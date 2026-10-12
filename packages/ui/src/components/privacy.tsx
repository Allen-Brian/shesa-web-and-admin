'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../lib/cn';

/**
 * Presentation mode: blur every personal detail on screen without
 * changing the data underneath.
 *
 * Finance tables are full of names, email addresses and phone numbers,
 * and they get shown to rooms — projected in a committee meeting,
 * screenshotted into a chat to ask a colleague about one row, demoed to
 * people who have no business knowing who paid what. Closing the laptop
 * is the only alternative, so this exists to make the sensitive columns
 * unreadable on demand and readable again a click later.
 *
 * It is a presentation aid and nothing more. The values are still in
 * the DOM, still in the export, still one devtools panel away — a blur
 * is not access control and must never be relied on as any. What it
 * does is stop a name being legible over someone's shoulder or in a
 * screenshot, which is the actual problem.
 *
 * The state lives in `sessionStorage`, so it survives moving between
 * pages during a presentation and is gone by the next session.
 */

interface PrivacyState {
  readonly hidden: boolean;
  readonly toggle: () => void;
}

/**
 * Null rather than a default object, so `usePrivacy` can tell "no
 * provider" from "provider, currently off" — surfaces outside the
 * provider render the toggle not at all rather than rendering a dead
 * one.
 */
const PrivacyContext = React.createContext<PrivacyState | null>(null);

const STORAGE_KEY = 'shesa:privacy-mode';

export function PrivacyProvider({ children }: { readonly children: React.ReactNode }) {
  const [hidden, setHidden] = React.useState(false);

  // Read after mount, never during render: the server has no
  // sessionStorage, and seeding state from it directly would hand the
  // client a different first paint than the server produced.
  React.useEffect(() => {
    try {
      if (window.sessionStorage.getItem(STORAGE_KEY) === '1') setHidden(true);
    } catch {
      // Private browsing or a blocked storage partition. Defaults to off.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try {
        window.sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // Not being able to remember it is not a reason to refuse it.
      }
      return next;
    });
  }, []);

  const value = React.useMemo(() => ({ hidden, toggle }), [hidden, toggle]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

/** `null` when there is no provider above — the common case elsewhere. */
export function usePrivacy(): PrivacyState | null {
  return React.useContext(PrivacyContext);
}

/**
 * Wraps anything that identifies a person — a name, an email, a phone
 * number, a set of initials.
 *
 * Outside a `PrivacyProvider` it renders its children untouched, so it
 * is safe to use in components shared with surfaces that have no
 * presentation mode.
 */
export function Private({
  children,
  className,
  /** `inline` for text inside a sentence; `block` to blur a whole cell. */
  as = 'inline',
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly as?: 'inline' | 'block';
}) {
  const privacy = usePrivacy();
  const hidden = privacy?.hidden ?? false;

  return (
    <span
      // `select-none` matters as much as the blur: without it the text
      // is still copyable, and a drag-select over a blurred column
      // hands the whole thing back in the clipboard.
      className={cn(
        as === 'block' ? 'block min-w-0' : 'inline-block max-w-full align-bottom',
        'transition-[filter] duration-200',
        hidden && 'pointer-events-none select-none blur-[5px]',
        className,
      )}
      // Deliberately not `aria-hidden`. The blur defends against a
      // camera and a shoulder, neither of which reads the
      // accessibility tree — hiding the name there would cost a
      // screen-reader user the ability to tell one row from another
      // and buy no privacy at all.
      data-private={hidden ? 'hidden' : undefined}
    >
      {children}
    </span>
  );
}

/**
 * The control. Renders nothing when there is no provider, so dropping
 * it into a shared toolbar costs nothing on surfaces that do not opt
 * in.
 */
export function PrivacyToggle({ className }: { readonly className?: string }) {
  const privacy = usePrivacy();
  if (!privacy) return null;

  const { hidden, toggle } = privacy;
  const label = hidden ? 'Show names and contact details' : 'Hide names and contact details';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={hidden}
      title={label}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
        hidden
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
        className,
      )}
    >
      {hidden ? (
        <EyeOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : (
        <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
      )}
      <span className="hidden sm:inline">{hidden ? 'Names hidden' : 'Hide names'}</span>
      <span className="sr-only">{label}</span>
    </button>
  );
}
