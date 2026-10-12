'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import { Button, toast } from '@shesa/ui';

import { CreateContributionDialog } from '@/app/(personas)/finance/contributions/widgets/create-contribution-dialog';
import { initialCreate } from '@/app/(personas)/finance/contributions/widgets/contributions-helpers';
import type {
  CreateForm,
  ScopeOption,
} from '@/app/(personas)/finance/contributions/widgets/contributions-types';
import { useContributionsActions } from '@/app/(personas)/finance/contributions/widgets/use-contributions-actions';

interface GroupNewContributionProps {
  readonly groupId: string;
  readonly defaultScopeId: string;
  readonly scopeOptions: readonly ScopeOption[];
}

/**
 * Small trigger button + dialog for adding a contribution to the
 * group's Contributions row. Reuses the mainstream contribution
 * dialog, but wires groupId into every create so the row shows up
 * inside this group without a follow-up step. Landing scope is the
 * mainstream one (groups are mainstream-only lenses); the parent
 * layout hands us the default.
 */
export function GroupNewContribution({
  groupId,
  defaultScopeId,
  scopeOptions,
}: GroupNewContributionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(() => initialCreate(defaultScopeId));

  const actions = useContributionsActions({ scopeOptions, groupId });

  const openDialog = () => {
    if (!defaultScopeId) {
      toast.error("You don't have a scope to create contributions at.");
      return;
    }
    setForm(initialCreate(defaultScopeId));
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 gap-1 px-2 text-xs text-primary hover:bg-primary/10"
        onClick={openDialog}
      >
        <Plus className="h-3.5 w-3.5" />
        Add contribution
      </Button>
      <CreateContributionDialog
        open={open}
        onOpenChange={setOpen}
        form={form}
        onFormChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        scopeOptions={scopeOptions}
        onSubmit={() =>
          actions.runCreate(form, () => {
            setOpen(false);
            router.refresh();
          })
        }
        pending={actions.pending}
      />
    </>
  );
}
