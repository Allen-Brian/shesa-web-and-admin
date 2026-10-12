'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { toast } from '@shesa/ui';

import { createGroup, updateGroup } from '../finance-group-actions';
import { slugify } from './groups-helpers';
import type { CreateGroupForm, GroupStatus } from './groups-types';

/**
 * Consolidates every mutation for the Groups view — create + status
 * transitions + sidebar-toggle — behind one hook. Each action
 * validates client-side, awaits its server action, toasts, and
 * refreshes on success.
 */
export function useGroupsActions() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const runCreate = (form: CreateGroupForm, onDone: () => void) => {
    if (!form.name.trim()) return toast.error('Name is required.');
    const slug = (form.slug.trim() || slugify(form.name.trim())).toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug)) {
      return toast.error('Slug must be lowercase alphanumerics with hyphens.');
    }
    if (form.startsOn && form.endsOn && new Date(form.endsOn) < new Date(form.startsOn)) {
      return toast.error('End date must be on or after the start date.');
    }
    startTransition(async () => {
      const result = await createGroup({
        slug,
        name: form.name.trim(),
        description: form.description.trim() || null,
        startsOn: form.startsOn || null,
        endsOn: form.endsOn || null,
        showInSidebar: form.showInSidebar,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('Group created — default donation campaign seeded.');
      onDone();
      router.refresh();
    });
  };

  const runSetStatus = (id: string, status: GroupStatus) => {
    startTransition(async () => {
      const result = await updateGroup({ id, status });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Group ${status}.`);
      router.refresh();
    });
  };

  const runToggleSidebar = (id: string, next: boolean) => {
    startTransition(async () => {
      const result = await updateGroup({ id, showInSidebar: next });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(next ? 'Now visible in sidebar.' : 'Hidden from sidebar.');
      router.refresh();
    });
  };

  return { pending, runCreate, runSetStatus, runToggleSidebar };
}
