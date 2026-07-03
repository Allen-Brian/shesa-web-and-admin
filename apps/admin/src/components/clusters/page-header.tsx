'use client';

import { useRouter } from 'next/navigation';
import { Download, RefreshCw, Upload } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

interface ClusterPageHeaderProps {
  readonly title: string;
  readonly subtitle: string;
  readonly onExport?: () => void;
  readonly onImport?: () => void;
}

export function ClusterPageHeader({ title, subtitle, onExport, onImport }: ClusterPageHeaderProps) {
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
    toast.success('Refreshed');
  };

  const handleExport = () => {
    if (onExport) return onExport();
    toast.info('Export coming soon');
  };

  const handleImport = () => {
    if (onImport) return onImport();
    toast.info('Import coming soon');
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
          className="px-3"
          aria-label="Refresh"
          onClick={handleRefresh}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Export
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleImport}>
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </div>
    </div>
  );
}
