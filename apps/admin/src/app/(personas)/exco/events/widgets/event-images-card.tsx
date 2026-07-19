'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@shesa/ui';

import { EventImagesPicker } from '@/components/image-picker/event-images-picker';

interface EventImagesCardProps {
  readonly initialUrls: readonly string[];
}

export function EventImagesCard({ initialUrls }: EventImagesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Banner &amp; Images</CardTitle>
        <p className="text-xs text-muted-foreground">
          The first image is the event&apos;s banner / hero cover; the rest are gallery slots on the
          detail page.
        </p>
      </CardHeader>
      <CardContent>
        <EventImagesPicker initialUrls={initialUrls} />
      </CardContent>
    </Card>
  );
}
