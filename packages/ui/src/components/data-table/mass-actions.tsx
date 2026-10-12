'use client';

import * as React from 'react';
import { Download, MoreHorizontal, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { cn } from '../../lib/cn';

export interface MassActionCustom<T> {
  label: string;
  icon?: React.ReactNode;
  onClick: (selected: T[]) => void;
  destructive?: boolean;
}

export interface MassActions<T> {
  /** Quick Delete button + dropdown entry. */
  onDelete?: (selected: T[]) => void;
  /** Quick Export button + dropdown entry. */
  onExport?: (selected: T[]) => void;
  /** Archive action — shows in the More dropdown. */
  onArchive?: (selected: T[]) => void;
  /** Extra dropdown actions appended after the built-ins. */
  custom?: MassActionCustom<T>[];
  /** Singular noun for the count text ("institution"). Defaults to "item". */
  itemName?: string;
  /** Plural — defaults to `${itemName}s`. */
  pluralItemName?: string;
}

interface MassActionsBarProps<T> {
  selected: T[];
  actions: MassActions<T>;
}

/**
 * Slide-up popup pinned to the bottom of the DataTable when one or more rows
 * are selected via the checkbox column. Renders the count, a More dropdown
 * (Archive / Export / any custom actions), and a dedicated Delete button.
 *
 * Render this inside a `relative`-positioned parent so the `absolute`
 * positioning resolves against the table wrapper, not the page.
 */
export function MassActionsBar<T>({ selected, actions }: MassActionsBarProps<T>) {
  const count = selected.length;
  const visible = count > 0;
  const itemName = actions.itemName ?? 'item';
  const plural = actions.pluralItemName ?? `${itemName}s`;
  const countLabel = count === 1 ? `1 ${itemName} selected` : `${count} ${plural} selected`;

  const dropdownItems: MassActionCustom<T>[] = React.useMemo(() => {
    const items: MassActionCustom<T>[] = [];
    if (actions.onArchive) {
      items.push({ label: 'Archive', icon: <Download />, onClick: actions.onArchive });
    }
    if (actions.onExport) {
      items.push({ label: 'Export', icon: <Download />, onClick: actions.onExport });
    }
    if (actions.custom) items.push(...actions.custom);
    return items;
  }, [actions]);

  // Slide-up reveal via a Tailwind transform on the wrapper; pointer-events
  // toggled so a hidden bar can't intercept clicks behind the table.
  return (
    <div
      aria-hidden={!visible}
      className={cn(
        'pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center transition-all duration-300 ease-out',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-5 opacity-0',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 shadow-lg backdrop-blur',
          visible && 'pointer-events-auto',
        )}
      >
        <span className="whitespace-nowrap text-md font-medium">{countLabel}</span>

        <span className="h-6 w-px bg-border" aria-hidden />

        {dropdownItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="More actions"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted"
              >
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-44">
              {dropdownItems.map((item, i) => (
                <React.Fragment key={item.label}>
                  {item.destructive && i > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    onSelect={() => item.onClick(selected)}
                    className={item.destructive ? 'text-danger text-danger' : undefined}
                  >
                    {item.icon}
                    {item.label}
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {actions.onDelete && (
          <button
            type="button"
            aria-label="Delete selection"
            onClick={() => actions.onDelete!(selected)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-danger transition-colors hover:bg-danger hover:text-danger text-danger hover:bg-danger/30"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
