'use client';

import type { LucideIcon } from 'lucide-react';

import { Button } from '@shesa/ui';

interface ProfileAdminActionButtonProps {
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
}

export function ProfileAdminActionButton({
  label,
  Icon,
  onClick,
  disabled,
  destructive,
}: ProfileAdminActionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={
        destructive ? 'justify-start text-destructive hover:text-destructive' : 'justify-start'
      }
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}
