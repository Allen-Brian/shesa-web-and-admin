'use client';

import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';

import { DataTable, EntityTablePanel, type GridApi } from '@shesa/ui';

import { ExportButton } from '@/components/export-button';
import { activeFilters } from '@/lib/export/filters';

import { buildExpensesExport } from './expenses-export';

import { buildExpenseColumns } from './expense-columns';
import { buildExpenseKpis } from './expenses-kpis';
import { ExpensesKpiStrip } from './expenses-kpi-strip';
import { ExpensesTableFilters } from './expenses-table-filters';
import { initialRecord } from './expenses-helpers';
import type {
  CategoryFilter,
  CategoryOption,
  ExpenseRow,
  GroupFilter,
  GroupOption,
  RecordForm,
  ScopeOption,
  SerialRow,
  StatusFilter,
} from './expenses-types';
import { RecordExpenseDialog } from './record-expense-dialog';
import { ReverseExpenseDialog } from './reverse-expense-dialog';
import { useExpensesActions } from './use-expenses-actions';

interface ExpensesViewProps {
  readonly expenses: readonly ExpenseRow[];
  readonly scopeOptions: readonly ScopeOption[];
  readonly categoryOptions: readonly CategoryOption[];
  readonly groupOptions: readonly GroupOption[];
}

/**
 * Expenses view — KPI strip + filter-aware DataTable + two dialogs
 * (record, reverse). Filter state and dialog forms live here;
 * mutation logic lives in `useExpensesActions`. `willBePending`
 * previews the threshold decision in the record dialog so operators
 * aren't surprised by pending_approval on submit.
 */
export function ExpensesView({
  expenses,
  scopeOptions,
  categoryOptions,
  groupOptions,
}: ExpensesViewProps) {
  const actions = useExpensesActions({ scopeOptions });
  const { pending } = actions;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordForm, setRecordForm] = useState<RecordForm>(() => initialRecord(scopeOptions));
  const [reversing, setReversing] = useState<ExpenseRow | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  const kpis = useMemo(() => buildExpenseKpis(expenses), [expenses]);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if (statusFilter !== 'all' && e.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && e.categoryKey !== categoryFilter) return false;
        if (groupFilter === 'none' && e.groupId) return false;
        if (groupFilter !== 'all' && groupFilter !== 'none' && e.groupId !== groupFilter)
          return false;
        if (!q) return true;
        if (e.payee.toLowerCase().includes(q)) return true;
        if (e.scopeName.toLowerCase().includes(q)) return true;
        if (e.categoryName?.toLowerCase().includes(q)) return true;
        if (e.description?.toLowerCase().includes(q)) return true;
        if (e.groupName?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((e, i) => ({ ...e, serial: i + 1 }));
  }, [expenses, search, statusFilter, categoryFilter, groupFilter]);

  const selectedScopeForRecord = scopeOptions.find((s) => s.id === recordForm.scopeId);
  const recordAmountNum = recordForm.amount ? parseFloat(recordForm.amount) : null;
  const willBePending =
    selectedScopeForRecord?.threshold != null &&
    recordAmountNum != null &&
    recordAmountNum >= selectedScopeForRecord.threshold;

  const columnDefs = useMemo(
    () =>
      buildExpenseColumns({
        pending,
        onApprove: actions.runApprove,
        onReverse: setReversing,
      }),
    [pending],
  );

  const closeReverse = () => {
    setReversing(null);
    setReverseReason('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Wallet className="h-6 w-6" />
          Expenses
        </h1>
        <p className="text-sm text-muted-foreground">
          Money out of a treasury. Below the body&apos;s threshold: hits the ledger immediately.
          Above: enters pending approval — the Admin approves to release.
        </p>
      </div>

      <ExpensesKpiStrip kpis={kpis} />

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'expense' : 'expenses'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={scopeOptions.length > 0}
        createLabel="Record expense"
        onCreate={() => {
          setRecordForm(initialRecord(scopeOptions));
          setRecordOpen(true);
        }}
        actions={
          <ExportButton
            spec={() =>
              buildExpensesExport(
                filtered,
                activeFilters({
                  Search: search.trim(),
                  Status: statusFilter === 'all' ? null : statusFilter.replaceAll('_', ' '),
                  Category: categoryOptions.find((c) => c.key === categoryFilter)?.name ?? null,
                  'Event group':
                    groupFilter === 'all'
                      ? null
                      : groupFilter === 'none'
                        ? 'Not in a group'
                        : (groupOptions.find((g) => g.id === groupFilter)?.name ?? null),
                }),
              )
            }
            disabled={filtered.length === 0}
          />
        }
        filters={
          <ExpensesTableFilters
            categoryOptions={categoryOptions}
            category={categoryFilter}
            onCategoryChange={setCategoryFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            groupOptions={groupOptions}
            group={groupFilter}
            onGroupChange={setGroupFilter}
          />
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />

      <RecordExpenseDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        form={recordForm}
        onFormChange={(patch) => setRecordForm((f) => ({ ...f, ...patch }))}
        scopeOptions={scopeOptions}
        categoryOptions={categoryOptions}
        willBePending={!!willBePending}
        onSubmit={() => actions.runRecord(recordForm, () => setRecordOpen(false))}
        pending={pending}
      />
      <ReverseExpenseDialog
        target={reversing}
        onClose={closeReverse}
        reason={reverseReason}
        onReasonChange={setReverseReason}
        onSubmit={() => {
          if (!reversing) return;
          actions.runReverse(reversing.id, reverseReason, closeReverse);
        }}
        pending={pending}
      />
    </div>
  );
}
