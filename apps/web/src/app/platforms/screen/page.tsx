import type { Metadata } from 'next';
import QRCode from 'qrcode';

import { VENUE_URL } from '@/components/platforms/platforms-content';
import { ReelPlayer } from '@/components/platforms/reel-player';

/**
 * The venue loop for the giant screens: no figures, large type, music
 * bed, runs until someone closes the tab. Open it on the machine driving
 * the screen, click "Start display" once, and leave it.
 *
 * The QR on the call-to-action card is rendered here, on the server, so
 * the client bundle does not carry the encoder.
 */
export const metadata: Metadata = {
  title: 'SHESA Digital',
  description: 'Six integrated platforms. One digital institution.',
  alternates: { canonical: '/platforms/screen' },
  robots: { index: false, follow: false },
};

export default async function PlatformsScreenPage() {
  const qrSvg = await QRCode.toString(VENUE_URL, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  });
  return <ReelPlayer mode="screen" qrSvg={qrSvg} />;
}
