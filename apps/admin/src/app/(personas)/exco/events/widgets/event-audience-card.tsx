'use client';

import type { AudienceDefinition } from '@shesa/domain/audience';
import { Card, CardContent, CardHeader, CardTitle } from '@shesa/ui';

import { AudienceSelector, type AudienceOptions } from '@/components/audience/audience-selector';

interface EventAudienceCardProps {
  readonly ownerScopeId: string;
  readonly options: AudienceOptions;
  readonly initialAudience?: AudienceDefinition;
}

export function EventAudienceCard({
  ownerScopeId,
  options,
  initialAudience,
}: EventAudienceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Audience</CardTitle>
      </CardHeader>
      <CardContent>
        <AudienceSelector
          ownerScopeId={ownerScopeId}
          options={options}
          initialAudience={initialAudience}
        />
      </CardContent>
    </Card>
  );
}
