'use client';

import { useEffect, useState } from 'react';

/**
 * Is the viewport a phone-sized one?
 *
 * The trailer used to sidestep this by asking portrait phones to turn
 * sideways. It no longer does, so the layouts that genuinely cared
 * about width — the bracket, the reel, the Ken Burns push on the
 * archive — have to answer the question themselves.
 *
 * Most of them answer it in CSS, with Tailwind's `md:`. This exists
 * for the one case CSS cannot reach: a framer-motion `animate` value,
 * which is a number in JavaScript rather than a class.
 *
 * It starts `false` and corrects itself on mount, so the server render
 * and the first client render agree. The only cost is that a phone
 * renders one frame at the desktop setting, which is a frame nobody
 * sees behind the opening fade.
 */
export function useIsNarrow(breakpointPx = 768): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [breakpointPx]);

  return narrow;
}
