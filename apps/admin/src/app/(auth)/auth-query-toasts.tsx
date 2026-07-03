'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@shesa/ui';

/**
 * Fire a toast for the `?error=X` / `?notice=X` flash-message conventions
 * used across the auth flows (login, forgot, reset, callback, logout),
 * then strip those params from the URL so the message doesn't fire again
 * on refresh.
 *
 * Rendered client-side from any auth page — page.tsx stays a Server
 * Component and just mounts this next to the form.
 */
interface AuthQueryToastsProps {
  readonly errorMessage?: string;
  readonly noticeMessage?: string;
}

export function AuthQueryToasts({ errorMessage, noticeMessage }: AuthQueryToastsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (!errorMessage && !noticeMessage) return;
    fired.current = true;

    if (errorMessage) toast.error(errorMessage);
    if (noticeMessage) toast.success(noticeMessage);

    // Strip only the flash params — keep everything else the caller had
    // (e.g. `?next=/exco` from the middleware redirect).
    const next = new URLSearchParams(searchParams.toString());
    next.delete('error');
    next.delete('notice');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [errorMessage, noticeMessage, pathname, router, searchParams]);

  return null;
}
