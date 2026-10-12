import { ImageResponse } from 'next/og';

import { siteConfig } from '@/lib/site-config';

/**
 * The card every share of the site falls back to.
 *
 * Drawn here rather than committed as a PNG so the wording follows
 * `siteConfig` and never drifts from the site itself. 1200×630 is the
 * size Facebook, LinkedIn, WhatsApp, and X all read.
 */

export const runtime = 'edge';
export const alt = `${siteConfig.name}, ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(70% 60% at 50% 30%, #5c0f22 0%, #2a0710 55%, #0b0b0f 100%)',
        color: 'white',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 150,
          fontWeight: 800,
          letterSpacing: '-6px',
          lineHeight: 1,
        }}
      >
        {siteConfig.name}
      </div>

      <div
        style={{
          marginTop: 28,
          fontSize: 38,
          color: '#e8c9d2',
          letterSpacing: '2px',
        }}
      >
        {siteConfig.tagline}
      </div>

      <div
        style={{
          marginTop: 48,
          width: 120,
          height: 4,
          background: '#8b1533',
        }}
      />

      <div
        style={{
          marginTop: 44,
          fontSize: 26,
          color: 'rgba(255,255,255,0.65)',
          maxWidth: 820,
          textAlign: 'center',
          lineHeight: 1.4,
        }}
      >
        Sacred Heart College Mankon alumni — connected, celebrated, and building what comes next.
      </div>
    </div>,
    size,
  );
}
