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

import { NetworkForm, type NetworkInitialValues } from './network-form';

interface NetworkFormDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly mode: 'create' | 'edit';
  readonly initial?: NetworkInitialValues;
}

/**
 * Popup wrapper around NetworkForm. Both create and edit now go through
 * a Dialog per the 2026-07-02 spec — the form is small enough that a
 * modal reads better than a full page.
 */
export function NetworkFormDialog({ open, onOpenChange, mode, initial }: NetworkFormDialogProps) {
  const router = useRouter();

  const handleSuccess = () => {
    onOpenChange(false);
    toast.success(mode === 'create' ? 'Network created.' : 'Changes saved.');
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Network' : `Edit ${initial?.name ?? 'network'}`}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new professional network. Members will be able to pick it as their profession and join its Connect forum.'
              : 'Rename, retag, or refresh this network’s presentation. Members keep their attachment.'}
          </DialogDescription>
        </DialogHeader>
        <NetworkForm
          mode={mode}
          initial={initial}
          onSuccess={handleSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
