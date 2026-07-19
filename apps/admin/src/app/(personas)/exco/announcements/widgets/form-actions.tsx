'use client';

import { Button } from '@shesa/ui';

interface FormActionsProps {
  readonly isScheduling: boolean;
  readonly canSchedule: boolean;
  readonly onCancel: () => void;
}

export function FormActions({ isScheduling, canSchedule, onCancel }: FormActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" variant="outline" size="sm" name="intent" value="draft">
        Save as Draft
      </Button>
      {isScheduling ? (
        <Button type="submit" size="sm" name="intent" value="schedule" disabled={!canSchedule}>
          Schedule
        </Button>
      ) : (
        <Button type="submit" size="sm" name="intent" value="publish">
          Publish
        </Button>
      )}
    </div>
  );
}
