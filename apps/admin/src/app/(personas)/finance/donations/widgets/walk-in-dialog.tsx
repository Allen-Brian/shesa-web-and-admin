'use client';

import { HandHeart } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shesa/ui';

import type { PaymentMethod } from '../donation-actions';
import type { CampaignRow, WalkInForm } from './donations-types';
import { PAYMENT_METHODS } from './donations-types';

interface WalkInDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly form: WalkInForm;
  readonly onFormChange: (patch: Partial<WalkInForm>) => void;
  readonly activeCampaigns: readonly CampaignRow[];
  readonly onSubmit: () => void;
  readonly pending: boolean;
}

/**
 * "Record a walk-in donation" dialog. For gifts that reached Finance
 * directly (cash at an event, MoMo screenshot forwarded to the
 * treasurer, etc.) — everything that didn't come through the public
 * website's donate flow. Donor name lands on the receipt and reports;
 * blank = anonymous.
 */
export function WalkInDialog({
  open,
  onOpenChange,
  form,
  onFormChange,
  activeCampaigns,
  onSubmit,
  pending,
}: WalkInDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record a walk-in donation</DialogTitle>
          <DialogDescription>
            For gifts that came directly to Finance (not through the website). Donor name lands on
            the receipt and reports; leave blank for anonymous.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-campaign">Campaign</Label>
            <Select value={form.campaignId} onValueChange={(v) => onFormChange({ campaignId: v })}>
              <SelectTrigger id="wi-campaign">
                <SelectValue placeholder="Pick a campaign" />
              </SelectTrigger>
              <SelectContent>
                {activeCampaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {c.scopeName} · {c.currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wi-amount">Amount</Label>
              <Input
                id="wi-amount"
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => onFormChange({ amount: e.target.value })}
                placeholder="5000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wi-method">Method</Label>
              <Select
                value={form.method}
                onValueChange={(v) => onFormChange({ method: v as PaymentMethod })}
              >
                <SelectTrigger id="wi-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-donor">Donor name (optional)</Label>
            <Input
              id="wi-donor"
              value={form.donorName}
              onChange={(e) => onFormChange({ donorName: e.target.value })}
              placeholder="Leave blank for anonymous"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-email">Donor email (optional)</Label>
            <Input
              id="wi-email"
              type="email"
              value={form.donorEmail}
              onChange={(e) => onFormChange({ donorEmail: e.target.value })}
              placeholder="For a receipt email"
              maxLength={320}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="wi-memo">Memo (optional)</Label>
            <Input
              id="wi-memo"
              value={form.memo}
              onChange={(e) => onFormChange({ memo: e.target.value })}
              placeholder="Note for the receipt / audit"
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} loading={pending} disabled={pending}>
            <HandHeart className="h-4 w-4" />
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
