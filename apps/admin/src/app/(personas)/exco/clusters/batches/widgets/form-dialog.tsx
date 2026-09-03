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

import { BatchForm, type BatchInitialValues } from './batch-form';

interface BatchFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly initial?: BatchInitialValues;
}

export function BatchFormDialog({ open, onOpenChange, mode, initial }: BatchFormDialogProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onOpenChange(false);
    toast.success(mode === 'create' ? 'Batch created.' : 'Changes saved.');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Batch' : `Edit ${initial?.name ?? 'batch'}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new batch by entry year. Members will be able to pick it during onboarding and imports.'
              : 'Rename, adjust the ordinal position, or refresh this batch’s contact info. Members keep their attachment.'}
          </DialogDescription>
        </DialogHeader>
        <BatchForm
          mode={mode}
          initial={initial}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
