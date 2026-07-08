'use client';

import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

interface ClusterPageHeaderProps {
  readonly title: string;
  readonly subtitle: string;
}

export function ClusterPageHeader({ title, subtitle }: ClusterPageHeaderProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
    toast.success('Refreshed');
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Refresh"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
