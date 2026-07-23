'use client';

import { useMemo, useState } from 'react';
import { Building2, Check, ChevronsUpDown, GraduationCap, Search, X } from 'lucide-react';

import { Badge, Button, Popover, PopoverContent, PopoverTrigger, ScrollArea } from '@shesa/ui';

import type { TargetScopeOption } from './charges-types';

interface ChargeTargetPickerProps {
  readonly targetScopeOptions: readonly TargetScopeOption[];
  readonly selectedIds: readonly string[];
  readonly onToggle: (id: string, next: boolean) => void;
  readonly onClearAll: () => void;
}

/**
 * Multi-select popover that lists every Branch + Batch the caller
 * can see. Filter box narrows by name; a small chip strip beside the
 * trigger shows how many of each kind are picked so the operator can
 * eyeball their selection without re-opening the popover.
 */
export function ChargeTargetPicker({
  targetScopeOptions,
  selectedIds,
  onToggle,
  onClearAll,
}: ChargeTargetPickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const branchCount = useMemo(
    () =>
      targetScopeOptions.filter((t) => t.scopeType === 'branch' && selectedSet.has(t.id)).length,
    [targetScopeOptions, selectedSet],
  );
  const batchCount = useMemo(
    () => targetScopeOptions.filter((t) => t.scopeType === 'batch' && selectedSet.has(t.id)).length,
    [targetScopeOptions, selectedSet],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return targetScopeOptions;
    return targetScopeOptions.filter((t) => t.name.toLowerCase().includes(needle));
  }, [targetScopeOptions, q]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {branchCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Building2 className="h-3 w-3" /> {branchCount} branch{branchCount === 1 ? '' : 'es'}
            </Badge>
          )}
          {batchCount > 0 && (
            <Badge variant="secondary" className="gap-1">
              <GraduationCap className="h-3 w-3" /> {batchCount} batch
              {batchCount === 1 ? '' : 'es'}
            </Badge>
          )}
          {branchCount === 0 && batchCount === 0 && (
            <span className="text-xs text-muted-foreground">No targets picked yet.</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {(branchCount > 0 || batchCount > 0) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={onClearAll}
            >
              <X className="h-3 w-3" /> Clear
            </Button>
          )}
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                <ChevronsUpDown className="h-3 w-3" />
                Pick targets
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center gap-2 border-b px-3 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Filter branches + batches"
                  className="h-7 flex-1 border-0 bg-transparent p-0 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                />
              </div>
              <ScrollArea className="max-h-72">
                <ul className="py-1">
                  {filtered.map((t) => {
                    const picked = selectedSet.has(t.id);
                    const Icon = t.scopeType === 'branch' ? Building2 : GraduationCap;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => onToggle(t.id, !picked)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-muted/60"
                        >
                          <span
                            className={
                              'flex h-4 w-4 items-center justify-center rounded border ' +
                              (picked
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/40')
                            }
                          >
                            {picked && <Check className="h-3 w-3" aria-hidden />}
                          </span>
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                          <span className="flex-1 truncate">{t.name}</span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {t.scopeType}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="px-3 py-4 text-center text-xs text-muted-foreground">
                      No matches.
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
