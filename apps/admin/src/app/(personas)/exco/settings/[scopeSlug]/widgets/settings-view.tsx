'use client';

import { useRouter } from 'next/navigation';
import { Building2, Cog, Landmark, Settings2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import {
  GovernancePanel,
  type GovernancePositionCatalogRow,
  type GovernancePositionHolderRow,
  type GovernanceRoleHolderRow,
} from '@/components/governance/governance-panel';
import type { GovernanceMemberPickerRow } from '@/components/governance/assign-position-dialog';
import {
  BranchForm,
  type BranchInitialValues,
} from '../../../clusters/branches/widgets/branch-form';
import {
  ChapterForm,
  type ChapterInitialValues,
} from '../../../clusters/branches/widgets/chapter-form';

export interface SettingsScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly scope_type: 'branch' | 'chapter';
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
  readonly currency_code: string | null;
}

interface SettingsViewProps {
  readonly scope: SettingsScope;
  readonly branchInitial: BranchInitialValues | null;
  readonly chapterInitial: ChapterInitialValues | null;
  readonly positionCatalog: readonly GovernancePositionCatalogRow[];
  readonly positionHolders: readonly GovernancePositionHolderRow[];
  readonly roleHolders: readonly GovernanceRoleHolderRow[];
  readonly memberPicker: readonly GovernanceMemberPickerRow[];
  readonly canUpdate: boolean;
  readonly canManageGovernance: boolean;
  /** Mainstream-admin-only — extending the position catalog. */
  readonly canCreatePositions: boolean;
  /**
   * True for global mainstream_admin viewers — the Edit tab is hidden
   * because editing branch/chapter metadata belongs to the branch admin
   * (or to the Clusters surface for the global admin). Settings narrows
   * to Governance in that case.
   */
  readonly hideEditTab?: boolean;
}

/**
 * Branch / Chapter Settings — the scope owner's own management surface.
 * Two-tab switcher:
 *   - Edit: reuses the same BranchForm / ChapterForm the global admin
 *     uses under Clusters. Same actions, same validation.
 *   - Governance: reuses GovernancePanel — the branch admin sets up
 *     their scope's own governance without needing global admin help.
 *
 * Global mainstream_admin can also reach this page for any branch-like
 * scope (has_permission walks the tree), which gives them a focused
 * edit + governance surface without the noisier cluster detail view.
 */
export function SettingsView(props: SettingsViewProps) {
  const router = useRouter();

  const isChapter = props.scope.scope_type === 'chapter';
  const showEdit = !props.hideEditTab;
  const defaultTab = showEdit ? 'edit' : 'governance';

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {isChapter ? <Landmark className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
          {isChapter ? 'Autonomous chapter · Settings' : 'Branch · Settings'}
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Cog className="h-6 w-6" />
          {props.scope.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          {showEdit
            ? 'Metadata + governance for this scope. Positions carry portal roles inline.'
            : 'Governance for this scope. Positions carry portal roles inline.'}
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="w-fit">
          {showEdit && (
            <TabsTrigger value="edit">
              <Settings2 className="h-4 w-4" />
              Edit
            </TabsTrigger>
          )}
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        {showEdit && (
          <TabsContent value="edit" className="flex min-h-0 flex-1 flex-col">
            {!props.canUpdate ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                You don&apos;t have <span className="">scope.update</span> at this scope.
                Governance-only access — pick the Governance tab.
              </div>
            ) : isChapter ? (
              props.chapterInitial ? (
                <ChapterForm
                  mode="edit"
                  initial={props.chapterInitial}
                  onSuccess={() => router.refresh()}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                  Chapter record not found. This shouldn&apos;t normally happen — reach out to the
                  mainstream admin.
                </div>
              )
            ) : props.branchInitial ? (
              <BranchForm
                mode="edit"
                initial={props.branchInitial}
                onSuccess={() => router.refresh()}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                Branch record not found. This shouldn&apos;t normally happen — reach out to the
                mainstream admin.
              </div>
            )}
          </TabsContent>
        )}

        <TabsContent value="governance" className="flex min-h-0 flex-1 flex-col">
          <GovernancePanel
            scopeId={props.scope.id}
            scopeLabel={props.scope.name}
            scopeType={isChapter ? 'chapter' : 'branch'}
            positionCatalog={props.positionCatalog}
            positionHolders={props.positionHolders}
            roleHolders={props.roleHolders}
            memberPicker={props.memberPicker}
            canManage={props.canManageGovernance}
            canCreatePositions={props.canCreatePositions}
            emptyCatalogHint={
              isChapter
                ? 'No position catalog exists for chapters yet.'
                : 'No position catalog exists for branches yet.'
            }
            emptyRolesHint="No roles granted at this scope yet."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
