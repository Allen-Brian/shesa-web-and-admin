'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

// ---------------------------------------------------------------------------
// ConfirmDialog — a pre-wired AlertDialog for confirmation prompts.
// ---------------------------------------------------------------------------

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// useConfirm — imperative promise-based wrapper for ConfirmDialog.
//
// Usage:
//   const { confirm, dialogProps } = useConfirm();
//   ...
//   const ok = await confirm('Delete "CS Department"?');
//   if (!ok) return;
//   ...
//   return <><ConfirmDialog {...dialogProps} />{/* rest of page */}</>;
// ---------------------------------------------------------------------------

export interface UseConfirmReturn {
  confirm: (title: string, description?: string) => Promise<boolean>;
  dialogProps: ConfirmDialogProps;
}

export function useConfirm(): UseConfirmReturn {
  const resolveRef = React.useRef<((ok: boolean) => void) | null>(null);

  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description?: string;
  }>({ open: false, title: '' });

  const confirm = React.useCallback(
    (title: string, description?: string): Promise<boolean> =>
      new Promise((resolve) => {
        resolveRef.current = resolve;
        setState({ open: true, title, description });
      }),
    [],
  );

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState({ open: false, title: '' });
  }, []);

  const handleCancel = React.useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState({ open: false, title: '' });
  }, []);

  return {
    confirm,
    dialogProps: {
      open: state.open,
      title: state.title,
      description: state.description,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
