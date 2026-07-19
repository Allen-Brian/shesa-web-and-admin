'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@shesa/ui';

import { AudienceSelector, type AudienceOptions } from '@/components/audience/audience-selector';

interface AudienceCardProps {
  readonly ownerScopeId: string;
  readonly options: AudienceOptions;
}

export function AudienceCard({ ownerScopeId, options }: AudienceCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Audience</CardTitle>
      </CardHeader>
      <CardContent>
        <AudienceSelector ownerScopeId={ownerScopeId} options={options} />
      </CardContent>
    </Card>
  );
}
