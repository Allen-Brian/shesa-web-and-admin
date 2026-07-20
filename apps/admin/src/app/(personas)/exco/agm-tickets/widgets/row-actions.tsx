'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgeCheck, ExternalLink, MoreVertical, Undo2, XCircle } from 'lucide-react';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@shesa/ui';

import { setAgmTicketStatus } from '../actions/tickets';
import type { AgmTicketRow } from './types';

interface Props {
  readonly ticket: AgmTicketRow;
  readonly canReconcile: boolean;
}

/**
 * Per-row action menu. Finance can flip issued → paid; both personas
 * can cancel a ticket or open the public receipt in a new tab.
 */
export function AgmTicketRowActions({ ticket, canReconcile }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const flip = (status: AgmTicketRow['status'], successMsg: string) => {
    startTransition(async () => {
      const res = await setAgmTicketStatus(ticket.id, status);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={pending} aria-label="Actions">
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[200px]">
        <DropdownMenuItem asChild>
          <a
            href={`/agm-2026/receipt/${ticket.code}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open public receipt
          </a>
        </DropdownMenuItem>

        {canReconcile && ticket.status === 'issued' && (
          <DropdownMenuItem onClick={() => flip('paid', 'Ticket marked paid.')}>
            <BadgeCheck className="h-3.5 w-3.5" />
            Mark as paid
          </DropdownMenuItem>
        )}
        {canReconcile && ticket.status === 'paid' && (
          <DropdownMenuItem onClick={() => flip('issued', 'Reverted to issued.')}>
            <Undo2 className="h-3.5 w-3.5" />
            Revert to issued
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {ticket.status !== 'cancelled' ? (
          <DropdownMenuItem
            onClick={() => flip('cancelled', 'Ticket cancelled.')}
            className="text-destructive focus:text-destructive"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel ticket
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => flip('issued', 'Ticket reinstated.')}>
            <Undo2 className="h-3.5 w-3.5" />
            Reinstate ticket
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
