import type { Metadata } from 'next';

import {
  MessageScreen,
  ScreenPrimaryLink,
  ScreenSecondaryLink,
} from '@/components/ui/message-screen';

export const metadata: Metadata = {
  title: 'Page not found · SHESA',
  description: 'The page you were looking for is not here.',
};

export default function NotFound() {
  return (
    <MessageScreen
      code="404"
      eyebrow="Page not found"
      title={
        <>
          This one got away from <span className="italic text-primary">us.</span>
        </>
      }
      body="The page you asked for is not here — it may have been moved, renamed, or never existed. Everything else is where you left it."
    >
      <ScreenPrimaryLink href="/">Back to the home page</ScreenPrimaryLink>
      <ScreenSecondaryLink href="/contact">Tell us what broke</ScreenSecondaryLink>
    </MessageScreen>
  );
}
