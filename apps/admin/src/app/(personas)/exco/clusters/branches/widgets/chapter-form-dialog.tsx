'use client';

import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  toast,
} from '@shesa/ui';

import { ChapterForm, type ChapterInitialValues } from './chapter-form';

interface ChapterFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly initial: ChapterInitialValues;
}

export function ChapterFormDialog({ open, onOpenChange, mode, initial }: ChapterFormDialogProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onOpenChange(false);
    toast.success(mode === 'create' ? 'Chapter created.' : 'Changes saved.');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? `New chapter of ${initial.parentBranchName}`
              : `Edit ${initial.name ?? 'chapter'}`}
          </DialogTitle>
          <DialogDescription>
            Autonomous chapters carry their own body; grouping chapters are tags on branch members.
          </DialogDescription>
        </DialogHeader>
        <ChapterForm
          mode={mode}
          initial={initial}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
