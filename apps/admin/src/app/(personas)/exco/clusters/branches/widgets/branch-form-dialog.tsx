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

import { BranchForm, type BranchInitialValues } from './branch-form';

interface BranchFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly initial?: BranchInitialValues;
}

export function BranchFormDialog({ open, onOpenChange, mode, initial }: BranchFormDialogProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onOpenChange(false);
    toast.success(mode === 'create' ? 'Branch created.' : 'Changes saved.');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Branch' : `Edit ${initial?.name ?? 'branch'}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new branch — its own city, currency, and registration tracking.'
              : 'Update this branch’s identity, location, finance settings, and contact.'}
          </DialogDescription>
        </DialogHeader>
        <BranchForm
          mode={mode}
          initial={initial}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
